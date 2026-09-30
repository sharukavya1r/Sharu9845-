import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Minus,
  ShieldCheck,
  Clock,
  Truck,
  Sparkles,
  Bell,
  BellRing,
  TrendingDown,
  Check,
  RotateCcw,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { Product } from '../types';
import {
  getPriceAlert,
  setPriceAlert,
  removePriceAlert,
  checkPriceDrop,
  simulatePriceDrop,
  resetSimulatedPriceDrop,
  PriceAlert,
  PriceDropCheckResult,
} from '../services/priceAlertService';
import { vibrateFeedback, vibrateSuccess } from '../utils/haptics';
import { useLanguage } from '../i18n';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  quantityInCart: number;
  onAddToCart: (product: Product) => void;
  onRemoveFromCart: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  quantityInCart,
  onAddToCart,
  onRemoveFromCart,
}) => {
  const { t } = useLanguage();
  const [alert, setAlert] = useState<PriceAlert | null>(null);
  const [checkResult, setCheckResult] = useState<PriceDropCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showSimulateOptions, setShowSimulateOptions] = useState<boolean>(false);

  // Initialize and check local storage whenever the selected product changes
  useEffect(() => {
    if (product) {
      const storedAlert = getPriceAlert(product.id);
      setAlert(storedAlert);
      if (storedAlert) {
        const result = checkPriceDrop(product.id, product.price);
        setCheckResult(result);
      } else {
        setCheckResult(null);
      }
      setToastMessage(null);
      setShowSimulateOptions(false);
    }
  }, [product]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3500);
  };

  if (!product) return null;

  // Check if a price reduction has occurred
  const hasPriceDropped = checkResult?.hasDropped;
  const currentEffectivePrice = checkResult?.hasDropped
    ? checkResult.effectivePrice
    : product.price;

  const handleToggleAlert = () => {
    vibrateFeedback();
    if (alert) {
      removePriceAlert(product.id);
      setAlert(null);
      setCheckResult(null);
      setShowSimulateOptions(false);
      showToast(`Price drop alert removed for ${product.name}.`);
    } else {
      const newAlert = setPriceAlert(product.id, product.name, product.price);
      setAlert(newAlert);
      const result = checkPriceDrop(product.id, product.price);
      setCheckResult(result);
      vibrateSuccess();
      showToast(`Alert set! We'll notify you if ${product.name} drops below ₹${product.price}.`);
    }
  };

  const handleManualCheck = () => {
    if (!product || !alert) return;
    setIsChecking(true);
    vibrateFeedback();
    setTimeout(() => {
      const result = checkPriceDrop(product.id, product.price);
      setCheckResult(result);
      setIsChecking(false);
      if (result?.hasDropped) {
        vibrateSuccess();
        showToast(`🎉 Price Drop Detected! Price is now ₹${result.effectivePrice}.`);
      } else {
        showToast(`Checked local storage: No price drop yet (Current: ₹${product.price}).`);
      }
    }, 450);
  };

  const handleSimulateDrop = (dropAmount: number = 15) => {
    if (!product) return;
    vibrateSuccess();
    // Ensure alert exists first so simulation can compare against original price
    if (!alert) {
      setPriceAlert(product.id, product.name, product.price);
    }
    const updatedAlert = simulatePriceDrop(product.id, dropAmount);
    setAlert(updatedAlert);
    const result = checkPriceDrop(product.id, product.price);
    setCheckResult(result);
    showToast(`Simulation active: Price reduced by ₹${result?.savings || dropAmount}!`);
  };

  const handleResetSimulation = () => {
    if (!product) return;
    vibrateFeedback();
    const updated = resetSimulatedPriceDrop(product.id);
    setAlert(updated);
    const result = checkPriceDrop(product.id, product.price);
    setCheckResult(result);
    showToast(`Simulation reset: Price restored to standard catalog ₹${product.price}.`);
  };

  const handleAddDiscountedProduct = () => {
    if (checkResult?.hasDropped) {
      onAddToCart({
        ...product,
        price: checkResult.effectivePrice,
        mrp: product.price,
      });
    } else {
      onAddToCart(product);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Top Image Box */}
        <div className="relative aspect-square bg-gray-50 flex items-center justify-center p-6 border-b border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-white/80 hover:bg-white text-gray-700 shadow-xs z-10 cursor-pointer"
            aria-label="Close details"
          >
            <X className="w-5 h-5" />
          </button>

          <img
            src={product.image}
            alt={product.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain"
          />

          {/* Discount tag (or active simulated price drop tag) */}
          {hasPriceDropped ? (
            <span className="absolute top-3 left-3 bg-gradient-to-r from-rose-600 to-amber-600 text-white text-[11px] font-black px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1 animate-pulse">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>PRICE DROPPED: ₹{checkResult.savings} OFF</span>
            </span>
          ) : product.discountPercent > 0 ? (
            <span className="absolute top-3 left-3 bg-[#ea580c] text-white text-[11px] font-black px-2 py-0.5 rounded-lg shadow-xs">
              {product.discountPercent}% OFF
            </span>
          ) : null}

          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] font-bold text-emerald-800 border border-emerald-100 flex items-center gap-1 shadow-2xs">
            <Clock className="w-3 h-3 text-[#ea580c]" /> 10 Min Delivery in Lakkavalli
          </div>
        </div>

        {/* Scrollable Content Container */}
        <div className="p-4 space-y-3 overflow-y-auto">
          {/* In-Modal Notification Toast */}
          {toastMessage && (
            <div className="bg-emerald-800 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-md flex items-center justify-between gap-2 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>{toastMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div>
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
              {product.category}
            </span>
            <h3 className="text-lg font-extrabold text-gray-900 leading-tight">
              {product.name}
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Net Quantity: {product.quantity}
            </p>
          </div>

          {/* Pricing */}
          <div className="flex items-baseline gap-2 pt-1 border-t border-gray-100">
            <span className={`text-xl font-black ${hasPriceDropped ? 'text-emerald-700' : 'text-gray-900'}`}>
              ₹{currentEffectivePrice}
            </span>
            {hasPriceDropped ? (
              <span className="text-xs text-gray-400 line-through">
                Original ₹{checkResult.originalPrice}
              </span>
            ) : product.mrp > product.price ? (
              <span className="text-xs text-gray-400 line-through">MRP ₹{product.mrp}</span>
            ) : null}

            {hasPriceDropped ? (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-0.5">
                <TrendingDown className="w-3 h-3" />
                Drop Alert: Save ₹{checkResult.savings}
              </span>
            ) : product.discountPercent > 0 ? (
              <span className="text-xs font-bold text-[#ea580c]">
                Save ₹{product.mrp - product.price}
              </span>
            ) : null}
          </div>

          {/* =========================================================================
              PRICE DROP ALERT & LOCAL STORAGE NOTIFICATION SECTION
              ========================================================================= */}
          <div className="bg-gradient-to-b from-amber-50/60 to-orange-50/30 rounded-2xl p-3 border border-amber-200/70 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${alert ? 'bg-amber-500 text-white shadow-xs' : 'bg-amber-100 text-amber-800'}`}>
                  {alert ? <BellRing className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                </div>
                <div>
                  <h4 className="text-xs font-black text-gray-900 leading-tight">
                    {t('productDetail.priceDropAlert')}
                  </h4>
                  <span className="text-[10px] text-gray-500 font-medium">
                    {alert ? t('productDetail.alertActive') : t('productDetail.setPriceAlert')}
                  </span>
                </div>
              </div>

              {alert && (
                <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                  <span>Tracking ₹{alert.originalPrice}</span>
                </span>
              )}
            </div>

            {/* If Price Drop has occurred, show prominent alert banner */}
            {hasPriceDropped && (
              <div className="bg-white rounded-xl p-2.5 border border-emerald-200 shadow-2xs space-y-1.5 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-black text-xs">
                    <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />
                    <span>Price Drop Detected!</span>
                  </div>
                  <span className="text-[10px] font-black text-white bg-emerald-700 px-2 py-0.5 rounded-full">
                    {checkResult.percentageDrop}% REDUCTION
                  </span>
                </div>
                <p className="text-[11px] text-gray-700 leading-tight">
                  Price dropped from <span className="font-bold line-through text-gray-400">₹{checkResult.originalPrice}</span> to{' '}
                  <span className="font-extrabold text-emerald-700">₹{checkResult.effectivePrice}</span>. You save{' '}
                  <span className="font-bold text-emerald-800">₹{checkResult.savings}</span> right now!
                </p>
                {checkResult.isSimulated && (
                  <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-[10px] text-amber-800">
                    <span className="italic flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-600" />
                      Simulated local state price drop
                    </span>
                    <button
                      type="button"
                      onClick={handleResetSimulation}
                      className="font-bold underline hover:text-amber-950 cursor-pointer"
                    >
                      Reset to ₹{product.price}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Primary Action Button: 'Notify Me on Price Drop' */}
            <div className="flex items-center gap-2">
              <button
                id={`price-drop-btn-${product.id}`}
                type="button"
                onClick={handleToggleAlert}
                className={`flex-1 py-2 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-98 ${
                  alert
                    ? 'bg-amber-100/80 hover:bg-amber-200/80 text-amber-950 border border-amber-300/80'
                    : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white'
                }`}
              >
                {alert ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[2.5] text-amber-800" />
                    <span>{t('productDetail.alertActive')}</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-3.5 h-3.5 fill-white/20" />
                    <span>{t('productDetail.setPriceAlert')}</span>
                  </>
                )}
              </button>

              {/* Check Local Storage Button (when alert is set) */}
              {alert && (
                <button
                  type="button"
                  onClick={handleManualCheck}
                  disabled={isChecking}
                  title="Check local storage for price reduction"
                  className="px-2.5 py-2 rounded-xl bg-white hover:bg-gray-50 border border-amber-200 text-gray-700 font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-amber-600' : ''}`} />
                  <span className="hidden sm:inline">Check</span>
                </button>
              )}
            </div>

            {/* Testing / Simulation Section to verify local state storage check */}
            <div className="pt-1 border-t border-amber-200/50 flex items-center justify-between text-[10px]">
              <span className="text-gray-500">Test local storage price alert:</span>
              <button
                type="button"
                onClick={() => setShowSimulateOptions(!showSimulateOptions)}
                className="font-extrabold text-amber-800 hover:text-amber-950 underline flex items-center gap-0.5 cursor-pointer"
              >
                <Zap className="w-3 h-3 text-amber-600 fill-amber-500" />
                <span>{showSimulateOptions ? 'Hide Simulation' : 'Simulate Price Drop'}</span>
              </button>
            </div>

            {/* Simulation Options Panel */}
            {showSimulateOptions && (
              <div className="bg-white rounded-xl p-2.5 border border-amber-200 space-y-2 animate-in fade-in duration-150">
                <span className="text-[10px] font-bold text-gray-700 block">
                  Simulate reduction to trigger storage alert:
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSimulateDrop(Math.max(5, Math.round(product.price * 0.1)))}
                    className="py-1 px-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-bold text-[10px] text-center cursor-pointer transition-colors"
                  >
                    -10% Drop
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateDrop(Math.max(10, Math.round(product.price * 0.2)))}
                    className="py-1 px-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-bold text-[10px] text-center cursor-pointer transition-colors"
                  >
                    -20% Drop
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateDrop(Math.max(15, Math.round(product.price * 0.3)))}
                    className="py-1 px-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-900 font-bold text-[10px] text-center cursor-pointer transition-colors"
                  >
                    -30% Drop
                  </button>
                </div>
                {hasPriceDropped && (
                  <button
                    type="button"
                    onClick={handleResetSimulation}
                    className="w-full py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[10px] transition-colors cursor-pointer"
                  >
                    Reset Price to Catalog (₹{product.price})
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100/70 text-xs text-gray-700">
            <p className="leading-relaxed">
              {product.description ||
                'Hand-selected for exceptional quality, freshness, and authentic taste for daily cooking in Lakkavalli.'}
            </p>
          </div>

          {/* Trust Guarantees */}
          <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-600">
            <div className="flex items-center gap-1.5 p-2 rounded-xl bg-gray-50">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>100% Quality Checked</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded-xl bg-gray-50">
              <Truck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Doorstep in 10 Min</span>
            </div>
          </div>

          {/* Action button */}
          <div className="pt-2">
            {quantityInCart > 0 ? (
              <div className="flex items-center justify-between bg-[#064e3b] text-white rounded-xl p-2 shadow-xs">
                <button
                  onClick={() => onRemoveFromCart(product)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-emerald-800 active:scale-90 transition-all cursor-pointer"
                >
                  <Minus className="w-4 h-4 stroke-[3]" />
                </button>
                <span className="text-sm font-black">{quantityInCart} {t('productCard.inCart')}</span>
                <button
                  onClick={handleAddDiscountedProduct}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-emerald-800 active:scale-90 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleAddDiscountedProduct}
                className="w-full py-3 rounded-xl bg-[#064e3b] hover:bg-[#043c2d] text-white text-xs font-black tracking-wider transition-all shadow-md shadow-emerald-950/20 active:scale-98 cursor-pointer"
              >
                {t('productDetail.addToBasket')} • ₹{currentEffectivePrice}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

