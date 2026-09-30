import React, { useState } from 'react';
import { X, Plus, Minus, ShoppingBag, Clock, ShieldCheck, ArrowRight, MapPin, CheckCircle2, ChevronRight, Bike } from 'lucide-react';
import { CartItem, DeliveryLocation } from '../types';
import { calculateDeliveryCharge, MAX_DELIVERY_DISTANCE_KM, DELIVERY_UNAVAILABLE_MESSAGE } from '../config/deliveryConfig';
import { useLanguage } from '../i18n';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onClearCart: () => void;
  location: DeliveryLocation | null;
  onChangeLocation: () => void;
  onCheckout: (paymentMethod: 'cod' | 'upi' | 'card') => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onClearCart,
  location,
  onChangeLocation,
  onCheckout,
}) => {
  const { t } = useLanguage();
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'upi' | 'card'>('upi');

  if (!isOpen) return null;

  const actualItemsCost = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const itemsTotal = cartItems.reduce(
    (acc, item) => acc + (item.product.mrp || item.product.price) * item.quantity,
    0
  );
  const discount = Math.max(0, itemsTotal - actualItemsCost);
  const totalSavings = discount;

  // Distance calculation: use actual available delivery-distance data from existing delivery/service-area system
  // without hardcoding 5 km or inventing/guessing distances.
  const distanceKm = typeof location?.distanceKm === 'number' ? location.distanceKm : undefined;

  // Service-ready delivery charge calculation:
  // If actual distance is available, calculate exact slab charge (returns null if above 5 km).
  // If distance data is not determined for the manual address, maintain standard local delivery (0).
  const deliveryCharge = location
    ? typeof distanceKm === 'number'
      ? calculateDeliveryCharge(distanceKm)
      : 0
    : null;

  // Serviceable check:
  // If distance is known and > 5 km, delivery is not available.
  // If location has isServiceable explicitly false, delivery is not available.
  const isDeliverable = location
    ? (typeof distanceKm === 'number' ? deliveryCharge !== null : location.isServiceable !== false)
    : false;

  const grandTotal = actualItemsCost + (deliveryCharge ?? 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#f8faf9] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-250">
        {/* Header */}
        <div className="bg-white px-4 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-gray-900">{t('cart.yourBasket')}</h2>
              <div className="text-[11px] font-semibold flex items-center gap-1">
                {!location ? (
                  <span className="text-amber-700 font-bold">{t('cart.pleaseSelectLocation')}</span>
                ) : !isDeliverable ? (
                  <span className="text-red-600 font-bold">{t('cart.deliveryUnavailableDesc')}</span>
                ) : location.isTenMinEligible ? (
                  <span className="text-emerald-700 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#ea580c]" /> {t('cart.tenMinDeliveryTo', { area: location.area.split(',')[0] })}
                  </span>
                ) : (
                  <span className="text-emerald-700 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-600" /> {t('cart.standardDeliveryTo', { area: location.area.split(',')[0] })}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            id="close-cart-btn"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 mb-4">
                <ShoppingBag className="w-10 h-10 stroke-[1.5]" />
              </div>
              <h3 className="text-base font-bold text-gray-900">{t('cart.emptyTitle')}</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-xs">
                {t('cart.emptySubtitle')}
              </p>
              <button
                onClick={onClose}
                className="mt-5 px-6 py-2.5 rounded-full bg-[#064e3b] text-white text-xs font-extrabold shadow-sm active:scale-95 transition-all"
              >
                {t('cart.startShopping')}
              </button>
            </div>
          ) : (
            <>
              {/* Savings Announcement */}
              {totalSavings > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🎉</span>
                    <span className="text-xs font-bold text-emerald-900">
                      {t('cart.savingNotice', { amount: totalSavings })}
                    </span>
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <span className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">
                    {t('cart.itemsCount', { count: cartItems.reduce((sum, item) => sum + item.quantity, 0) })}
                  </span>
                  <button
                    onClick={onClearCart}
                    className="text-[11px] font-bold text-gray-400 hover:text-red-600 transition-colors"
                  >
                    {t('cart.clearAll')}
                  </button>
                </div>

                {cartItems.map((item) => (
                  <div key={item.product.id} className="flex items-center justify-between gap-3 py-1">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 object-cover rounded-xl border border-gray-100 shrink-0"
                      />
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-gray-900">
                          {item.product.name}
                        </h4>
                        <p className="text-[11px] text-gray-500 font-medium">
                          {item.product.quantity}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs font-extrabold text-gray-900">
                            ₹{item.product.price * item.quantity}
                          </span>
                          {item.product.mrp > item.product.price && (
                            <span className="text-[10px] text-gray-400 line-through">
                              ₹{item.product.mrp * item.quantity}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stepper */}
                    <div className="flex items-center bg-[#064e3b] text-white rounded-xl px-1.5 py-1">
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, -1)}
                        className="w-5 h-5 flex items-center justify-center hover:bg-emerald-800 rounded active:scale-90 transition-all"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3 h-3 stroke-[3]" />
                      </button>
                      <span className="text-xs font-extrabold px-2">{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, 1)}
                        className="w-5 h-5 flex items-center justify-center hover:bg-emerald-800 rounded active:scale-90 transition-all"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3 h-3 stroke-[3]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Delivery Address Card */}
              <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-2xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {t('cart.deliveryAddress')}
                  </span>
                  <button
                    onClick={onChangeLocation}
                    className="text-xs font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>{location ? t('cart.changeAddress') : t('cart.addAddress')}</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                {location ? (
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4 fill-emerald-600 text-emerald-600" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      {location.fullName && (
                        <div className="text-xs font-black text-gray-900 flex items-center gap-2">
                          <span>{location.fullName}</span>
                          {location.mobile && (
                            <span className="text-[10px] text-gray-500 font-bold bg-gray-100 px-1.5 py-0.5 rounded">
                              {location.mobile}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="text-xs text-gray-700 font-medium leading-tight">
                        {location.houseNo ? `${location.houseNo}, ` : ''}
                        {location.street ? `${location.street}, ` : ''}
                        {location.village || location.city || ''}
                      </div>
                      <div className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                        <Bike className="w-3 h-3" /> {t('common.doorstepDelivery')}
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={onChangeLocation}
                    className="w-full py-2.5 px-3 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-900 flex items-center justify-center gap-2 text-xs font-extrabold transition-colors cursor-pointer"
                  >
                    <MapPin className="w-4 h-4 text-emerald-700" />
                    <span>{t('cart.enterDeliveryAddress')}</span>
                  </button>
                )}
              </div>

              {/* Payment Method Selector */}
              <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-2xs">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                  {t('cart.paymentMethod')}
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPaymentMethod('upi')}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      paymentMethod === 'upi'
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 font-extrabold shadow-2xs ring-1 ring-emerald-600'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 font-medium'
                    }`}
                  >
                    <div className="text-xs">{t('payment.upi')}</div>
                    <div className="text-[10px] text-gray-500">{t('payment.upiSub')}</div>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('cod')}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      paymentMethod === 'cod'
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 font-extrabold shadow-2xs ring-1 ring-emerald-600'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 font-medium'
                    }`}
                  >
                    <div className="text-xs">{t('payment.cod')}</div>
                    <div className="text-[10px] text-gray-500">{t('payment.codSub')}</div>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      paymentMethod === 'card'
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 font-extrabold shadow-2xs ring-1 ring-emerald-600'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 font-medium'
                    }`}
                  >
                    <div className="text-xs">{t('payment.card')}</div>
                    <div className="text-[10px] text-gray-500">{t('payment.cardSub')}</div>
                  </button>
                </div>
              </div>

              {/* Bill Details */}
              <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-2xs space-y-2 text-xs">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block pb-1 border-b border-gray-50">
                  {t('cart.billSummary')}
                </span>
                <div className="flex justify-between text-gray-600">
                  <span>{t('cart.itemsTotal')}</span>
                  <span className="font-semibold text-gray-900">₹{itemsTotal}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>{t('cart.deliveryCharge')}</span>
                  <span
                    className={`font-semibold ${
                      !location
                        ? 'text-gray-400'
                        : isDeliverable && deliveryCharge !== null
                        ? 'text-gray-900'
                        : 'text-red-600'
                    }`}
                  >
                    {!location
                      ? '—'
                      : deliveryCharge !== null
                      ? `₹${deliveryCharge}`
                      : t('cart.deliveryUnavailableTitle')}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>{t('cart.discount')}</span>
                  <span className="font-semibold">-₹{discount}</span>
                </div>
                <div className="pt-2 border-t border-gray-100 flex justify-between items-baseline">
                  <div>
                    <span className="font-extrabold text-sm text-gray-900">{t('cart.grandTotal')}</span>
                    <span className="block text-[10px] text-gray-400">{t('cart.taxesInclusive')}</span>
                  </div>
                  <span className="text-lg font-black text-emerald-950">₹{grandTotal}</span>
                </div>

                {location && !isDeliverable && (
                  <div className="pt-2 border-t border-red-100 text-red-600 font-bold text-xs text-center">
                    {t('cart.deliveryUnavailableDesc')}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Place Order Button */}
        {cartItems.length > 0 && (
          <div className="p-4 bg-white border-t border-gray-100 shadow-lg space-y-2">
            {!location ? (
              <div className="space-y-2">
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-tight">
                  <span className="font-bold block text-amber-900">{t('cart.locationRequiredTitle')}</span>
                  {t('cart.locationRequiredDesc')}
                </div>
                <button
                  id="cart-change-location-btn"
                  onClick={onChangeLocation}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <MapPin className="w-4 h-4" />
                  <span>{t('cart.chooseLocationBtn')}</span>
                </button>
              </div>
            ) : !isDeliverable ? (
              <div className="space-y-2">
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 leading-tight font-medium text-center">
                  <span className="font-bold block text-red-800 mb-0.5">{t('cart.deliveryUnavailableTitle')}</span>
                  {t('cart.deliveryUnavailableDesc')}
                </div>
                <button
                  disabled
                  className="w-full py-3 px-4 rounded-xl bg-gray-200 text-gray-500 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-not-allowed text-center"
                >
                  <span>{t('cart.deliveryUnavailableDesc')}</span>
                </button>
                <button
                  onClick={onChangeLocation}
                  className="w-full py-1 text-xs font-bold text-emerald-700 hover:underline text-center cursor-pointer"
                >
                  {t('cart.changeLocationBtn')}
                </button>
              </div>
            ) : (
              <button
                id="place-order-btn"
                onClick={() => onCheckout(paymentMethod)}
                className="w-full py-3 px-4 rounded-xl bg-[#064e3b] hover:bg-[#043c2d] active:scale-[0.98] text-white font-extrabold text-sm flex items-center justify-between shadow-md shadow-emerald-900/20 transition-all cursor-pointer"
              >
                <div className="text-left">
                  <span className="text-xs text-emerald-200 block font-normal leading-none">
                    {cartItems.reduce((sum, item) => sum + item.quantity, 0)} {t('common.items')} • {paymentMethod.toUpperCase()}
                  </span>
                  <span className="text-base font-black">₹{grandTotal}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-800/80 px-3 py-1.5 rounded-lg">
                  <span>{t('cart.placeOrder')}</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
