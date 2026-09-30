import { ProductItem } from '../../types';

export const RICE_GRAIN_PRODUCTS: ProductItem[] = [
  {
    id: 'grain-basmati',
    name: 'Basmati Rice',
    brand: 'India Gate',
    quantity: '5 kg',
    mrp: 245,
    price: 220,
    discountPercent: 10,
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80',
    category: 'Rice & Grains',
    description: 'Aromatic long grain basmati rice, naturally aged for festive meals.',
    inStock: true,
  },
  {
    id: 'grain-toor-dal',
    name: 'Unpolished Toor Dal',
    brand: 'Tata Sampann',
    quantity: '1 kg',
    mrp: 175,
    price: 155,
    discountPercent: 11,
    image: 'https://images.unsplash.com/photo-1599785209707-a456fc1337bb?w=500&auto=format&fit=crop&q=80',
    category: 'Rice & Grains',
    description: 'Protein-rich yellow pigeon peas, unpolished and wholesome.',
    inStock: true,
  },
  {
    id: 'grain-moong-dal',
    name: 'Yellow Moong Dal',
    brand: 'Nature Fresh',
    quantity: '1 kg',
    mrp: 145,
    price: 125,
    discountPercent: 14,
    image: 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=500&auto=format&fit=crop&q=80',
    category: 'Rice & Grains',
    description: 'Split washed yellow mung lentils, quick cooking and easy to digest.',
    inStock: true,
  },
];

// Backward-compatible alias
export const RICE_AND_GRAINS = RICE_GRAIN_PRODUCTS;
