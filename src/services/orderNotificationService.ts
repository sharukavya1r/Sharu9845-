/**
 * QuickBasket Order Notification Service
 * Permission-aware service that subscribes users to browser notifications for order status updates.
 * Guarantees permission is only requested after a successful order placement (or explicit user opt-in).
 */

import { Order } from '../types';
import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  sendBrowserNotification,
  PermissionStatusResult,
} from '../utils/permissionManager';
import { calculateDynamicOrderStatus } from './orderService';

const STORAGE_KEY_NOTIFIED_EVENTS = 'quickbasket_notified_order_events';
const STORAGE_KEY_SUBSCRIBED_ORDERS = 'quickbasket_subscribed_order_ids';
const STORAGE_KEY_NOTIFICATION_PREF = 'quickbasket_order_notifications_enabled';

/**
 * Gets the set of status events already dispatched to prevent spamming duplicate notifications.
 */
function getNotifiedEvents(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTIFIED_EVENTS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Saves a dispatched event key (e.g. `QB-123456:out_for_delivery`) with a timestamp.
 */
function markEventAsNotified(eventKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    const map = getNotifiedEvents();
    map[eventKey] = Date.now();
    localStorage.setItem(STORAGE_KEY_NOTIFIED_EVENTS, JSON.stringify(map));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Gets all order IDs that the user has explicitly or automatically subscribed to.
 */
export function getSubscribedOrderIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SUBSCRIBED_ORDERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Adds an order ID to the active notification subscription list.
 */
export function subscribeOrderId(orderId: string): void {
  if (typeof window === 'undefined' || !orderId) return;
  try {
    const list = getSubscribedOrderIds();
    if (!list.includes(orderId)) {
      list.push(orderId);
      localStorage.setItem(STORAGE_KEY_SUBSCRIBED_ORDERS, JSON.stringify(list));
    }
  } catch {
    // Ignore
  }
}

/**
 * Removes an order ID from the subscription list.
 */
export function unsubscribeOrderId(orderId: string): void {
  if (typeof window === 'undefined' || !orderId) return;
  try {
    const list = getSubscribedOrderIds().filter((id) => id !== orderId);
    localStorage.setItem(STORAGE_KEY_SUBSCRIBED_ORDERS, JSON.stringify(list));
  } catch {
    // Ignore
  }
}

/**
 * Checks whether an order is currently subscribed to notifications.
 */
export function isOrderSubscribed(orderId: string): boolean {
  const currentStatus = getNotificationPermissionStatus();
  if (currentStatus !== 'granted') return false;
  const list = getSubscribedOrderIds();
  return list.includes(orderId);
}

/**
 * Returns user's high-level order notification preference.
 */
export function isOrderNotificationEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const pref = localStorage.getItem(STORAGE_KEY_NOTIFICATION_PREF);
  return pref === null ? true : pref === 'true';
}

/**
 * Formats a notification payload for a given order lifecycle status.
 */
function getStatusNotificationContent(order: Order, status: Order['status']): {
  title: string;
  body: string;
} {
  const orderTag = order.id;
  const itemCount = order.items.reduce((acc, item) => acc + item.quantity, 0);

  switch (status) {
    case 'confirmed':
      return {
        title: `✅ Order Confirmed (${orderTag})`,
        body: `Your order of ${itemCount} item${itemCount > 1 ? 's' : ''} is confirmed! Estimated arrival in ~10 mins at Lakkavalli.`,
      };
    case 'packing':
      return {
        title: `📦 Packing Items (${orderTag})`,
        body: 'Fresh vegetables and groceries are now being packed at Lakkavalli Hub.',
      };
    case 'out_for_delivery': {
      const riderName = order.rider?.name || 'Suresh Gowda';
      return {
        title: `🛵 Out for Delivery (${orderTag})`,
        body: `${riderName} is on the way to your location. Keep your phone nearby!`,
      };
    }
    case 'delivered':
      return {
        title: `🎉 Order Delivered (${orderTag})`,
        body: 'Your QuickBasket order has arrived safely. Thank you for shopping local!',
      };
    case 'cancelled':
      return {
        title: `⚠️ Order Cancelled (${orderTag})`,
        body: 'Your QuickBasket order was cancelled. Any refund has been initiated.',
      };
    default:
      return {
        title: `QuickBasket Order Update (${orderTag})`,
        body: `Order status is now ${status}.`,
      };
  }
}

/**
 * Sends a notification for a specific order status update if permitted and not already notified.
 */
export function notifyOrderStatusUpdate(
  order: Order,
  status: Order['status']
): boolean {
  const permission = getNotificationPermissionStatus();
  if (permission !== 'granted') {
    return false;
  }

  const eventKey = `${order.id}:${status}`;
  const notifiedEvents = getNotifiedEvents();
  if (notifiedEvents[eventKey]) {
    // Already notified for this status
    return false;
  }

  const content = getStatusNotificationContent(order, status);
  const success = sendBrowserNotification(content.title, {
    body: content.body,
    tag: `quickbasket-order-${order.id}`,
    icon: '/favicon.ico',
  });

  if (success) {
    markEventAsNotified(eventKey);
  }
  return success;
}

/**
 * Subscribes a user to browser notifications strictly after a successful order placement.
 * Requests notification permission from the browser ONLY at this natural completion moment.
 *
 * @param order The newly created Order object
 * @returns Promise<PermissionStatusResult>
 */
export async function handleOrderPlacedNotificationSubscription(
  order: Order
): Promise<PermissionStatusResult> {
  if (!order || !order.id) return 'unsupported';

  // Always mark the order as desired for subscriptions
  subscribeOrderId(order.id);
  localStorage.setItem(STORAGE_KEY_NOTIFICATION_PREF, 'true');

  const currentPermission = getNotificationPermissionStatus();

  // If already granted, immediately send the confirmation notification
  if (currentPermission === 'granted') {
    notifyOrderStatusUpdate(order, 'confirmed');
    return 'granted';
  }

  // If status is 'default', request permission now that the order placement succeeded
  if (currentPermission === 'default') {
    const result = await requestNotificationPermission();
    if (result === 'granted') {
      notifyOrderStatusUpdate(order, 'confirmed');
    }
    return result;
  }

  // If 'denied' or 'unsupported', handle silently without breaking user flow
  return currentPermission;
}

/**
 * Toggles subscription for a specific order. Requests permission if not yet granted.
 */
export async function toggleOrderNotification(
  order: Order,
  enable: boolean
): Promise<boolean> {
  if (!enable) {
    unsubscribeOrderId(order.id);
    return false;
  }

  const perm = await requestNotificationPermission();
  if (perm === 'granted') {
    subscribeOrderId(order.id);
    localStorage.setItem(STORAGE_KEY_NOTIFICATION_PREF, 'true');
    // Send immediate status update if active
    const dynamic = calculateDynamicOrderStatus(order);
    notifyOrderStatusUpdate(dynamic, dynamic.status);
    return true;
  }

  return false;
}

/**
 * Checks all active orders and sends real-time status transitions.
 * Can be called periodically from an active order watcher or poll interval.
 */
export function checkAndNotifyActiveOrders(orders: Order[]): void {
  const perm = getNotificationPermissionStatus();
  if (perm !== 'granted') return;

  const subscribedIds = getSubscribedOrderIds();
  if (!subscribedIds.length) return;

  for (const rawOrder of orders) {
    if (!subscribedIds.includes(rawOrder.id)) continue;

    const dynamicOrder = calculateDynamicOrderStatus(rawOrder);
    notifyOrderStatusUpdate(dynamicOrder, dynamicOrder.status);
  }
}

/**
 * Sets up a lightweight watcher that monitors active orders and triggers notifications on status changes.
 * Returns an unmount / cleanup function.
 */
export function startOrderStatusNotificationWatcher(
  getActiveOrders: () => Order[],
  intervalMs = 3000
): () => void {
  if (typeof window === 'undefined') return () => {};

  const intervalId = setInterval(() => {
    try {
      const orders = getActiveOrders();
      if (orders && orders.length > 0) {
        checkAndNotifyActiveOrders(orders);
      }
    } catch (err) {
      console.warn('Error during order status notification check:', err);
    }
  }, intervalMs);

  return () => {
    clearInterval(intervalId);
  };
}
