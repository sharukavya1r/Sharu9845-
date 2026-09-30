import { ProductItem } from '../../types';

export const BEVERAGE_PRODUCTS: ProductItem[] = [
  {
    id: 'bev-tea',
    name: 'Tata Tea Gold',
    brand: 'Tata Tea',
    quantity: '500 g',
    mrp: 320,
    price: 285,
    discountPercent: 11,
    image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500&auto=format&fit=crop&q=80',
    category: 'Beverages',
    description: 'Exquisite blend of fine Assam CTC tea leaves with gently rolled long leaves.',
    inStock: true,
  },
  {
    id: 'bev-coffee',
    name: 'Filter Coffee Blend',
    brand: 'Bru Gold',
    quantity: '100 g',
    mrp: 195,
    price: 175,
    discountPercent: 10,
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80',
    category: 'Beverages',
    description: 'Aromatic roasted South Indian coffee blend from Chikmagalur plantation beans.',
    inStock: true,
  },
  {
    id: 'bev-mango',
    name: 'Mango Fruit Drink',
    brand: 'Frooti',
    quantity: '600 ml',
    mrp: 40,
    price: 35,
    discountPercent: 12,
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80',
    category: 'Beverages',
    description: 'Thick mango pulp drink made from sun-ripened Indian totapuri mangoes.',
    inStock: true,
  },
  {
    id: 'bev-lemon',
    name: 'Lime Lemon Drink',
    brand: 'Limca',
    quantity: '750 ml',
    mrp: 45,
    price: 40,
    discountPercent: 11,
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=80',
    category: 'Beverages',
    description: 'Refreshing sparkling lemon drink with zesty citrus fizz.',
    inStock: true,
  },
];

// Backward-compatible alias
export const BEVERAGES = BEVERAGE_PRODUCTS;
