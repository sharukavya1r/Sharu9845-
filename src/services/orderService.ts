import { Order, CartItem } from '../types';
import { ALL_PRODUCTS } from '../data/products';
import { calculateDeliveryCharge } from '../config/deliveryConfig';
import { toCanonicalUserId } from '../utils/userUtils';

const STORAGE_KEY_USER_ORDERS = 'quickbasket_orders_by_user';
const LEGACY_STORAGE_KEY = 'quickbasket_orders_db';

/**
 * Loads all orders partitioned strictly by authenticated customer ID.
 * Maps userId -> Order[]
 */
export function getAllUserOrdersMap(): Record<string, Order[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER_ORDERS);
    const map: Record<string, Order[]> = raw ? JSON.parse(raw) : {};

    // One-time safe migration of legacy database entries to their respective userIds
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      try {
        const legacyList: Order[] = JSON.parse(legacyRaw);
        if (Array.isArray(legacyList)) {
          for (const ord of legacyList) {
            // Only migrate if order has an explicit userId
            if (ord && ord.userId && ord.userId !== 'verified_user') {
              const uId = ord.userId.trim();
              if (!map[uId]) map[uId] = [];
              if (!map[uId].some((existing) => existing.id === ord.id)) {
                map[uId].push(ord);
              }
            }
          }
        }
      } catch (e) {
        console.warn('Legacy orders migration warning:', e);
      }
      // Remove legacy shared DB so unassigned or previous orders cannot be leaked
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      localStorage.setItem(STORAGE_KEY_USER_ORDERS, JSON.stringify(map));
    }

    return map && typeof map === 'object' ? map : {};
  } catch (err) {
    console.error('Failed to read user orders from storage:', err);
    return {};
  }
}

/**
 * Saves customer orders dictionary to persistent storage.
 */
export function saveAllUserOrdersMap(map: Record<string, Order[]>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_USER_ORDERS, JSON.stringify(map));
  } catch (err) {
    console.error('Failed to save user orders map:', err);
  }
}

/**
 * Gets orders belonging strictly to the specified authenticated customer ID.
 * If userId is empty or user is unauthenticated, returns an empty array.
 * Customer B will NEVER receive Customer A's orders.
 */
export function getUserOrders(userId?: string): Order[] {
  const canonicalId = toCanonicalUserId(userId);
  if (!canonicalId || typeof window === 'undefined') {
    return [];
  }
  const map = getAllUserOrdersMap();
  const list = map[canonicalId];
  return Array.isArray(list) ? list : [];
}

/**
 * Saves orders strictly for the specified authenticated customer ID.
 */
export function saveUserOrders(userId: string, orders: Order[]): void {
  const canonicalId = toCanonicalUserId(userId);
  if (!canonicalId || typeof window === 'undefined') return;
  const map = getAllUserOrdersMap();
  map[canonicalId] = Array.isArray(orders) ? orders : [];
  saveAllUserOrdersMap(map);
}

/**
 * Backward compatibility helper for legacy callers.
 * If called with a userId, returns that user's orders.
 * If called without a userId, returns [] to guarantee no data leakage.
 */
export function getStoredOrders(userId?: string): Order[] {
  if (!userId) return [];
  return getUserOrders(userId);
}

/**
 * Backward compatibility helper for legacy callers.
 */
export function saveStoredOrders(orders: Order[], userId?: string): void {
  if (!userId) return;
  saveUserOrders(userId, orders);
}

/**
 * Dynamically computes lifecycle progression for an order based on real elapsed time
 * (e.g., 0-1.5m = Confirmed, 1.5-4m = Preparing, 4-8m = Out for Delivery, 8m+ = Delivered).
 * Updates actual status, delivered timestamp, and real-time ETA.
 */
