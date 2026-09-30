import { ProductItem } from '../../types';

export const HOUSEHOLD_PRODUCTS: ProductItem[] = [
  {
    id: 'hh-detergent',
    name: 'Easy Wash Detergent',
    brand: 'Surf Excel',
    quantity: '1 kg',
    mrp: 145,
    price: 130,
    discountPercent: 10,
    image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=500&auto=format&fit=crop&q=80',
    category: 'Household',
    description: 'Fast dissolving washing powder that removes tough stains easily.',
    inStock: true,
  },
  {
    id: 'hh-dishwash',
    name: 'Dishwash Gel (Lemon)',
    brand: 'Vim',
    quantity: '500 ml',
    mrp: 125,
    price: 110,
    discountPercent: 12,
    image: 'https://images.unsplash.com/photo-1585670149967-b4f4da88cc9f?w=500&auto=format&fit=crop&q=80',
    category: 'Household',
    description: 'Powerful grease-cutting liquid with fresh natural lime fragrance.',
    inStock: true,
  },
  {
    id: 'hh-freshener',
    name: 'Home Air Freshener',
    brand: 'Godrej aer',
    quantity: '1 pc',
    mrp: 65,
    price: 55,
    discountPercent: 15,
    image: 'https://images.unsplash.com/photo-1595348020949-87cdfbb44174?w=500&auto=format&fit=crop&q=80',
    category: 'Household',
    description: 'Long-lasting fragrant bathroom and room freshener pocket.',
    inStock: true,
  },
];

// Backward-compatible alias
export const HOUSEHOLD_ESSENTIALS = HOUSEHOLD_PRODUCTS;
