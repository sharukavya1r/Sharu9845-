import React from 'react';
import { MapPin, ChevronDown, ShoppingCart, User, Menu } from 'lucide-react';
import { DeliveryLocation, UserProfile } from '../types';
import { useLanguage } from '../i18n';

interface HeaderProps {
  selectedLocation: DeliveryLocation | null;
  onOpenLocationModal: () => void;
  onOpenCart: () => void;
  cartCount: number;
  user?: UserProfile;
  onOpenAccount: () => void;
  onOpenSideMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedLocation,
  onOpenLocationModal,
  onOpenCart,
  cartCount,
  user,
  onOpenAccount,
  onOpenSideMenu,
}) => {
  const { t } = useLanguage();

  // Only derive village name from customer's saved address
  const savedVillageName =
    selectedLocation?.village?.trim() || selectedLocation?.city?.trim() || '';

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-emerald-50/80 px-3.5 py-2.5 transition-all">
      <div className="flex items-center justify-between gap-3 max-w-xl mx-auto">
        {/* Left Group: Hamburger Menu + Location Selector */}
        <div className="flex items-center gap-2 flex-1 min-w-0 pr-1">
          {/* Hamburger Menu Icon Button */}
          <button
            id="header-hamburger-btn"
            type="button"
            onClick={onOpenSideMenu}
            className="w-8 h-8 rounded-full bg-emerald-50 hover:bg-emerald-100/90 active:scale-95 transition-all text-emerald-900 flex items-center justify-center border border-emerald-200/80 shadow-2xs cursor-pointer shrink-0 focus:outline-none"
            aria-label={t('header.openMenu')}
            title="Menu"
          >
            <Menu className="w-4.5 h-4.5 text-emerald-900 stroke-[2.2]" />
          </button>

          {/* Location Section */}
          <button
            id="header-location-btn"
            onClick={onOpenLocationModal}
            className="flex items-center gap-2 text-left focus:outline-none group active:scale-[0.98] transition-transform flex-1 min-w-0 cursor-pointer"
            aria-label="Delivery location"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 shrink-0">
              <MapPin className="w-4 h-4 fill-emerald-600 text-emerald-600" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-black text-emerald-800 tracking-wider leading-none uppercase">
                  {t('header.deliverTo')}
                </span>
                {savedVillageName && (
                  <span className="text-[9px] font-extrabold text-emerald-700 uppercase leading-tight flex items-center gap-0.5">
                    {t('header.tenMin')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 min-w-0 mt-0.5">
                <span className="text-xs sm:text-sm font-extrabold text-gray-900 tracking-tight truncate leading-tight">
                  {savedVillageName || t('header.selectLocation')}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-600 group-hover:text-emerald-700 transition-colors shrink-0 stroke-[2.5]" />
              </div>
            </div>
          </button>
        </div>

        {/* 2. Top-Right Section: Account / Profile & Cart */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Top-Right Account / Profile Button */}
          <button
            id="header-account-btn"
            onClick={onOpenAccount}
            className="relative w-9 h-9 rounded-full bg-emerald-50 hover:bg-emerald-100/90 active:scale-95 transition-all text-emerald-900 flex items-center justify-center border border-emerald-200/80 shadow-2xs cursor-pointer focus:outline-none"
            aria-label={user?.isLoggedIn ? `Account (${user.name || 'Logged in'})` : 'Login / Account'}
            title={user?.isLoggedIn ? t('header.yourAccount') : t('header.login')}
          >
            {user?.isLoggedIn ? (
              <div className="relative flex items-center justify-center w-full h-full text-xs font-black text-emerald-900">
                {user.name ? user.name.trim().charAt(0).toUpperCase() : 'U'}
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
              </div>
            ) : (
              <User className="w-4 h-4 text-emerald-800 stroke-[2.2]" />
            )}
          </button>

          {/* Cart Icon */}
          <button
            id="header-cart-btn"
            onClick={onOpenCart}
            className="relative w-9 h-9 rounded-full bg-[#064e3b] hover:bg-[#043c2d] active:scale-95 transition-all text-white flex items-center justify-center shadow-xs shrink-0 cursor-pointer focus:outline-none"
            aria-label="Open Cart"
            title={t('header.cart')}
          >
            <ShoppingCart className="w-[19px] h-[19px] text-white stroke-[2.3]" />
            {cartCount > 0 && (
              <span
                id="header-cart-badge"
                className="absolute -top-1 -right-1 bg-[#f97316] text-white text-[10px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow-xs ring-2 ring-white leading-none pointer-events-none"
              >
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

