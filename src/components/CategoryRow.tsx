import React, { useRef } from 'react';
import { ChevronRight, LayoutGrid } from 'lucide-react';
import { Category } from '../types';
import { useLanguage } from '../i18n';

interface CategoryRowProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryName: string) => void;
  onSeeAll: () => void;
}

export const CategoryRow: React.FC<CategoryRowProps> = ({
  categories = [],
  selectedCategory,
  onSelectCategory,
  onSeeAll,
}) => {
  const { t, localizeCategoryName } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const safeCategories = Array.isArray(categories) ? categories.filter(Boolean) : [];

  if (safeCategories.length === 0) {
    return null;
  }

  return (
    <section className="py-2.5 max-w-xl mx-auto" aria-label="Product Categories">
      {/* Header with Heading & See All */}
      <div className="flex items-center justify-between px-4 mb-2">
        <h2 className="text-base font-bold text-gray-900 tracking-tight">{t('nav.categories')}</h2>
        <button
          id="categories-see-all-btn"
          onClick={onSeeAll}
          className="text-xs font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-0.5 active:scale-95 transition-all cursor-pointer"
        >
          <span>{t('categories.seeAll')}</span>
          <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>

      {/* Horizontal Scrolling Row - ONLY this element scrolls horizontally */}
      <div
        ref={scrollRef}
        className="flex items-start gap-3 overflow-x-auto px-4 no-scrollbar scroll-smooth snap-x snap-mandatory"
        tabIndex={0}
        role="region"
        aria-label="Category list"
      >
        {safeCategories.map((cat, idx) => {
          const catName = cat.name || 'Category';
          const isSelected = selectedCategory === catName;
          const isMore = catName === 'More';

          return (
            <button
              key={cat.id || idx}
              id={`cat-item-${cat.id || idx}`}
              onClick={() => {
                if (isMore) {
                  onSeeAll();
                } else {
                  onSelectCategory(catName);
                }
              }}
              className="flex flex-col items-center gap-1.5 shrink-0 snap-start group focus:outline-none cursor-pointer"
              style={{ width: '64px' }}
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center p-1.5 transition-all duration-200 ${
                  isSelected
                    ? 'bg-emerald-100 ring-2 ring-emerald-600 shadow-sm'
                    : 'bg-white hover:bg-emerald-50/60 border border-gray-100 shadow-2xs group-hover:scale-105'
                }`}
              >
                {isMore ? (
                  <div className="w-full h-full rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-800">
                    <LayoutGrid className="w-6 h-6 stroke-[2.2]" />
                  </div>
                ) : cat.image ? (
                  <img
                    src={cat.image}
                    alt={catName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover rounded-xl"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-800 text-xs font-bold">
                    {catName.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <span
                className={`text-[11px] font-medium text-center leading-tight transition-colors line-clamp-2 ${
                  isSelected ? 'font-bold text-emerald-800' : 'text-gray-700 group-hover:text-emerald-800'
                }`}
              >
                {localizeCategoryName(catName)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
