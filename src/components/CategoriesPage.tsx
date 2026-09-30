import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShoppingBag, PackageOpen } from 'lucide-react';
import { Category, Product } from '../types';
import { ProductCard } from './ProductCard';
import { useLanguage } from '../i18n';

interface CategoriesPageProps {
  categories: Category[];
  allProducts: Product[];
  initialCategory?: string | null;
  cartItemCounts: Record<string, number>;
  onAddToCart: (product: Product) => void;
  onRemoveFromCart: (product: Product) => void;
  onSelectProduct: (product: Product) => void;
  onBackToHome: () => void;
  onOpenCart?: () => void;
  cartCount?: number;
}

export const CategoriesPage: React.FC<CategoriesPageProps> = ({
  categories = [],
  allProducts = [],
  initialCategory,
  cartItemCounts = {},
  onAddToCart,
  onRemoveFromCart,
  onSelectProduct,
  onBackToHome,
  onOpenCart,
  cartCount = 0,
}) => {
  const { t, localizeCategoryName } = useLanguage();
  const safeCategories = Array.isArray(categories) ? categories.filter(Boolean) : [];
  const safeProducts = Array.isArray(allProducts) ? allProducts.filter(Boolean) : [];
  const safeCartCounts = cartItemCounts || {};

  const validCategories = safeCategories.filter((c) => c && c.name && c.name !== 'More');

  const [activeCategory, setActiveCategory] = useState<string>(
    initialCategory || validCategories[0]?.name || 'Vegetables'
  );

  useEffect(() => {
    if (initialCategory) {
      setActiveCategory(initialCategory);
    }
  }, [initialCategory]);

  const currentCat = validCategories.find(
    (c) => c.name.toLowerCase() === activeCategory.toLowerCase() || c.id === activeCategory
  );
  const activeCategoryName = currentCat ? currentCat.name : activeCategory;

  const filteredProducts = safeProducts.filter((p) => {
    if (!p || typeof p !== 'object') return false;
    if (activeCategory === 'All') return true;
    if (!p.category) return false;
    const pCat = String(p.category).toLowerCase();
    return (
      p.category === activeCategoryName ||
      pCat === activeCategory.toLowerCase() ||
      (currentCat && pCat === currentCat.name.toLowerCase()) ||
      (currentCat && p.category === currentCat.id)
    );
  });

  // Find categories that currently have products available in catalog
  const availableCategories = validCategories.filter((cat) => {
    const catName = cat.name.toLowerCase();
    return safeProducts.some(
      (p) =>
        p &&
        p.category &&
        (p.category === cat.name ||
          p.category.toLowerCase() === catName ||
          p.category === cat.id)
    );
  });

  return (
    <div className="min-h-screen bg-[#f8faf9] pb-24 text-gray-900 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2.5">
          <button
            id="categories-back-btn"
            onClick={onBackToHome}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-gray-100 text-gray-700 active:scale-95 transition-all cursor-pointer"
            aria-label="Back to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-extrabold text-gray-900 leading-tight">{t('nav.categories')}</h1>
            <p className="text-[11px] text-gray-500 font-medium">
              Explore 10-minute grocery essentials in Lakkavalli
            </p>
          </div>
        </div>

        {onOpenCart && (
          <button
            id="categories-header-cart-btn"
            onClick={onOpenCart}
            className="relative p-2 rounded-full hover:bg-gray-100 text-gray-700 transition-all cursor-pointer"
            aria-label="Open Cart"
          >
            <ShoppingBag className="w-5 h-5 text-[#064e3b]" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#ea580c] text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                {cartCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Categories Horizontal Tabs */}
      {validCategories.length > 0 && (
        <div className="sticky top-[57px] z-10 border-b border-gray-100 bg-white/95 backdrop-blur-md overflow-x-auto no-scrollbar px-3 py-2.5 flex items-center gap-2 shadow-2xs">
          {validCategories.map((cat) => {
            const isActive =
              activeCategory === cat.name ||
              activeCategory === cat.id ||
              activeCategory.toLowerCase() === cat.name.toLowerCase();
            return (
              <button
                key={cat.id}
                id={`cat-page-tab-${cat.id}`}
                onClick={() => setActiveCategory(cat.name)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#064e3b] text-white shadow-xs'
                    : 'bg-gray-100/90 text-gray-700 hover:bg-gray-200 border border-gray-200/60'
                }`}
              >
                {localizeCategoryName(cat.name)}
              </button>
            );
          })}
        </div>
      )}

      {/* Products Grid */}
      <div className="p-3.5 sm:p-4">
        <div className="flex items-center justify-between mb-3 px-0.5">
          <h2 className="text-sm font-extrabold text-gray-900">
            {activeCategory === 'All' ? t('search.all') : localizeCategoryName(activeCategoryName || activeCategory)}
          </h2>
          <span className="text-xs text-gray-500 font-medium">
            {filteredProducts.length} items available
          </span>
        </div>

        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                quantityInCart={safeCartCounts[product.id] || 0}
                onAddToCart={onAddToCart}
                onRemoveFromCart={onRemoveFromCart}
                onSelectProduct={onSelectProduct}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 px-4 bg-white rounded-2xl border border-gray-100 shadow-xs max-w-md mx-auto">
            <div className="w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <PackageOpen className="w-7 h-7 stroke-[1.8]" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">
              No items currently in {activeCategoryName || activeCategory}
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed max-w-xs mx-auto mb-5">
              Fresh stock for this section is arriving shortly. You can explore other available categories below or browse all items.
            </p>

            {availableCategories.length > 0 && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-[11px] font-semibold text-gray-400 mb-2.5">
                  Available in other categories:
                </p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {availableCategories.slice(0, 5).map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.name)}
                      className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 border border-gray-200 hover:border-emerald-200 transition-all cursor-pointer"
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                onClick={() => setActiveCategory('All')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#064e3b] text-white hover:bg-emerald-900 active:scale-95 transition-all cursor-pointer shadow-xs"
              >
                Browse All Products
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
