import React from 'react';
import { Home, LayoutGrid, ClipboardList, User } from 'lucide-react';
import { useLanguage } from '../i18n';

export type NavTab = 'home' | 'categories' | 'orders' | 'profile';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  activeOrdersCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  activeOrdersCount = 0,
}) => {
  const { t } = useLanguage();

  return (
    <nav
      id="bottom-navigation-bar"
      className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-gray-100 py-1.5 px-3 shadow-lg"
      aria-label="Bottom Navigation Bar"
    >
      <div className="grid grid-cols-4 items-center max-w-md mx-auto">
        {/* 1. 🏠 Home Option */}
        <button
          id="nav-tab-home"
          onClick={() => onTabChange('home')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'home'
              ? 'text-[#064e3b] font-bold bg-emerald-50/80'
              : 'text-gray-500 hover:text-gray-900 font-medium'
          }`}
          aria-label={t('nav.home')}
          aria-selected={activeTab === 'home'}
        >
          <Home
            className={`w-5 h-5 ${
              activeTab === 'home'
                ? 'fill-[#064e3b] text-[#064e3b]'
                : 'stroke-[2]'
            }`}
          />
          <span className="text-[11px] sm:text-xs mt-1 tracking-tight leading-none">{t('nav.home')}</span>
        </button>

        {/* 2. Categories Option (Clean 4-square grid style icon) */}
        <button
          id="nav-tab-categories"
          onClick={() => onTabChange('categories')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'categories'
              ? 'text-[#064e3b] font-bold bg-emerald-50/80'
              : 'text-gray-500 hover:text-gray-900 font-medium'
          }`}
          aria-label={t('nav.categories')}
          aria-selected={activeTab === 'categories'}
        >
          <LayoutGrid
            className={`w-5 h-5 ${
              activeTab === 'categories'
                ? 'text-[#064e3b] stroke-[2.4]'
                : 'stroke-[2]'
            }`}
          />
          <span className="text-[11px] sm:text-xs mt-1 tracking-tight leading-none">{t('nav.categories')}</span>
        </button>

        {/* 3. 📋 Orders Option */}
        <button
          id="nav-tab-orders"
          onClick={() => onTabChange('orders')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all relative cursor-pointer ${
            activeTab === 'orders'
              ? 'text-[#064e3b] font-bold bg-emerald-50/80'
              : 'text-gray-500 hover:text-gray-900 font-medium'
          }`}
          aria-label={t('nav.orders')}
          aria-selected={activeTab === 'orders'}
        >
          <div className="relative">
            <ClipboardList
              className={`w-5 h-5 ${
                activeTab === 'orders'
                  ? 'text-[#064e3b] stroke-[2.4]'
                  : 'stroke-[2]'
              }`}
            />
            {activeOrdersCount > 0 && (
              <span className="absolute -top-1 -right-2.5 bg-emerald-600 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                {activeOrdersCount}
              </span>
            )}
          </div>
          <span className="text-[11px] sm:text-xs mt-1 tracking-tight leading-none">{t('nav.orders')}</span>
        </button>

        {/* 4. 👤 Profile Option */}
        <button
          id="nav-tab-profile"
          onClick={() => onTabChange('profile')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'text-[#064e3b] font-bold bg-emerald-50/80'
              : 'text-gray-500 hover:text-gray-900 font-medium'
          }`}
          aria-label={t('nav.profile')}
          aria-selected={activeTab === 'profile'}
        >
          <User
            className={`w-5 h-5 ${
              activeTab === 'profile'
                ? 'text-[#064e3b] stroke-[2.4]'
                : 'stroke-[2]'
            }`}
          />
          <span className="text-[11px] sm:text-xs mt-1 tracking-tight leading-none">{t('nav.profile')}</span>
        </button>
      </div>
    </nav>
  );
};