export function calculateDynamicOrderStatus(order: Order): Order {
  if (order.status === 'delivered' || order.status === 'cancelled') {
    return order;
  }

  const now = Date.now();
  const elapsedMinutes = (now - order.orderTimestamp) / (60 * 1000);

  let updatedStatus: Order['status'] = order.status;
  let updatedRider = order.rider;
  let deliveredTimestamp = order.deliveredTimestamp;

  if (elapsedMinutes >= 10) {
    updatedStatus = 'delivered';
    deliveredTimestamp = deliveredTimestamp || order.orderTimestamp + 10 * 60 * 1000;
  } else if (elapsedMinutes >= 4.5) {
    updatedStatus = 'out_for_delivery';
    if (!updatedRider) {
      updatedRider = {
        name: 'Suresh Gowda',
        phone: '+91 94801 88321',
        vehicle: 'Hero Electric (KA-18-EQ-4421)',
        currentLocation: {
          lat: 13.7165,
          lng: 75.6412,
        },
      };
    }
  } else if (elapsedMinutes >= 1.5) {
    updatedStatus = 'packing';
  } else {
    updatedStatus = 'confirmed';
  }

  return {
    ...order,
    status: updatedStatus,
    rider: updatedRider,
    deliveredTimestamp,
  };
}

/**
 * Creates and persists a real order placed by the authenticated user.
 * Strictly associates order with the authenticated customer's user ID.
 */
export function createNewOrder(params: {
  userId: string;
  items: CartItem[];
  deliveryAddress: string;
  paymentMethod: 'cod' | 'upi' | 'card';
  deliveryFee?: number;
  distanceKm?: number;
}): Order {
  const canonicalUserId = toCanonicalUserId(params.userId);
  if (!canonicalUserId) {
    throw new Error('Authenticated customer ID is required to place an order.');
  }
  const cleanUserId = canonicalUserId;
  const now = Date.now();
  const actualItemsCost = params.items.reduce(
    (acc, it) => acc + it.product.price * it.quantity,
    0
  );

  const totalMrp = params.items.reduce(
    (acc, it) => acc + (it.product.mrp || it.product.price) * it.quantity,
    0
  );
  const discount = Math.max(0, totalMrp - actualItemsCost);

  let deliveryFee = 0;
  if (typeof params.deliveryFee === 'number') {
    deliveryFee = params.deliveryFee;
  } else if (typeof params.distanceKm === 'number') {
    const calculated = calculateDeliveryCharge(params.distanceKm);
    if (calculated !== null) {
      deliveryFee = calculated;
    }
  }

  const itemTotal = totalMrp;
  const totalAmount = actualItemsCost + deliveryFee;

  const dateObj = new Date(now);
  const orderTime = `${dateObj.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })}, ${dateObj.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })}`;

  const randomSeq = Math.floor(100000 + Math.random() * 900000);
  const newOrder: Order = {
    id: `QB-${randomSeq}`,
    userId: cleanUserId,
    items: [...params.items],
    itemTotal,
    discount,
    deliveryFee,
    totalAmount,
    orderTimestamp: now,
    createdAt: now,
    orderTime,
    status: 'confirmed',
    estimatedDeliveryTimestamp: now + 10 * 60 * 1000,
    deliveryAddress: params.deliveryAddress,
    rider: null,
    paymentMethod: params.paymentMethod,
  };

  const existingOrders = getUserOrders(cleanUserId);
  const updated = [newOrder, ...existingOrders];
  saveUserOrders(cleanUserId, updated);

  return newOrder;
}

/**
 * Checks product availability and current catalog price for reordering.
 */
export function checkReorderItems(items: CartItem[]): {
  availableItems: CartItem[];
  unavailableItems: CartItem[];
} {
  const availableItems: CartItem[] = [];
  const unavailableItems: CartItem[] = [];

  for (const item of items) {
    const liveProduct = ALL_PRODUCTS.find((p) => p.id === item.product.id);
    if (liveProduct && liveProduct.inStock !== false) {
      availableItems.push({
        product: liveProduct,
        quantity: item.quantity,
      });
    } else {
      unavailableItems.push(item);
    }
  }

  return { availableItems, unavailableItems };
}

