import { ProductItem } from '../../types';

export const SNACK_PRODUCTS: ProductItem[] = [
  {
    id: 'snack-bhujia',
    name: 'Aloo Bhujia',
    brand: "Haldiram's",
    quantity: '200 g',
    mrp: 60,
    price: 52,
    discountPercent: 13,
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80',
    category: 'Snacks',
    description: 'Crisp spicy potato and gram flour sev with authentic Indian spices.',
    inStock: true,
  },
  {
    id: 'snack-chips',
    name: 'Classic Salted Chips',
    brand: "Lay's",
    quantity: '90 g',
    mrp: 40,
    price: 36,
    discountPercent: 10,
    image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=80',
    category: 'Snacks',
    description: 'Golden sliced potato wafers lightly dusted with rock salt.',
    inStock: true,
  },
  {
    id: 'snack-cookies',
    name: 'Butter Cookies',
    brand: 'Good Day',
    quantity: '200 g',
    mrp: 45,
    price: 40,
    discountPercent: 11,
    image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500&auto=format&fit=crop&q=80',
    category: 'Snacks',
    description: 'Crunchy butter baked tea-time biscuits with cheerful smile pattern.',
    inStock: true,
  },
];

// Backward-compatible alias
export const SNACKS = SNACK_PRODUCTS;
