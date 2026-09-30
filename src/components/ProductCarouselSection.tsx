import React, { useRef } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { useLanguage } from '../i18n';

interface ProductCarouselSectionProps {
  id: string;
  title: string;
  subtitle?: string;
  products: Product[];
  cartItemCounts: Record<string, number>;
  onAddToCart: (product: Product) => void;
  onRemoveFromCart: (product: Product) => void;
  onSelectProduct: (product: Product) => void;
  onSeeAll?: () => void;
}

export const ProductCarouselSection: React.FC<ProductCarouselSectionProps> = ({
  id,
  title,
  subtitle,
  products = [],
  cartItemCounts = {},
  onAddToCart,
  onRemoveFromCart,
  onSelectProduct,
  onSeeAll,
}) => {
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const safeProducts = Array.isArray(products) ? products.filter(Boolean) : [];

  // Gracefully hide the section if the category has 0 products
  if (safeProducts.length === 0) {
    return null;
  }

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section id={id} className="py-2.5 w-full max-w-xl mx-auto overflow-hidden" aria-label={title}>
      {/* Header with Title & See All */}
      <div className="flex items-center justify-between px-4 mb-2">
        <div>
          <h2 className="text-base font-bold text-gray-900 tracking-tight leading-tight">
            {title}
          </h2>
          {subtitle && (
            <span className="text-[11px] text-gray-500 font-medium block leading-tight mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => handleScroll('left')}
              className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-800 cursor-pointer"
              aria-label={`Scroll ${title} left`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleScroll('right')}
              className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-800 cursor-pointer"
              aria-label={`Scroll ${title} right`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {onSeeAll && (
            <button
              id={`see-all-${id}`}
              onClick={onSeeAll}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-0.5 active:scale-95 transition-all cursor-pointer"
            >
              <span>{t('categories.seeAll')}</span>
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Carousel (Only this row scrolls horizontally) */}
      <div
        ref={scrollRef}
        className="flex items-stretch gap-3 overflow-x-auto px-4 no-scrollbar scroll-smooth snap-x snap-mandatory max-w-full overscroll-x-contain"
        tabIndex={0}
        role="region"
        aria-label={`${title} product carousel`}
      >
        {safeProducts.map((product) => (
          <div
            key={product.id}
            className="w-[145px] sm:w-[155px] shrink-0 snap-start flex flex-col"
          >
            <ProductCard
              product={product}
              quantityInCart={(cartItemCounts && product.id ? cartItemCounts[product.id] : 0) || 0}
              onAddToCart={onAddToCart}
              onRemoveFromCart={onRemoveFromCart}
              onSelectProduct={onSelectProduct}
            />
          </div>
        ))}
      </div>
    </section>
  );
};
