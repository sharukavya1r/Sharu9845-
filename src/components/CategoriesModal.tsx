import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, PackageOpen } from 'lucide-react';
import { Category, Product } from '../types';
import { ProductCard } from './ProductCard';
import { useLanguage } from '../i18n';

interface CategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  allProducts: Product[];
  initialCategory?: string | null;
  cartItemCounts: Record<string, number>;
  onAddToCart: (product: Product) => void;
  onRemoveFromCart: (product: Product) => void;
  onSelectProduct: (product: Product) => void;
}

export const CategoriesModal: React.FC<CategoriesModalProps> = ({
  isOpen,
  onClose,
  categories = [],
  allProducts = [],
  initialCategory,
  cartItemCounts = {},
  onAddToCart,
  onRemoveFromCart,
  onSelectProduct,
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
  }, [initialCategory, isOpen]);

  if (!isOpen) return null;

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

  // Categories that currently have items in inventory
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
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-center animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-250">
        {/* Header */}
        <div className="bg-white px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100 text-gray-700 cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-base font-extrabold text-gray-900">{t('nav.categories')}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categories Horizontal Tabs */}
        {validCategories.length > 0 && (
          <div className="border-b border-gray-100 bg-gray-50/70 overflow-x-auto no-scrollbar px-3 py-2 flex items-center gap-2">
            {validCategories.map((cat) => {
              const isActive =
                activeCategory === cat.name ||
                activeCategory === cat.id ||
                activeCategory.toLowerCase() === cat.name.toLowerCase();
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.name)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#064e3b] text-white shadow-xs'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {localizeCategoryName(cat.name)}
                </button>
              );
            })}
          </div>
        )}

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-extrabold text-gray-900">
              {activeCategory === 'All' ? 'All Groceries' : activeCategoryName || activeCategory}
            </h3>
            <span className="text-xs text-gray-500 font-medium">
              {filteredProducts.length} items available in Lakkavalli
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
            <div className="text-center py-12 px-4 bg-gray-50/70 rounded-2xl border border-gray-100 mt-2">
              <div className="w-13 h-13 mx-auto mb-3 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                <PackageOpen className="w-6 h-6 stroke-[1.8]" />
              </div>
              <h4 className="text-sm font-bold text-gray-900 mb-1">
                No items currently in {activeCategoryName || activeCategory}
              </h4>
              <p className="text-xs text-gray-500 max-w-xs mx-auto mb-4">
                Fresh inventory for this category is restocking soon. Choose from other in-stock categories below:
              </p>

              {availableCategories.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5 mb-4">
                  {availableCategories.slice(0, 5).map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.name)}
                      className="px-2.5 py-1 rounded-full text-xs font-medium bg-white text-gray-700 hover:text-emerald-800 border border-gray-200 hover:border-emerald-200 transition-all cursor-pointer"
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => setActiveCategory('All')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#064e3b] text-white hover:bg-emerald-900 transition-all cursor-pointer shadow-xs"
              >
                Browse All Groceries
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
