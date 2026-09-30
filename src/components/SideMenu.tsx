import React, { useState, useEffect } from 'react';
import {
  X,
  ShoppingBag,
  LayoutGrid,
  Headphones,
  HelpCircle,
  PhoneCall,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { BUSINESS_CONFIG } from '../config/businessConfig';
import { vibrateFeedback } from '../utils/haptics';
import { useLanguage } from '../i18n';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToOrders: () => void;
  onNavigateToCategories: () => void;
  activeOrdersCount?: number;
}

export const SideMenu: React.FC<SideMenuProps> = ({
  isOpen,
  onClose,
  onNavigateToOrders,
  onNavigateToCategories,
  activeOrdersCount = 0,
}) => {
  const { t } = useLanguage();
  const [activeSupportModal, setActiveSupportModal] = useState<
    'none' | 'customer-support' | 'help-faq' | 'contact-us'
  >('none');

  // Prevent background scrolling when drawer or modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setActiveSupportModal('none');
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeSupportModal !== 'none') {
          setActiveSupportModal('none');
        } else if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeSupportModal, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="side-menu-drawer-root"
      className="fixed inset-0 z-50 overflow-hidden flex"
      role="dialog"
      aria-modal="true"
      aria-label="QuickBasket navigation menu"
    >
      {/* Backdrop overlay */}
      <div
        id="side-menu-backdrop"
        onClick={() => {
          vibrateFeedback();
          onClose();
        }}
        className="fixed inset-0 bg-black/60 backdrop-blur-2xs transition-opacity duration-300 animate-in fade-in cursor-pointer"
      />

      {/* Slide-out Left Drawer */}
      <aside
        id="side-menu-content"
        className="relative z-10 w-[82%] max-w-[320px] sm:max-w-[340px] h-full bg-white shadow-2xl flex flex-col justify-between overflow-y-auto transform transition-transform duration-300 ease-out animate-in slide-in-from-left"
      >
        {/* Top Content Group */}
        <div>
          {/* =========================================================================
              HEADER: Dark QuickBasket Green with Lakkavalli Hub Info & Close (X)
              ========================================================================= */}
          <div className="bg-[#064e3b] text-white p-4 sm:p-5 relative overflow-hidden border-b border-emerald-800/60 shadow-xs">
            {/* Ambient subtle glow */}
            <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-emerald-600/20 blur-xl pointer-events-none" />

            {/* Top Bar: Small QuickBasket Branding + Close Button */}
            <div className="flex items-center justify-between mb-3 relative z-10">
              <div className="flex items-center gap-1.5">
                <span className="text-base leading-none">🧺</span>
                <span className="text-sm font-black tracking-tight text-white">
                  QuickBasket
                </span>
                <span className="text-[9px] font-extrabold uppercase bg-emerald-700/80 text-emerald-200 px-1.5 py-0.5 rounded tracking-wider ml-1 border border-emerald-600/40">
                  Lakkavalli
                </span>
              </div>

              <button
                id="side-menu-close-btn"
                type="button"
                onClick={() => {
                  vibrateFeedback();
                  onClose();
                }}
                className="w-7.5 h-7.5 rounded-full bg-emerald-900/80 hover:bg-emerald-800 active:scale-95 text-emerald-100 flex items-center justify-center transition-colors cursor-pointer border border-emerald-700/50"
                aria-label="Close menu"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Hub Details */}
            <div className="space-y-1 relative z-10">
              <div className="flex items-center gap-1.5 text-emerald-200/90 text-xs font-bold">
                <MapPin className="w-3.5 h-3.5 text-emerald-300 shrink-0 stroke-[2.5]" />
                <h2 className="text-sm font-black text-white tracking-tight leading-snug">
                  {BUSINESS_CONFIG.hubName}
                </h2>
              </div>

              <p className="text-[11px] text-emerald-100/80 pl-5 font-medium leading-tight">
                {BUSINESS_CONFIG.hubAddress}
              </p>

              {/* Delivery Guarantee Badge */}
              <div className="pt-2 pl-5">
                <span className="inline-flex items-center gap-1 bg-emerald-500/25 border border-emerald-400/40 text-emerald-200 text-[10px] font-extrabold px-2 py-0.75 rounded-full shadow-2xs">
                  <Sparkles className="w-3 h-3 text-[#86efac]" />
                  <span>{BUSINESS_CONFIG.deliveryPromise}</span>
                </span>
              </div>
            </div>
          </div>

          {/* =========================================================================
              MAIN MENU OPTIONS
              My Orders & All Categories with modern outline icons
              ========================================================================= */}
          <div className="p-3 border-b border-gray-100">
            <span className="text-[9px] font-extrabold uppercase text-gray-400 tracking-wider px-2 block mb-1.5">
              {t('sideMenu.myOrders')}
            </span>

            <nav className="space-y-1">
              {/* 1. My Orders */}
              <button
                id="side-menu-my-orders-btn"
                type="button"
                onClick={() => {
                  vibrateFeedback();
                  onClose();
                  onNavigateToOrders();
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-emerald-50/70 active:bg-emerald-100/80 transition-colors text-left group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/60 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <ShoppingBag className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-900 group-hover:text-emerald-950 block leading-tight">
                      {t('sideMenu.myOrders')}
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium">
                      {t('sideMenu.myOrdersDesc')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {activeOrdersCount > 0 && (
                    <span className="text-[9px] font-black bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded-full animate-pulse">
                      {activeOrdersCount} Active
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-700 transition-colors" />
                </div>
              </button>

              {/* 2. All Categories */}
              <button
                id="side-menu-categories-btn"
                type="button"
                onClick={() => {
                  vibrateFeedback();
                  onClose();
                  onNavigateToCategories();
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-emerald-50/70 active:bg-emerald-100/80 transition-colors text-left group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/60 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <LayoutGrid className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-900 group-hover:text-emerald-950 block leading-tight">
                      {t('sideMenu.allCategories')}
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium">
                      {t('sideMenu.allCategoriesDesc')}
                    </span>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-700 transition-colors" />
              </button>
            </nav>
          </div>

          {/* =========================================================================
              SECTION: OUR PROMISE TO LAKKAVALLI
              Genuine business information, no fake claims
              ========================================================================= */}
          <div className="p-3 border-b border-gray-100 bg-[#fbfdfc]">
            <span className="text-[9px] font-extrabold uppercase text-emerald-800 tracking-wider px-2 block mb-2">
              {t('sideMenu.ourPromise')}
            </span>

            <div className="space-y-2 px-1 text-gray-700">
              <div className="flex items-start gap-2 text-[11px] leading-snug">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5 stroke-[2.5]" />
                <span className="font-medium">
                  <strong className="font-bold text-gray-900">{t('sideMenu.storeFulfillmentTitle')}</strong> {t('sideMenu.storeFulfillmentDesc')}
                </span>
              </div>

              <div className="flex items-start gap-2 text-[11px] leading-snug">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5 stroke-[2.5]" />
                <span className="font-medium">
                  <strong className="font-bold text-gray-900">{t('sideMenu.freshDailyTitle')}</strong> {t('sideMenu.freshDailyDesc')}
                </span>
              </div>

              <div className="flex items-start gap-2 text-[11px] leading-snug">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5 stroke-[2.5]" />
                <span className="font-medium">
                  <strong className="font-bold text-gray-900">{t('sideMenu.tenMinGuaranteeTitle')}</strong> {t('sideMenu.tenMinGuaranteeDesc')}
                </span>
              </div>
            </div>
          </div>

          {/* =========================================================================
              SECTION: ASSISTANCE & HELP
              Customer Support, Help & Support, Contact Us
              ========================================================================= */}
          <div className="p-3">
            <span className="text-[9px] font-extrabold uppercase text-gray-400 tracking-wider px-2 block mb-1.5">
              {t('profile.helpSupport')}
            </span>

            <div className="space-y-1">
              {/* Customer Support */}
              <button
                id="side-menu-customer-support-btn"
                type="button"
                onClick={() => {
                  vibrateFeedback();
                  setActiveSupportModal('customer-support');
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-emerald-50/70 active:bg-emerald-100/80 transition-colors text-left group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7.5 h-7.5 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200/50 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Headphones className="w-3.5 h-3.5 stroke-[2.2]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-900 block leading-tight">
                      {t('sideMenu.customerSupport')}
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium">
                      {t('sideMenu.customerSupportDesc')}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-emerald-700" />
              </button>

              {/* Help & Support (FAQ) */}
              <button
                id="side-menu-help-support-btn"
                type="button"
                onClick={() => {
                  vibrateFeedback();
                  setActiveSupportModal('help-faq');
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-emerald-50/70 active:bg-emerald-100/80 transition-colors text-left group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7.5 h-7.5 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200/50 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <HelpCircle className="w-3.5 h-3.5 stroke-[2.2]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-900 block leading-tight">
                      {t('sideMenu.helpFaq')}
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium">
                      {t('sideMenu.helpFaqDesc')}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-emerald-700" />
              </button>

              {/* Contact Us */}
              <button
                id="side-menu-contact-us-btn"
                type="button"
                onClick={() => {
                  vibrateFeedback();
                  setActiveSupportModal('contact-us');
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-emerald-50/70 active:bg-emerald-100/80 transition-colors text-left group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7.5 h-7.5 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200/50 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <PhoneCall className="w-3.5 h-3.5 stroke-[2.2]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-900 block leading-tight">
                      {t('sideMenu.contactUs')}
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium">
                      {t('sideMenu.contactUsDesc')}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-emerald-700" />
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            FOOTER: QuickBasket – Lakkavalli, Karnataka
            Real business and legal details from configuration
            ========================================================================= */}
        <footer className="p-4 border-t border-emerald-100/80 bg-[#f8faf9] text-center space-y-1">
          <p className="text-xs font-black text-gray-900 tracking-tight">
            QuickBasket – Lakkavalli, Karnataka
          </p>
          <p className="text-[10px] font-semibold text-emerald-800">
            {BUSINESS_CONFIG.legalEntity} • Lakkavalli Dark Store
          </p>
          <p className="text-[9px] text-gray-500">
            {BUSINESS_CONFIG.copyright}
          </p>
          <div className="pt-1 flex items-center justify-center gap-1.5 text-[9px] text-gray-400">
            <Clock className="w-2.5 h-2.5" />
            <span>Store Hours: {BUSINESS_CONFIG.operatingHours}</span>
          </div>
        </footer>
      </aside>

      {/* =========================================================================
          INTERACTIVE MODAL: CUSTOMER SUPPORT / HELP / CONTACT US
          Provides authentic store information (NO fake phone numbers)
          ========================================================================= */}
      {activeSupportModal !== 'none' && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in">
          <div
            className="w-full max-w-sm bg-white rounded-2xl p-4 sm:p-5 shadow-2xl border border-emerald-100 space-y-3 animate-in zoom-in-95 duration-200"
            role="document"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200">
                  {activeSupportModal === 'customer-support' ? (
                    <Headphones className="w-4 h-4" />
                  ) : activeSupportModal === 'help-faq' ? (
                    <HelpCircle className="w-4 h-4" />
                  ) : (
                    <PhoneCall className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 leading-tight">
                    {activeSupportModal === 'customer-support'
                      ? 'Customer Support'
                      : activeSupportModal === 'help-faq'
                      ? 'Help & Support'
                      : 'Contact QuickBasket'}
                  </h3>
                  <span className="text-[10px] text-emerald-800 font-semibold">
                    Lakkavalli Local Store
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveSupportModal('none')}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 flex items-center justify-center cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Modal Content Based on Selection */}
            {activeSupportModal === 'customer-support' && (
              <div className="space-y-2.5 text-xs text-gray-700">
                <p className="leading-relaxed">
                  Our local team at the Lakkavalli Hub handles order preparation, packaging and fast dispatch.
                </p>

                <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3 space-y-2 text-[11px]">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                    <span>
                      <strong>Live Order Inquiries:</strong> During an active delivery, you can call your assigned delivery partner directly with one tap from the order tracking screen.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Mail className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                    <span>
                      <strong>Direct Store Email:</strong>{' '}
                      <a
                        href={`mailto:${BUSINESS_CONFIG.supportEmail}?subject=QuickBasket%20Lakkavalli%20Support`}
                        className="font-bold text-emerald-900 underline"
                      >
                        {BUSINESS_CONFIG.supportEmail}
                      </a>
                    </span>
                  </div>
                </div>

                {BUSINESS_CONFIG.supportPhone ? (
                  <a
                    href={`tel:${BUSINESS_CONFIG.supportPhone}`}
                    className="w-full py-2.5 px-3 bg-[#064e3b] hover:bg-[#043c2d] text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Call Store: {BUSINESS_CONFIG.supportPhone}</span>
                  </a>
                ) : (
                  <a
                    href={`mailto:${BUSINESS_CONFIG.supportEmail}?subject=QuickBasket%20Support%20Request`}
                    className="w-full py-2.5 px-3 bg-[#064e3b] hover:bg-[#043c2d] text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email Customer Support</span>
                  </a>
                )}
              </div>
            )}

            {activeSupportModal === 'help-faq' && (
              <div className="space-y-2 text-xs text-gray-700 max-h-64 overflow-y-auto pr-1">
                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                  <h4 className="font-bold text-gray-900 text-[11px] mb-0.5">
                    How does 10-minute delivery work?
                  </h4>
                  <p className="text-[10px] text-gray-600 leading-relaxed">
                    Our hub is stationed centrally on Bhadra Reservoir Road. Orders are packed within 90 seconds and dispatched immediately by our local electric delivery riders.
                  </p>
                </div>

                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                  <h4 className="font-bold text-gray-900 text-[11px] mb-0.5">
                    Which payment methods are accepted?
                  </h4>
                  <p className="text-[10px] text-gray-600 leading-relaxed">
                    We accept Cash on Delivery (COD) as well as instant UPI (Google Pay, PhonePe, Paytm) at delivery.
                  </p>
                </div>

                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                  <h4 className="font-bold text-gray-900 text-[11px] mb-0.5">
                    Can I modify my delivery address?
                  </h4>
                  <p className="text-[10px] text-gray-600 leading-relaxed">
                    Yes, you can tap on your profile or tap the address dropdown on the header to select your specific neighborhood in Lakkavalli.
                  </p>
                </div>
              </div>
            )}

            {activeSupportModal === 'contact-us' && (
              <div className="space-y-2.5 text-xs text-gray-700">
                <div className="bg-gray-50 border border-gray-200/80 rounded-xl p-3 space-y-2 text-[11px]">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-800 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-gray-900 font-bold">Store Hub Address</strong>
                      <span>{BUSINESS_CONFIG.hubName}</span>
                      <br />
                      <span>{BUSINESS_CONFIG.hubAddress}</span>
                      <br />
                      <span>Lakkavalli - {BUSINESS_CONFIG.postalCode}, {BUSINESS_CONFIG.taluk} Taluk, {BUSINESS_CONFIG.district}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-gray-200/60">
                    <Mail className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
                    <div>
                      <strong className="block text-gray-900 font-bold">Email</strong>
                      <a
                        href={`mailto:${BUSINESS_CONFIG.supportEmail}`}
                        className="text-emerald-900 font-semibold underline"
                      >
                        {BUSINESS_CONFIG.supportEmail}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-gray-200/60">
                    <Clock className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
                    <div>
                      <strong className="block text-gray-900 font-bold">Operating Hours</strong>
                      <span>{BUSINESS_CONFIG.operatingHours}</span>
                    </div>
                  </div>

                  {BUSINESS_CONFIG.supportPhone && (
                    <div className="flex items-center gap-2 pt-1 border-t border-gray-200/60">
                      <PhoneCall className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
                      <div>
                        <strong className="block text-gray-900 font-bold">Official Support Line</strong>
                        <a
                          href={`tel:${BUSINESS_CONFIG.supportPhone}`}
                          className="text-emerald-900 font-bold underline"
                        >
                          {BUSINESS_CONFIG.supportPhone}
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-gray-400 text-center">
                  Legal entity: {BUSINESS_CONFIG.legalEntity}
                </div>
              </div>
            )}

            {/* Close Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setActiveSupportModal('none')}
                className="w-full py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
