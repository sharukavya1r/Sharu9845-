import { ProductItem } from '../types';
import { VEGETABLE_PRODUCTS, FRESH_VEGETABLES } from './categories/vegetables';
import { FRUIT_PRODUCTS, FRUITS } from './categories/fruits';
import { MILK_DAIRY_PRODUCTS, MILK_AND_DAIRY } from './categories/milk-dairy';
import { RICE_GRAIN_PRODUCTS, RICE_AND_GRAINS } from './categories/rice-grains';
import { ATTA_FLOUR_PRODUCTS } from './categories/atta-flour';
import { OIL_PRODUCTS, OILS } from './categories/oils';
import { SNACK_PRODUCTS, SNACKS } from './categories/snacks';
import { BEVERAGE_PRODUCTS, BEVERAGES } from './categories/beverages';
import { PERSONAL_CARE_PRODUCTS, PERSONAL_CARE } from './categories/personal-care';
import { HOUSEHOLD_PRODUCTS, HOUSEHOLD_ESSENTIALS } from './categories/household';
import { BABY_CARE_PRODUCTS, BABY_CARE } from './categories/baby-care';

// Central aggregation of all category products
export const ALL_PRODUCTS: ProductItem[] = [
  ...(Array.isArray(VEGETABLE_PRODUCTS) ? VEGETABLE_PRODUCTS : []),
  ...(Array.isArray(FRUIT_PRODUCTS) ? FRUIT_PRODUCTS : []),
  ...(Array.isArray(MILK_DAIRY_PRODUCTS) ? MILK_DAIRY_PRODUCTS : []),
  ...(Array.isArray(RICE_GRAIN_PRODUCTS) ? RICE_GRAIN_PRODUCTS : []),
  ...(Array.isArray(ATTA_FLOUR_PRODUCTS) ? ATTA_FLOUR_PRODUCTS : []),
  ...(Array.isArray(OIL_PRODUCTS) ? OIL_PRODUCTS : []),
  ...(Array.isArray(SNACK_PRODUCTS) ? SNACK_PRODUCTS : []),
  ...(Array.isArray(BEVERAGE_PRODUCTS) ? BEVERAGE_PRODUCTS : []),
  ...(Array.isArray(PERSONAL_CARE_PRODUCTS) ? PERSONAL_CARE_PRODUCTS : []),
  ...(Array.isArray(HOUSEHOLD_PRODUCTS) ? HOUSEHOLD_PRODUCTS : []),
  ...(Array.isArray(BABY_CARE_PRODUCTS) ? BABY_CARE_PRODUCTS : []),
];

// Backward-compatible alias for the "Rice, Atta & Grains" combined section
const COMBINED_RICE_ATTA_GRAINS: ProductItem[] = [
  ...(Array.isArray(RICE_GRAIN_PRODUCTS) ? RICE_GRAIN_PRODUCTS : []),
  ...(Array.isArray(ATTA_FLOUR_PRODUCTS) ? ATTA_FLOUR_PRODUCTS : []),
];

// Re-exports of individual category arrays
export {
  VEGETABLE_PRODUCTS,
  FRESH_VEGETABLES,
  FRUIT_PRODUCTS,
  FRUITS,
  MILK_DAIRY_PRODUCTS,
  MILK_AND_DAIRY,
  RICE_GRAIN_PRODUCTS,
  COMBINED_RICE_ATTA_GRAINS as RICE_AND_GRAINS,
  ATTA_FLOUR_PRODUCTS,
  OIL_PRODUCTS,
  OILS,
  SNACK_PRODUCTS,
  SNACKS,
  BEVERAGE_PRODUCTS,
  BEVERAGES,
  PERSONAL_CARE_PRODUCTS,
  PERSONAL_CARE,
  HOUSEHOLD_PRODUCTS,
  HOUSEHOLD_ESSENTIALS,
  BABY_CARE_PRODUCTS,
  BABY_CARE,
};
