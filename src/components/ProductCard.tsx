import React from 'react';
import { Plus, Minus } from 'lucide-react';
import { Product } from '../types';
import { useLanguage } from '../i18n';

interface ProductCardProps {
  product: Product;
  quantityInCart: number;
  onAddToCart: (product: Product) => void;
  onRemoveFromCart: (product: Product) => void;
  onSelectProduct?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  quantityInCart,
  onAddToCart,
  onRemoveFromCart,
  onSelectProduct,
}) => {
  const { t } = useLanguage();

  return (
    <div
      id={`product-card-${product.id}`}
      className="bg-white rounded-2xl p-3 border border-gray-100 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group relative select-none"
    >
      {/* Clickable Image & Info Section */}
      <div
        onClick={() => onSelectProduct && onSelectProduct(product)}
        className="cursor-pointer"
      >
        {/* Product Image Container */}
        <div className="relative w-full aspect-square rounded-xl bg-gray-50/50 mb-2 overflow-hidden flex items-center justify-center p-2">
          <img
            src={product.image}
            alt={product.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />

          {/* Discount Badge if available */}
          {product.discountPercent > 0 && (
            <span className="absolute top-1.5 left-1.5 bg-orange-50 text-[#ea580c] border border-orange-200 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md">
              {product.discountPercent}% {t('common.off')}
            </span>
          )}
        </div>

        {/* Product Name */}
        <h3 className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-emerald-800 transition-colors">
          {product.name}
        </h3>

        {/* Quantity / Weight */}
        <p className="text-[11px] font-medium text-gray-500 mt-0.5">
          {product.quantity}
        </p>

        {/* Pricing Row: MRP + Price + Discount */}
        <div className="flex items-baseline gap-1.5 mt-2">
          {product.mrp > product.price && (
            <span className="text-[11px] text-gray-400 line-through">
              ₹{product.mrp}
            </span>
          )}
          <span className="text-sm sm:text-base font-extrabold text-gray-900">
            ₹{product.price}
          </span>
          {product.discountPercent > 0 && (
            <span className="text-[10px] font-bold text-[#ea580c]">
              {product.discountPercent}% {t('common.off')}
            </span>
          )}
        </div>
      </div>

      {/* Add to Cart / Quantity Stepper Button */}
      <div className="mt-2.5 pt-1">
        {quantityInCart > 0 ? (
          <div
            id={`stepper-${product.id}`}
            className="flex items-center justify-between bg-[#064e3b] text-white rounded-xl px-2 py-1.5 shadow-xs"
          >
            <button
              onClick={() => onRemoveFromCart(product)}
              className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-emerald-800 active:scale-90 transition-all focus:outline-none"
              aria-label={`Decrease quantity of ${product.name}`}
            >
              <Minus className="w-3.5 h-3.5 stroke-[3]" />
            </button>
            <span className="text-xs font-black px-2">{quantityInCart}</span>
            <button
              onClick={() => onAddToCart(product)}
              className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-emerald-800 active:scale-90 transition-all focus:outline-none"
              aria-label={`Increase quantity of ${product.name}`}
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>
        ) : (
          <button
            id={`add-btn-${product.id}`}
            onClick={() => onAddToCart(product)}
            className="w-full py-1.5 rounded-xl bg-[#064e3b] hover:bg-[#043c2d] text-white text-xs font-extrabold tracking-wider active:scale-[0.98] transition-all shadow-xs flex items-center justify-center"
            aria-label={`Add ${product.name} to cart`}
          >
            {t('common.add')}
          </button>
        )}
      </div>
    </div>
  );
};