/**
 * Updates an order's status to 'cancelled' in persistent customer-isolated storage
 */
export function cancelOrder(orderId: string, userId?: string): boolean {
  try {
    const map = getAllUserOrdersMap();
    let found = false;
    const targetUserId = toCanonicalUserId(userId);

    if (targetUserId && map[targetUserId]) {
      const targetIdx = map[targetUserId].findIndex((o) => o.id === orderId);
      if (targetIdx >= 0) {
        map[targetUserId][targetIdx].status = 'cancelled';
        found = true;
      }
    } else {
      for (const uid of Object.keys(map)) {
        const targetIdx = map[uid].findIndex((o) => o.id === orderId);
        if (targetIdx >= 0) {
          map[uid][targetIdx].status = 'cancelled';
          found = true;
          break;
        }
      }
    }

    if (found) {
      saveAllUserOrdersMap(map);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to cancel order:', err);
    return false;
  }
}

/**
 * Saves a star rating (1-5) and optional text comment/tags for a delivered order
 */
export function updateOrderRating(
  orderId: string,
  rating: number,
  feedbackComment?: string,
  feedbackTags?: string[],
  userId?: string
): boolean {
  try {
    const map = getAllUserOrdersMap();
    let found = false;
    const targetUserId = toCanonicalUserId(userId);

    if (targetUserId && map[targetUserId]) {
      const targetIdx = map[targetUserId].findIndex((o) => o.id === orderId);
      if (targetIdx >= 0) {
        map[targetUserId][targetIdx].rating = rating;
        if (feedbackComment !== undefined) {
          map[targetUserId][targetIdx].feedbackComment = feedbackComment;
        }
        if (feedbackTags !== undefined) {
          map[targetUserId][targetIdx].feedbackTags = feedbackTags;
        }
        found = true;
      }
    } else {
      for (const uid of Object.keys(map)) {
        const targetIdx = map[uid].findIndex((o) => o.id === orderId);
        if (targetIdx >= 0) {
          map[uid][targetIdx].rating = rating;
          if (feedbackComment !== undefined) {
            map[uid][targetIdx].feedbackComment = feedbackComment;
          }
          if (feedbackTags !== undefined) {
            map[uid][targetIdx].feedbackTags = feedbackTags;
          }
          found = true;
          break;
        }
      }
    }

    if (found) {
      saveAllUserOrdersMap(map);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to update order rating & feedback:', err);
    return false;
  }
}

/**
 * Saves full post-delivery feedback with rating, comment, and tags
 */
export function updateOrderFeedback(
  orderId: string,
  rating: number,
  feedbackComment: string,
  feedbackTags?: string[],
  userId?: string
): boolean {
  return updateOrderRating(orderId, rating, feedbackComment, feedbackTags, userId);
}

/**
 * Marks an order as delivered in persistent storage
 */
export function markOrderDelivered(orderId: string, userId?: string): boolean {
  try {
    const map = getAllUserOrdersMap();
    let found = false;
    const targetUserId = toCanonicalUserId(userId);

    if (targetUserId && map[targetUserId]) {
      const targetIdx = map[targetUserId].findIndex((o) => o.id === orderId);
      if (targetIdx >= 0) {
        map[targetUserId][targetIdx].status = 'delivered';
        map[targetUserId][targetIdx].deliveredTimestamp = Date.now();
        found = true;
      }
    } else {
      for (const uid of Object.keys(map)) {
        const targetIdx = map[uid].findIndex((o) => o.id === orderId);
        if (targetIdx >= 0) {
          map[uid][targetIdx].status = 'delivered';
          map[uid][targetIdx].deliveredTimestamp = Date.now();
          found = true;
          break;
        }
      }
    }

    if (found) {
      saveAllUserOrdersMap(map);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to mark order as delivered:', err);
    return false;
  }
}
