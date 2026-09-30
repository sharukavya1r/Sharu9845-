import { CartItem } from '../types';
import { toCanonicalUserId } from '../utils/userUtils';

const STORAGE_KEY_USER_CARTS = 'quickbasket_carts_by_user';

/**
 * Reads the customer-isolated cart map from storage.
 * Maps canonical userId -> CartItem[]
 */
export function getAllUserCartsMap(): Record<string, CartItem[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER_CARTS);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    console.error('Failed to read user carts map from storage:', err);
    return {};
  }
}

/**
 * Returns cart items strictly belonging to the authenticated customer ID.
 * If userId is empty or missing, returns an empty array.
 */
export function getUserCart(userId?: string | null): CartItem[] {
  const canonicalId = toCanonicalUserId(userId);
  if (!canonicalId || typeof window === 'undefined') {
    return [];
  }
  const map = getAllUserCartsMap();
  const cart = map[canonicalId];
  return Array.isArray(cart) ? cart : [];
}

/**
 * Saves cart items strictly associated with the authenticated customer ID.
 */
export function saveUserCart(userId: string, cart: CartItem[]): void {
  const canonicalId = toCanonicalUserId(userId);
  if (!canonicalId || typeof window === 'undefined') {
    return;
  }
  const map = getAllUserCartsMap();
  map[canonicalId] = Array.isArray(cart) ? cart : [];
  try {
    localStorage.setItem(STORAGE_KEY_USER_CARTS, JSON.stringify(map));
  } catch (err) {
    console.error('Failed to save customer cart:', err);
  }
}

/**
 * Clears the customer's saved cart from storage.
 */
export function clearUserCart(userId?: string | null): void {
  const canonicalId = toCanonicalUserId(userId);
  if (!canonicalId || typeof window === 'undefined') {
    return;
  }
  const map = getAllUserCartsMap();
  delete map[canonicalId];
  try {
    localStorage.setItem(STORAGE_KEY_USER_CARTS, JSON.stringify(map));
  } catch (err) {
    console.error('Failed to clear customer cart:', err);
  }
}
