import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Bike,
  PackageCheck,
  Home,
  MapPin,
  ChevronRight,
  ShoppingBag,
  RotateCcw,
  AlertCircle,
  X,
  Navigation,
  Sparkles,
  Search,
  Plus,
  Minus,
  Check,
  Calendar,
  Filter,
  ShoppingCart,
  Star,
  Ban,
  Zap,
  Boxes,
  ShieldCheck,
  ScanLine,
  Layers,
  MessageSquare,
  ThumbsUp,
  Heart,
  Smile,
  Send,
} from 'lucide-react';
import { Order, CartItem, Product } from '../types';
import { OrderRating } from './OrderRating';
import { PostDeliveryFeedbackModal } from './PostDeliveryFeedbackModal';
import { RealTimeOrderTracker } from './RealTimeOrderTracker';
import {
  calculateDynamicOrderStatus,
  checkReorderItems,
  cancelOrder,
  updateOrderRating,
  updateOrderFeedback,
} from '../services/orderService';
import {
  vibrateAddToCart,
  vibrateFeedback,
  vibrateSuccess,
} from '../utils/haptics';
import { useLanguage } from '../i18n';
import { useAuthGuard } from './AuthGuard';

interface OrdersPageProps {
  orders: Order[];
  cartItems: CartItem[];
  userPhone?: string;
  userId?: string;
  isLoggedIn?: boolean;
  onBackToHome: () => void;
  onOpenLoginModal?: () => void;
  onPlaceOrderFromCart?: () => void;
  onReorder?: (items: CartItem[]) => void;
  onQuickAddItem?: (product: Product, quantity?: number) => void;
  onOrdersChange?: (orders: Order[]) => void;
}

export type DateRangeFilter = 'all' | 'today' | 'last7days' | 'last30days';

/**
 * Helper to compute and format the Expected Delivery timestamp
 * (Calculated strictly by adding 10 minutes to the order creation timestamp)
 */
export function getExpectedDeliveryTimeString(order: Order): string {
  const createdAtMs = order.createdAt || order.orderTimestamp;
  const expectedTimestamp = createdAtMs + 10 * 60 * 1000;
  const dateObj = new Date(expectedTimestamp);

  return dateObj.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export const OrdersPage: React.FC<OrdersPageProps> = ({
  orders,
  cartItems,
  userPhone,
  userId,
  isLoggedIn = false,
  onBackToHome,
  onOpenLoginModal,
  onPlaceOrderFromCart,
  onReorder,
  onQuickAddItem,
  onOrdersChange,
}) => {
  const { t } = useLanguage();
  // Search query for filtering orders by product name or order details
  const [orderSearchQuery, setOrderSearchQuery] = useState('');

  // Date range filter
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>('all');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  // Selected order for full Details / Tracking modal
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);

  // Selected order for interactive Reorder modal (customizing quantities before adding to cart)
  const [reorderingOrder, setReorderingOrder] = useState<Order | null>(null);

  // Selected order for Cancellation Confirmation Modal
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);

  // Selected order for Post-Delivery Feedback Modal
  const [feedbackModalOrder, setFeedbackModalOrder] = useState<Order | null>(null);
  const promptedFeedbackOrderIdsRef = React.useRef<Set<string>>(new Set());

  // Confirmation modal/alert before adding full reorder items to cart
  const [pendingConfirmationItems, setPendingConfirmationItems] = useState<{
    items: CartItem[];
    orderId: string;
  } | null>(null);

  // Notification toast
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'warning' | 'info';
  } | null>(null);

  // Register in-memory cleaner for session purge
  useAuthGuard({
    isLoggedIn,
    userId: userId || userPhone,
    onClearMemory: () => {
      setOrderSearchQuery('');
      setDateRangeFilter('all');
      setIsFilterDropdownOpen(false);
      setSelectedOrderDetails(null);
      setReorderingOrder(null);
      setOrderToCancel(null);
      setFeedbackModalOrder(null);
      setPendingConfirmationItems(null);
      setNotification(null);
    },
  });

  // Periodic tick (every 1 second) to dynamically calculate real order status and live countdown
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update dynamic statuses for all orders based on real elapsed time
  const dynamicOrders = useMemo(() => {
    return orders.map((ord) => calculateDynamicOrderStatus(ord));
  }, [orders, tick]);

  // Auto-trigger post-delivery feedback modal when an order is marked or becomes 'delivered' and hasn't been reviewed yet
  useEffect(() => {
    const unratedDelivered = dynamicOrders.find(
      (o) =>
        o.status === 'delivered' &&
        !o.rating &&
        !promptedFeedbackOrderIdsRef.current.has(o.id)
    );

    if (unratedDelivered && !feedbackModalOrder) {
      promptedFeedbackOrderIdsRef.current.add(unratedDelivered.id);
      const timer = setTimeout(() => {
        setFeedbackModalOrder(unratedDelivered);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [dynamicOrders, feedbackModalOrder]);

  // Filter orders by product name, date string, or order date range
  const filteredOrders = useMemo(() => {
    const query = orderSearchQuery.trim().toLowerCase();
    const now = Date.now();

    return dynamicOrders.filter((order) => {
      const createdAtMs = order.createdAt || order.orderTimestamp;

      // 1. Date Range Filter
      if (dateRangeFilter === 'today') {
        const orderDate = new Date(createdAtMs);
        const todayDate = new Date(now);
        const isSameDay =
          orderDate.getDate() === todayDate.getDate() &&
          orderDate.getMonth() === todayDate.getMonth() &&
          orderDate.getFullYear() === todayDate.getFullYear();
        if (!isSameDay) return false;
      } else if (dateRangeFilter === 'last7days') {
        const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
        if (createdAtMs < sevenDaysAgo) return false;
      } else if (dateRangeFilter === 'last30days') {
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
        if (createdAtMs < thirtyDaysAgo) return false;
      }

      // 2. Text Search Query (Product Name, Category, Date, Order ID)
      if (!query) return true;

      if (order.id.toLowerCase().includes(query)) return true;
      if (order.orderTime.toLowerCase().includes(query)) return true;
      if (order.deliveryAddress.toLowerCase().includes(query)) return true;

      // Product names or categories in this order
      const matchesProduct = order.items.some(
        (item) =>
          item.product.name.toLowerCase().includes(query) ||
          item.product.category.toLowerCase().includes(query) ||
          (item.product.brand && item.product.brand.toLowerCase().includes(query))
      );

      return matchesProduct;
    });
  }, [dynamicOrders, orderSearchQuery, dateRangeFilter]);

  // Separate filtered into Active Orders and Past Delivered/Cancelled Orders
  const activeOrders = filteredOrders.filter(
    (o) => o.status === 'confirmed' || o.status === 'packing' || o.status === 'out_for_delivery'
  );
  const pastOrders = filteredOrders.filter(
    (o) => o.status === 'delivered' || o.status === 'cancelled'
  );

  const cartTotal = cartItems.reduce(
    (acc, it) => acc + it.product.price * it.quantity,
    0
  );

  // Open the interactive Reorder customizer modal
  const handleOpenReorderModal = (order: Order, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setReorderingOrder(order);
  };

  // Quick Add an individual item directly to current cart
  const handleQuickAdd = (product: Product, quantity = 1, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    vibrateAddToCart();

    if (onQuickAddItem) {
      onQuickAddItem(product, quantity);
    } else if (onReorder) {
      onReorder([{ product, quantity }]);
    }

    setNotification({
      message: `✓ Quick added ${product.name} (₹${product.price}) to your cart!`,
      type: 'success',
    });
    setTimeout(() => setNotification(null), 3500);
  };

  // Open Post-Delivery Feedback Modal
  const handleOpenFeedbackModal = (order: Order, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    vibrateFeedback();
    setFeedbackModalOrder(order);
  };

  // Handle Post-Delivery Feedback Submission
  const handleSubmitFeedback = (
    orderId: string,
    rating: number,
    comment: string,
    tags: string[]
  ) => {
    vibrateSuccess();
    updateOrderFeedback(orderId, rating, comment, tags);

    // Refresh orders in state
    const updated = orders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            rating,
            feedbackComment: comment,
            feedbackTags: tags,
          }
        : o
    );
    onOrdersChange?.(updated);

    // Also update selectedOrderDetails if open
    if (selectedOrderDetails && selectedOrderDetails.id === orderId) {
      setSelectedOrderDetails({
        ...selectedOrderDetails,
        rating,
        feedbackComment: comment,
        feedbackTags: tags,
      });
    }

    setFeedbackModalOrder(null);
    setNotification({
      message: `⭐ Thank you! Your review for Order #${orderId} was recorded.`,
      type: 'success',
    });
    setTimeout(() => setNotification(null), 3500);
  };

  // Handle direct star rating
  const handleRateOrder = (orderId: string, rating: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    vibrateFeedback();

    const targetOrder = dynamicOrders.find((o) => o.id === orderId);
    if (targetOrder) {
      setFeedbackModalOrder({ ...targetOrder, rating });
      return;
    }

    updateOrderRating(orderId, rating);
    const updated = orders.map((o) => (o.id === orderId ? { ...o, rating } : o));
    onOrdersChange?.(updated);

    if (selectedOrderDetails && selectedOrderDetails.id === orderId) {
      setSelectedOrderDetails({ ...selectedOrderDetails, rating });
    }

    setNotification({
      message: `⭐ Thank you for rating Order #${orderId} (${rating}/5 stars)!`,
      type: 'success',
    });
    setTimeout(() => setNotification(null), 3500);
  };

  // Handle Cancel Order Confirmation
  const handleConfirmCancel = () => {
    if (!orderToCancel) return;
    const orderId = orderToCancel.id;
    cancelOrder(orderId);

    const updated = orders.map((o) =>
      o.id === orderId ? { ...o, status: 'cancelled' as const } : o
    );
    onOrdersChange?.(updated);

    if (selectedOrderDetails && selectedOrderDetails.id === orderId) {
      setSelectedOrderDetails({ ...selectedOrderDetails, status: 'cancelled' });
    }

    setOrderToCancel(null);
    setNotification({
      message: `✕ Order #${orderId} has been cancelled successfully.`,
      type: 'info',
    });
    setTimeout(() => setNotification(null), 4000);
  };

  // Helper to format remaining real ETA
  const getEtaString = (order: Order) => {
    if (order.status === 'delivered' || order.status === 'cancelled') return null;
    if (!order.estimatedDeliveryTimestamp) return null;
    const now = Date.now();
    const diffMs = order.estimatedDeliveryTimestamp - now;
    if (diffMs <= 0) return 'Arriving any moment';
    const remainingMins = Math.ceil(diffMs / 60000);
    return `ETA ~${remainingMins} mins`;
  };

  const hasActiveFilters = orderSearchQuery.trim().length > 0 || dateRangeFilter !== 'all';

  const clearAllFilters = () => {
    setOrderSearchQuery('');
    setDateRangeFilter('all');
  };

  // Final execution of adding items into cart after user confirms alert/toast dialog
  const handleConfirmAddToCart = (itemsToAdd: CartItem[]) => {
    setPendingConfirmationItems(null);
    onReorder?.(itemsToAdd);

    const totalQty = itemsToAdd.reduce((sum, it) => sum + it.quantity, 0);
    const totalPrice = itemsToAdd.reduce((sum, it) => sum + it.product.price * it.quantity, 0);

    setNotification({
      message: `✓ Added ${totalQty} items (₹${totalPrice}) to your cart!`,
      type: 'success',
    });
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] pb-24 text-gray-900 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-16 left-4 right-4 z-50 max-w-sm mx-auto">
          <div
            className={`p-3.5 rounded-2xl shadow-xl border text-xs font-bold flex items-center justify-between gap-2 animate-in slide-in-from-top duration-200 ${
              notification.type === 'success'
                ? 'bg-emerald-900 text-white border-emerald-800'
                : notification.type === 'info'
                ? 'bg-gray-900 text-white border-gray-800'
                : 'bg-amber-900 text-white border-amber-800'
            }`}
          >
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="p-1 rounded-full hover:bg-white/20 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-2xs">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              id="orders-back-btn"
              onClick={onBackToHome}
              className="p-1.5 -ml-1.5 rounded-full hover:bg-gray-100 text-gray-700 active:scale-95 transition-all cursor-pointer"
              aria-label="Back to Home"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-extrabold text-gray-900 tracking-tight leading-tight">
                {t('orders.title')}
              </h1>
              <p className="text-[11px] text-emerald-800 font-semibold leading-tight">
                {isLoggedIn && userPhone ? `Account: ${userPhone}` : 'QuickBasket • Lakkavalli'}
              </p>
            </div>
          </div>

          {dynamicOrders.length > 0 && (
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              {dynamicOrders.length} {dynamicOrders.length === 1 ? 'Order' : 'Orders'}
            </span>
          )}
        </div>

        {/* Search and Date Filter Bar at top of Orders Page */}
        {dynamicOrders.length > 0 && (
          <div className="px-4 pb-3 pt-0 space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-emerald-700/70 pointer-events-none stroke-[2.2]" />
                <input
                  id="orders-search-input"
                  type="text"
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  placeholder="Filter by product name, e.g. Tomato, Milk, Onion..."
                  className="w-full bg-[#f3f7f4] text-gray-800 text-xs pl-9 pr-8 py-2 rounded-xl border border-emerald-100/80 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all placeholder:text-gray-400 font-medium"
                />
                {orderSearchQuery.length > 0 && (
                  <button
                    id="orders-clear-search-btn"
                    onClick={() => setOrderSearchQuery('')}
                    className="absolute right-2.5 text-gray-400 hover:text-gray-700 p-0.5 cursor-pointer"
                    aria-label="Clear order search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Date Filter Pill Button */}
              <div className="relative">
                <button
                  onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    dateRangeFilter !== 'all'
                      ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                  aria-label="Filter by date range"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {dateRangeFilter === 'today'
                      ? 'Today'
                      : dateRangeFilter === 'last7days'
                      ? 'Last 7 Days'
                      : dateRangeFilter === 'last30days'
                      ? 'Last 30 Days'
                      : 'Date'}
                  </span>
                </button>

                {/* Dropdown menu */}
                {isFilterDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 p-1.5 z-30 animate-in fade-in zoom-in-95">
                    <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 px-2 py-1">
                      Filter Date Range
                    </div>
                    {[
                      { id: 'all', label: 'All Orders' },
                      { id: 'today', label: 'Today' },
                      { id: 'last7days', label: 'Last 7 Days' },
                      { id: 'last30days', label: 'Last 30 Days' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setDateRangeFilter(opt.id as DateRangeFilter);
                          setIsFilterDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${
                          dateRangeFilter === opt.id
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {dateRangeFilter === opt.id && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Active filter chips */}
            {hasActiveFilters && (
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[11px] text-gray-500 font-medium">Active:</span>
                {orderSearchQuery && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md">
                    "{orderSearchQuery}"
                    <button onClick={() => setOrderSearchQuery('')} className="hover:text-black">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {dateRangeFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md">
                    {dateRangeFilter === 'today'
                      ? 'Today'
                      : dateRangeFilter === 'last7days'
                      ? 'Last 7 Days'
                      : 'Last 30 Days'}
                    <button onClick={() => setDateRangeFilter('all')} className="hover:text-black">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={clearAllFilters}
                  className="text-[11px] text-gray-400 hover:text-gray-700 underline ml-1 cursor-pointer font-medium"
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Body */}
      <div className="p-4 space-y-4 max-w-xl mx-auto">
        {/* If user has items in cart waiting to be confirmed */}
        {cartItems.length > 0 && onPlaceOrderFromCart && (
          <div className="bg-emerald-50 rounded-3xl p-4 border border-emerald-100 shadow-xs space-y-2.5">
            <div className="flex justify-between items-center text-xs font-black text-emerald-950">
              <span>Items in Your Basket ({cartItems.length})</span>
              <span className="text-emerald-800 text-sm font-black">₹{cartTotal}</span>
            </div>
            <p className="text-[11px] text-emerald-800 font-medium">
              Ready for quick 10-minute doorstep delivery in Lakkavalli
            </p>
            <button
              id="orders-page-checkout-btn"
              onClick={onPlaceOrderFromCart}
              className="w-full py-2.5 rounded-2xl bg-[#064e3b] hover:bg-[#043c2d] text-white text-xs font-black tracking-wide transition-all shadow-sm active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>CONFIRM & PLACE ORDER • ₹{cartTotal}</span>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        )}

        {/* DEDICATED VISUAL 'NO ORDERS FOUND' SCREEN WHEN USER HAS NO HISTORY */}
        {dynamicOrders.length === 0 ? (
          <div
            id="no-orders-found-screen"
            className="bg-white rounded-3xl p-8 sm:p-10 text-center border border-gray-100 shadow-xs space-y-5 mt-2 animate-in fade-in duration-300"
          >
            {/* Visual Icon Illustration */}
            <div className="relative w-20 h-20 mx-auto">
              <div className="w-20 h-20 rounded-3xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-100 shadow-xs">
                <ShoppingBag className="w-10 h-10 stroke-[1.7]" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#ea580c] text-white flex items-center justify-center shadow-sm">
                <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            </div>

            <div className="space-y-1.5 max-w-sm mx-auto">
              <h2 className="text-lg font-black text-gray-900 tracking-tight">
                No Orders Found
              </h2>
              <p className="text-xs text-gray-500 leading-relaxed">
                You haven't placed any orders yet. Fresh farm vegetables, dairy, and grocery staples can be delivered to your doorstep in Lakkavalli in 10 minutes.
              </p>
            </div>

            {/* Value Highlights */}
            <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto text-left py-1">
              <div className="bg-[#f3f7f4] p-2.5 rounded-2xl border border-emerald-100/60">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">Delivery</span>
                <span className="text-xs font-black text-gray-900">⚡ 10-Min Express</span>
              </div>
              <div className="bg-[#f3f7f4] p-2.5 rounded-2xl border border-emerald-100/60">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">Freshness</span>
                <span className="text-xs font-black text-gray-900">🌱 Direct from Farm</span>
              </div>
            </div>

            {/* Shop Now Primary Button */}
            <div className="pt-2 flex flex-col gap-2.5 max-w-xs mx-auto">
              <button
                id="no-orders-shop-now-btn"
                onClick={onBackToHome}
                className="w-full py-3 rounded-2xl bg-[#064e3b] text-white text-xs font-black tracking-wide shadow-md shadow-emerald-950/20 hover:bg-[#043c2d] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Shop Now</span>
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </button>

              {!isLoggedIn && onOpenLoginModal && (
                <button
                  onClick={onOpenLoginModal}
                  className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Log in to view past account orders
                </button>
              )}
            </div>
          </div>
        ) : filteredOrders.length === 0 ? (
          /* Search/Filter query returned zero results */
          <div className="bg-white rounded-3xl p-8 text-center border border-gray-100 shadow-xs space-y-4 mt-2 animate-in fade-in duration-200">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center mx-auto border border-gray-200">
              <Search className="w-7 h-7 stroke-[1.8]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-gray-900">No matching orders found</h3>
              <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                {orderSearchQuery && dateRangeFilter !== 'all'
                  ? `No orders matching "${orderSearchQuery}" within the selected date range.`
                  : orderSearchQuery
                  ? `We couldn't find any orders matching "${orderSearchQuery}".`
                  : `No orders placed within the selected date range.`}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
              <button
                onClick={onBackToHome}
                className="px-4 py-2 rounded-xl bg-[#064e3b] text-white text-xs font-bold hover:bg-[#043c2d] transition-colors cursor-pointer"
              >
                Shop Now
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* ACTIVE ORDERS SECTION */}
            {activeOrders.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    Active Orders ({activeOrders.length})
                  </span>
                </div>

                {activeOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onOpenDetails={() => setSelectedOrderDetails(order)}
                    onReorder={(e) => handleOpenReorderModal(order, e)}
                    onQuickAdd={(prod, qty, e) => handleQuickAdd(prod, qty, e)}
                    onRateOrder={(rating, e) => handleRateOrder(order.id, rating, e)}
                    onRequestCancel={(e) => {
                      if (e) e.stopPropagation();
                      setOrderToCancel(order);
                    }}
                    etaString={getEtaString(order)}
                  />
                ))}
              </div>
            )}

            {/* PAST ORDERS SECTION */}
            {pastOrders.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="px-1">
                  <span className="text-xs font-black text-gray-500 uppercase tracking-wider">
                    Past Orders ({pastOrders.length})
                  </span>
                </div>

                {pastOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onOpenDetails={() => setSelectedOrderDetails(order)}
                    onReorder={(e) => handleOpenReorderModal(order, e)}
                    onQuickAdd={(prod, qty, e) => handleQuickAdd(prod, qty, e)}
                    onRateOrder={(rating, e) => handleRateOrder(order.id, rating, e)}
                    onOpenFeedback={(e) => handleOpenFeedbackModal(order, e)}
                    onRequestCancel={(e) => {
                      if (e) e.stopPropagation();
                      setOrderToCancel(order);
                    }}
                    etaString={null}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* REAL ORDER DETAILS MODAL */}
      {selectedOrderDetails && (
        <OrderDetailsModal
          order={calculateDynamicOrderStatus(selectedOrderDetails)}
          onClose={() => setSelectedOrderDetails(null)}
          onReorder={(order) => {
            setSelectedOrderDetails(null);
            handleOpenReorderModal(order);
          }}
          onQuickAdd={(prod, qty) => handleQuickAdd(prod, qty)}
          onRateOrder={(rating) => handleRateOrder(selectedOrderDetails.id, rating)}
          onOpenFeedback={() => {
            const ord = selectedOrderDetails;
            setFeedbackModalOrder(ord);
          }}
          onRequestCancel={() => {
            const ord = selectedOrderDetails;
            setSelectedOrderDetails(null);
            setOrderToCancel(ord);
          }}
        />
      )}

      {/* POST-DELIVERY FEEDBACK & RATING MODAL */}
      {feedbackModalOrder && (
        <OrderRating
          isOpen={feedbackModalOrder !== null}
          order={calculateDynamicOrderStatus(feedbackModalOrder)}
          userId={userId}
          onClose={() => setFeedbackModalOrder(null)}
          onRatingSubmit={(updatedOrder) => {
            handleSubmitFeedback(
              updatedOrder.id,
              updatedOrder.rating || 5,
              updatedOrder.feedbackComment || '',
              updatedOrder.feedbackTags || []
            );
          }}
        />
      )}

      {/* INTERACTIVE REORDER MODAL (Adjust Quantities Before Moving to Cart) */}
      {reorderingOrder && (
        <ReorderAdjustModal
          order={reorderingOrder}
          onClose={() => setReorderingOrder(null)}
          onProceedToConfirmation={(itemsToAdd) => {
            const currentOrderId = reorderingOrder.id;
            setReorderingOrder(null);
            setPendingConfirmationItems({
              items: itemsToAdd,
              orderId: currentOrderId,
            });
          }}
        />
      )}

      {/* REORDER CONFIRMATION TOAST / MODAL DIALOG */}
      {pendingConfirmationItems && (
        <ReorderConfirmationAlert
          items={pendingConfirmationItems.items}
          orderId={pendingConfirmationItems.orderId}
          onConfirm={() => handleConfirmAddToCart(pendingConfirmationItems.items)}
          onCancel={() => setPendingConfirmationItems(null)}
        />
      )}

      {/* CANCEL ORDER CONFIRMATION MODAL */}
      {orderToCancel && (
        <CancelOrderModal
          order={orderToCancel}
          onConfirm={handleConfirmCancel}
          onClose={() => setOrderToCancel(null)}
        />
      )}

      {/* COPYRIGHT FOOTER */}
      <footer className="mt-8 mb-6 px-4 pt-6 pb-2 border-t border-emerald-100/80 text-center max-w-xl mx-auto space-y-1.5">
        <p className="text-[11px] sm:text-xs font-bold text-gray-700 tracking-tight">
          © 2026 Sharu Enterprises. All Rights Reserved.
        </p>
        <p className="text-[10px] sm:text-[11px] text-gray-500 font-normal leading-relaxed max-w-md mx-auto">
          All QukeBasket website and app content, including design, branding, graphics, text, layout, and other original materials, are protected by applicable copyright laws. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

// ==========================================
// COLOR-CODED STATUS BADGE HELPER COMPONENT
// Green for 'Delivered', Amber for 'Preparing', Blue for 'Out for Delivery', Red for 'Cancelled'
// ==========================================
export const OrderStatusBadge: React.FC<{ status: Order['status'] }> = ({ status }) => {
  switch (status) {
    case 'delivered':
      // GREEN BADGE for Delivered
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
          <span>Delivered</span>
        </span>
      );
    case 'out_for_delivery':
      // BLUE BADGE for Out for Delivery
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 animate-pulse">
          <Bike className="w-3 h-3 stroke-[2.5]" />
          <span>Out for Delivery</span>
        </span>
      );
    case 'packing':
      // AMBER BADGE for Preparing
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
          <PackageCheck className="w-3 h-3 stroke-[2.5]" />
          <span>Preparing</span>
        </span>
      );
    case 'cancelled':
      // RED BADGE for Cancelled
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
          <Ban className="w-3 h-3 stroke-[2.5]" />
          <span>Cancelled</span>
        </span>
      );
    case 'confirmed':
    default:
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200">
          <Check className="w-3 h-3 stroke-[2.5]" />
          <span>Order Confirmed</span>
        </span>
      );
  }
};

// ==========================================
// STAR RATING COMPONENT
// ==========================================
interface StarRatingInputProps {
  rating?: number;
  onRate: (stars: number, e?: React.MouseEvent) => void;
  size?: 'sm' | 'md';
}

const StarRatingInput: React.FC<StarRatingInputProps> = ({
  rating = 0,
  onRate,
  size = 'sm',
}) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const starSize = size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';

  return (
    <div
      className="flex items-center gap-1 bg-amber-50/80 px-2.5 py-1.5 rounded-xl border border-amber-200/80"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="text-[10px] font-extrabold text-amber-900 mr-0.5">
        {rating > 0 ? 'Your Rating:' : 'Rate Delivery:'}
      </span>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = (hoverRating !== null ? hoverRating : rating) >= star;
          return (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(null)}
              onClick={(e) => onRate(star, e)}
              className="p-0.5 text-amber-400 hover:text-amber-500 hover:scale-110 active:scale-95 transition-all cursor-pointer"
              aria-label={`Rate ${star} stars`}
            >
              <Star
                className={`${starSize} ${
                  isFilled ? 'fill-amber-400 text-amber-400' : 'text-gray-300 stroke-[1.8]'
                }`}
              />
            </button>
          );
        })}
      </div>
      {rating > 0 && (
        <span className="text-[10px] font-black text-amber-800 ml-1">
          {rating}/5
        </span>
      )}
    </div>
  );
};

// ==========================================
// SUB-COMPONENT: REAL ORDER CARD
// Includes:
// - Expected Delivery Timestamp (+10m from createdAt)
// - Star rating input for 'Delivered' orders
// - Quick Add buttons for individual items
// - Cancel Order button for 'Preparing' (or confirmed) orders
// ==========================================
interface OrderCardProps {
  order: Order;
  onOpenDetails: () => void;
  onReorder: (e: React.MouseEvent) => void;
  onQuickAdd: (product: Product, quantity: number, e: React.MouseEvent) => void;
  onRateOrder: (rating: number, e: React.MouseEvent) => void;
  onOpenFeedback?: (e: React.MouseEvent) => void;
  onRequestCancel: (e: React.MouseEvent) => void;
  etaString: string | null;
}

const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onOpenDetails,
  onReorder,
  onQuickAdd,
  onRateOrder,
  onOpenFeedback,
  onRequestCancel,
  etaString,
}) => {
  const isDelivered = order.status === 'delivered';
  const isCancelled = order.status === 'cancelled';
  const isPreparing = order.status === 'packing' || order.status === 'confirmed';
  const isActive = !isDelivered && !isCancelled;
  const expectedDeliveryTime = getExpectedDeliveryTimeString(order);

  return (
    <div
      onClick={onOpenDetails}
      className="bg-white rounded-3xl p-4 border border-gray-100 shadow-xs space-y-3.5 transition-all hover:border-emerald-200 cursor-pointer"
    >
      {/* Top row: Order ID, Date, Color-Coded Status Badge */}
      <div className="flex items-start justify-between pb-3 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-gray-900 tracking-tight">
              Order #{order.id}
            </span>
            <OrderStatusBadge status={order.status} />
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[11px] text-gray-400 font-medium">
              {order.orderTime}
            </span>
            {/* EXPECTED DELIVERY TIMESTAMP BADGE (+10 mins from createdAt) */}
            {!isCancelled && (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100/80">
                <Clock className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                <span>
                  {isDelivered ? 'Delivered by' : 'Expected Delivery:'} {expectedDeliveryTime}
                </span>
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-gray-400 block font-medium">Final Amount</span>
          <span
            className={`text-sm font-black ${
              isCancelled ? 'text-gray-400 line-through' : 'text-emerald-950'
            }`}
          >
            ₹{order.totalAmount}
          </span>
        </div>
      </div>

      {/* REAL-TIME ORDER TRACKING PROGRESS BAR & LIVE ETA VISUALIZATION */}
      <RealTimeOrderTracker
        order={order}
        compact={isDelivered}
        showRiderInfo={true}
        showStepIndicators={true}
      />

      {/* POST-DELIVERY FEEDBACK & RATING (Shown when order status is 'Delivered') */}
      {isDelivered && (
        <div
          className="bg-emerald-50/60 rounded-2xl p-3 border border-emerald-100/90 space-y-2 shadow-2xs"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <StarRatingInput
                rating={order.rating}
                onRate={(stars, e) => {
                  if (onOpenFeedback) {
                    onOpenFeedback(e as React.MouseEvent);
                  } else {
                    onRateOrder(stars, e as React.MouseEvent);
                  }
                }}
                size="sm"
              />
              {order.rating ? (
                <span className="text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                  Reviewed
                </span>
              ) : null}
            </div>

            <button
              onClick={(e) => onOpenFeedback?.(e)}
              className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-[#064e3b] bg-white hover:bg-emerald-100/80 px-2.5 py-1 rounded-xl border border-emerald-200 shadow-2xs active:scale-95 transition-all cursor-pointer"
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 shrink-0" />
              <span>{order.rating ? `Edit Rating (${order.rating}★)` : 'Rate Order'}</span>
            </button>
          </div>

          {/* Display feedback comment if present */}
          {order.feedbackComment && (
            <div className="bg-white/95 rounded-xl p-2 border border-emerald-100 text-[11px] text-gray-700 italic flex items-start gap-1.5">
              <span className="text-emerald-700 font-black not-italic text-xs">“</span>
              <span className="not-italic flex-1 text-gray-700 font-medium leading-tight">
                {order.feedbackComment}
              </span>
              <span className="text-emerald-700 font-black not-italic text-xs">”</span>
            </div>
          )}

          {/* Display feedback tags if present */}
          {order.feedbackTags && order.feedbackTags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {order.feedbackTags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-[10px] font-bold bg-white text-emerald-900 px-2 py-0.5 rounded-lg border border-emerald-200 shadow-2xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DELIVERY PARTNER (Only shown when rider is genuinely assigned) */}
      {order.rider && !isCancelled ? (
        <div className="bg-emerald-50/70 rounded-xl p-2.5 border border-emerald-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
              <Bike className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <span className="font-extrabold text-gray-900 block leading-tight">
                {order.rider.name}
              </span>
              <span className="text-[10px] text-emerald-800 font-medium">
                {order.rider.vehicle || 'Delivery Partner'} • {order.rider.phone}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
            Assigned
          </span>
        </div>
      ) : isActive ? (
        <div className="bg-gray-50 rounded-xl p-2 border border-gray-100 flex items-center gap-2 text-[11px] text-gray-500">
          <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span>Delivery partner assignment in progress</span>
        </div>
      ) : null}

      {/* ORDERED PRODUCTS PREVIEW (Real product images and QUICK ADD buttons) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 uppercase">
          <span>Items Ordered ({order.items.length})</span>
          <span className="text-emerald-700 font-semibold normal-case text-xs flex items-center gap-0.5">
            View Details <ChevronRight className="w-3 h-3" />
          </span>
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto py-1 no-scrollbar">
          {order.items.map((item, idx) => (
            <div
              key={`${item.product.id}-${idx}`}
              className="flex items-center justify-between gap-2 bg-gray-50 hover:bg-emerald-50/40 p-2 rounded-2xl border border-gray-100/90 shrink-0 min-w-[210px] transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-xl object-contain bg-white border border-gray-100 shrink-0 p-0.5"
                />
                <div className="min-w-0 pr-1">
                  <span className="text-[11px] font-extrabold text-gray-900 block truncate">
                    {item.product.name}
                  </span>
                  <span className="text-[10px] text-gray-500 block font-medium">
                    Qty: {item.quantity} • ₹{item.product.price}
                  </span>
                </div>
              </div>

              {/* QUICK ADD BUTTON: Directly re-adds individual item to current cart without modal */}
              <button
                type="button"
                onClick={(e) => onQuickAdd(item.product, 1, e)}
                className="px-2 py-1 bg-white hover:bg-[#064e3b] text-[#064e3b] hover:text-white border border-emerald-300/80 rounded-xl text-[10px] font-black flex items-center gap-0.5 shadow-2xs active:scale-90 transition-all shrink-0 cursor-pointer"
                title={`Quick Add ${item.product.name} to cart`}
              >
                <Plus className="w-3 h-3 stroke-[3]" />
                <span>Add</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER & ACTIONS (Cancel Order for Preparing, Reorder for all) */}
      <div className="pt-2 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
        <div className="text-[11px] text-gray-500 truncate max-w-[180px]">
          📍 {order.deliveryAddress}
        </div>

        <div className="flex items-center gap-2">
          {/* RATE ORDER BUTTON (For delivered items) */}
          {isDelivered && (
            <button
              type="button"
              onClick={(e) => {
                if (onOpenFeedback) {
                  onOpenFeedback(e);
                } else {
                  onRateOrder(order.rating || 5, e);
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 text-xs font-bold transition-all flex items-center gap-1 active:scale-95 cursor-pointer shadow-2xs"
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
              <span>{order.rating ? `Rate Order (${order.rating}★)` : 'Rate Order'}</span>
            </button>
          )}

          {/* CANCEL ORDER BUTTON (For orders still in 'Preparing' or 'Confirmed' status within first few mins) */}
          {isPreparing && (
            <button
              onClick={onRequestCancel}
              className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-all flex items-center gap-1 active:scale-95 cursor-pointer border border-red-200"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Cancel Order</span>
            </button>
          )}

          {/* REORDER BUTTON */}
          <button
            onClick={onReorder}
            className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#064e3b] text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reorder</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// SUB-COMPONENT: REAL STEPPER
// ==========================================
const DeliveryProgressStepper: React.FC<{
  status: Order['status'];
  etaString: string | null;
  expectedDeliveryTime?: string;
}> = ({ status, etaString, expectedDeliveryTime }) => {
  const stepIndex = {
    confirmed: 1,
    packing: 2,
    out_for_delivery: 3,
    delivered: 4,
    cancelled: 0,
  }[status];

  return (
    <div className="bg-emerald-50/50 rounded-2xl p-3 border border-emerald-100/60 space-y-2.5">
      <div className="flex items-center justify-between text-[11px] font-bold text-emerald-950">
        {etaString ? (
          <span className="flex items-center gap-1 text-[#ea580c]">
            <Clock className="w-3.5 h-3.5 stroke-[2.5] animate-pulse" />
            <span>{etaString}</span>
          </span>
        ) : (
          <span className="flex items-center gap-1 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Delivered</span>
          </span>
        )}
        {expectedDeliveryTime && (
          <span className="text-[10px] text-emerald-900 font-semibold bg-white px-2 py-0.5 rounded-full border border-emerald-100">
            Target: {expectedDeliveryTime}
          </span>
        )}
      </div>

      <div className="relative pt-1 pb-1">
        {/* Progress connecting bar */}
        <div className="absolute top-4 left-3 right-3 h-1 bg-gray-200 z-0">
          <div
            className="h-full bg-emerald-600 rounded-full transition-all duration-500"
            style={{
              width:
                stepIndex === 1
                  ? '0%'
                  : stepIndex === 2
                  ? '33%'
                  : stepIndex === 3
                  ? '66%'
                  : '100%',
            }}
          />
        </div>

        {/* 4 Steps with Color-Coded logic */}
        <div className="relative z-10 flex justify-between text-center">
          {/* 1. Confirmed */}
          <div className="flex flex-col items-center">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ring-4 ring-white shadow-xs ${
                stepIndex >= 1
                  ? 'bg-emerald-700 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span className="text-[9px] font-bold text-gray-700 mt-1">Confirmed</span>
          </div>

          {/* 2. Packing / Preparing (Amber accent) */}
          <div className="flex flex-col items-center">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ring-4 ring-white shadow-xs ${
                stepIndex === 2
                  ? 'bg-amber-500 text-white ring-amber-100'
                  : stepIndex > 2
                  ? 'bg-emerald-700 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              <PackageCheck className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span className="text-[9px] font-bold text-gray-700 mt-1">Preparing</span>
          </div>

          {/* 3. Out for Delivery (Blue accent) */}
          <div className="flex flex-col items-center">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ring-4 ring-white shadow-xs ${
                stepIndex === 3
                  ? 'bg-blue-600 text-white ring-blue-100 animate-bounce'
                  : stepIndex > 3
                  ? 'bg-emerald-700 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              <Bike className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span className="text-[9px] font-bold text-gray-700 mt-1">On the way</span>
          </div>

          {/* 4. Delivered (Green accent) */}
          <div className="flex flex-col items-center">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ring-4 ring-white shadow-xs ${
                stepIndex >= 4
                  ? 'bg-emerald-700 text-white ring-emerald-100'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              <Home className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span className="text-[9px] font-bold text-gray-700 mt-1">Delivered</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// SUB-COMPONENT: LIVE DYNAMIC PREPARING ANIMATION
// Real-time Dark Store packing animation that updates every 2.5 seconds
// to reflect the 10-minute delivery promise with item checks, picker status, and packing timer.
// ==========================================
const PREP_ACTIVITIES = [
  {
    step: 1,
    title: 'Picker Assigned',
    detail: 'Manoj at Station #3 (Lakkavalli Hub) scanned order items',
    badge: 'Picking Items',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: ScanLine,
  },
  {
    step: 2,
    title: 'Freshness Verification',
    detail: 'Inspecting harvest grade, batch dates & cold temperature',
    badge: '100% QC Passed',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: ShieldCheck,
  },
  {
    step: 3,
    title: 'Eco-Bagging & Chill Pack',
    detail: 'Sorting dairy & delicate produce into protective pouches',
    badge: 'Bagging in Progress',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: ShoppingBag,
  },
  {
    step: 4,
    title: 'Tamper-Proof Sealing',
    detail: 'Sealing insulated delivery tote with tamper-evident security tape',
    badge: 'Bag Sealed',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: PackageCheck,
  },
  {
    step: 5,
    title: 'Dispatch Bay Handover',
    detail: 'Parcel at Bay #4 ready for Express Delivery Rider',
    badge: 'Rider Pickup',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Bike,
  },
];

interface PreparingAnimationProps {
  order: Order;
  compact?: boolean;
}

export const PreparingAnimation: React.FC<PreparingAnimationProps> = ({
  order,
  compact = false,
}) => {
  const createdAtMs = order.createdAt || order.orderTimestamp;
  const [tickerIndex, setTickerIndex] = useState(0);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  // Live timer tick every second and rotating step update every 2.5 seconds
  useEffect(() => {
    const calcElapsed = () => {
      const now = Date.now();
      return Math.max(0, Math.floor((now - createdAtMs) / 1000));
    };
    setSecondsElapsed(calcElapsed());

    const interval = setInterval(() => {
      setSecondsElapsed(calcElapsed());
      setTickerIndex((prev) => (prev + 1) % PREP_ACTIVITIES.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [createdAtMs]);

  // Dark store packing takes max 3.5 minutes (210s) out of the 10-minute promise
  const totalPrepPromiseSec = 210;
  const prepProgressRatio = Math.min(0.96, Math.max(0.15, secondsElapsed / totalPrepPromiseSec));
  const prepPercent = Math.round(prepProgressRatio * 100);

  const totalItemsCount = order.items.reduce((sum, it) => sum + it.quantity, 0);
  const packedItemsCount = Math.min(
    totalItemsCount,
    Math.max(1, Math.round(totalItemsCount * prepProgressRatio))
  );

  const currentActivity = PREP_ACTIVITIES[tickerIndex % PREP_ACTIVITIES.length];
  const ActivityIcon = currentActivity.icon;

  // Formatted prep timer mm:ss
  const mins = Math.floor(secondsElapsed / 60);
  const secs = secondsElapsed % 60;
  const timerStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const remainingPrepSec = Math.max(10, totalPrepPromiseSec - secondsElapsed);
  const remMins = Math.floor(remainingPrepSec / 60);
  const remSecs = remainingPrepSec % 60;
  const remainingPrepStr =
    remMins > 0 ? `${remMins}m ${remSecs > 0 ? `${remSecs}s` : ''}` : `${remSecs}s`;

  return (
    <div
      className={`bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-amber-50/90 rounded-2xl border border-amber-200/90 ${
        compact ? 'p-3' : 'p-4'
      } space-y-2.5 shadow-2xs transition-all`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header: Live Preparing Status & 10-Min Fast-Track Badge */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 font-black text-amber-950">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-600"></span>
          </span>
          <span className="text-[11px] uppercase tracking-wide flex items-center gap-1">
            <span>Store Packing in Progress</span>
            <Sparkles className="w-3 h-3 text-amber-600 animate-spin" style={{ animationDuration: '4s' }} />
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-300/80 flex items-center gap-1">
            <Zap className="w-2.5 h-2.5 fill-amber-600 text-amber-600" />
            10-Min Fast-Track
          </span>
        </div>
      </div>

      {/* Live Animated Progress Bar with Floating Packing Box Marker */}
      <div className="space-y-1">
        <div className="relative pt-3 pb-1">
          {/* Packing Box Icon marker positioned along the track */}
          <div
            className="absolute top-0 -translate-x-1/2 transition-all duration-700 ease-out z-10 flex flex-col items-center"
            style={{ left: `${prepPercent}%` }}
          >
            <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md animate-pulse">
              <Boxes className="w-3 h-3 stroke-[2.2]" />
            </div>
          </div>

          {/* Track bar */}
          <div className="h-2 w-full bg-amber-100 rounded-full overflow-hidden border border-amber-200/70 relative">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${prepPercent}%` }}
            />
          </div>
        </div>

        {/* Waypoints: Dark Store Rack to Dispatch Bay */}
        <div className="flex justify-between text-[10px] font-bold text-gray-500 px-0.5">
          <span className="flex items-center gap-0.5 text-gray-600">
            <Boxes className="w-2.5 h-2.5 text-gray-400" />
            Station #3 (Lakkavalli)
          </span>
          <span className="text-amber-900 font-extrabold">
            {prepPercent}% Packed ({packedItemsCount}/{totalItemsCount} items)
          </span>
          <span className="flex items-center gap-0.5 text-emerald-800">
            <Bike className="w-2.5 h-2.5 text-emerald-600" />
            Dispatch Gate
          </span>
        </div>
      </div>

      {/* Dynamic Activity Feed updating every few seconds */}
      <div className="bg-white/95 p-2.5 rounded-xl border border-amber-200/80 shadow-2xs flex items-center gap-2.5 transition-all">
        <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
          <ActivityIcon className="w-4 h-4 stroke-[2.2] animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-black text-gray-900 truncate">
              {currentActivity.title}
            </span>
            <span
              className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border ${currentActivity.badgeColor} shrink-0`}
            >
              {currentActivity.badge}
            </span>
          </div>
          <p className="text-[10px] text-gray-600 leading-tight truncate">
            {currentActivity.detail}
          </p>
        </div>
      </div>

      {/* Metric Badges: Packing Timer vs 10-Min Promise Allocation */}
      <div className="grid grid-cols-2 gap-2 pt-0.5">
        <div className="bg-white/95 p-2 rounded-xl border border-amber-100 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="text-[10px] text-gray-500 font-semibold">Prep Elapsed:</span>
          </div>
          <span className="text-xs font-black text-gray-900 font-mono">{timerStr}</span>
        </div>

        <div className="bg-white/95 p-2 rounded-xl border border-amber-100 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-[10px] text-gray-500 font-semibold">Ready in:</span>
          </div>
          <span className="text-xs font-black text-emerald-950">~{remainingPrepStr}</span>
        </div>
      </div>

      {/* Expanded view for Modal / Live Tracking: Real items packing checklist */}
      {!compact && order.items && order.items.length > 0 && (
        <div className="pt-2 border-t border-amber-100/80 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-gray-700">
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3 text-amber-600" />
              Basket Verification Live
            </span>
            <span className="text-[10px] font-extrabold text-amber-800">
              {packedItemsCount} of {totalItemsCount} packed
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
            {order.items.map((it, idx) => {
              const isPacked = idx < packedItemsCount;
              return (
                <div
                  key={idx}
                  className={`p-1.5 rounded-lg border text-[11px] flex items-center justify-between ${
                    isPacked
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                      : 'bg-white border-gray-200 text-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <img
                      src={it.product.image}
                      alt={it.product.name}
                      className="w-5 h-5 rounded object-cover shrink-0"
                    />
                    <span className="truncate font-semibold">{it.product.name}</span>
                  </div>
                  <span className="text-[9px] font-bold shrink-0 ml-1">
                    {isPacked ? (
                      <span className="text-emerald-700 flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5 stroke-[3]" /> Packed
                      </span>
                    ) : (
                      <span className="text-amber-600 animate-pulse">Scanning...</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// SUB-COMPONENT: OUT FOR DELIVERY PROGRESS BAR
// Visualizes estimated remaining distance/time using dummy calculation based on the 10-minute delivery promise
// ==========================================
interface OutForDeliveryProgressBarProps {
  order: Order;
  compact?: boolean;
}

export const OutForDeliveryProgressBar: React.FC<OutForDeliveryProgressBarProps> = ({
  order,
  compact = false,
}) => {
  const createdAtMs = order.createdAt || order.orderTimestamp;
  const now = Date.now();
  const elapsedMs = Math.max(0, now - createdAtMs);
  const totalPromiseMs = 10 * 60 * 1000; // 10-minute delivery promise

  // Progress ratio based on 10-minute delivery promise
  const progressRatio = Math.min(0.96, Math.max(0.45, elapsedMs / totalPromiseMs));
  const progressPercent = Math.round(progressRatio * 100);

  // Hyperlocal delivery distance dummy calculation (2.5 km standard radius in Lakkavalli)
  const totalDistanceKm = 2.5;
  const remainingDistKm = Math.max(0.1, totalDistanceKm * (1 - progressRatio));
  const remainingDistanceStr =
    remainingDistKm < 0.5
      ? `${Math.round(remainingDistKm * 1000)} m`
      : `${remainingDistKm.toFixed(1)} km`;

  const remainingSeconds = Math.max(15, Math.round((totalPromiseMs - elapsedMs) / 1000));
  const remMins = Math.floor(remainingSeconds / 60);
  const remSecs = remainingSeconds % 60;
  const remainingTimeStr =
    remMins > 0 ? `${remMins}m ${remSecs > 0 ? `${remSecs}s` : ''}` : `${remSecs}s`;

  return (
    <div
      className={`bg-blue-50/90 rounded-2xl border border-blue-200/90 ${
        compact ? 'p-2.5' : 'p-3.5'
      } space-y-2.5 shadow-2xs`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header with 10-min promise badge and status */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 font-black text-blue-950">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
          </span>
          <span className="text-[11px] uppercase tracking-wide">Live Delivery Progress</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-extrabold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">
            ⚡ 10-Min Promise
          </span>
        </div>
      </div>

      {/* Progress Track with Moving Rider Marker */}
      <div className="space-y-1.5">
        <div className="relative pt-3 pb-1">
          {/* Rider Icon marker positioned proportionally along the track */}
          <div
            className="absolute top-0 -translate-x-1/2 transition-all duration-700 ease-out z-10 flex flex-col items-center"
            style={{ left: `${progressPercent}%` }}
          >
            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md animate-bounce">
              <Bike className="w-3 h-3 stroke-[2.2]" />
            </div>
          </div>

          {/* Track bar */}
          <div className="h-2 w-full bg-blue-100 rounded-full overflow-hidden border border-blue-200/70 relative">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-emerald-500 to-emerald-600 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Waypoints: Hub to Destination */}
        <div className="flex justify-between text-[10px] font-bold text-gray-500 px-0.5">
          <span className="flex items-center gap-0.5 text-gray-600">
            <MapPin className="w-2.5 h-2.5 text-gray-400" />
            Lakkavalli Hub
          </span>
          <span className="text-blue-900 font-extrabold">
            {progressPercent}% on the way
          </span>
          <span className="flex items-center gap-0.5 text-emerald-800">
            <Home className="w-2.5 h-2.5 text-emerald-600" />
            Your Doorstep
          </span>
        </div>
      </div>

      {/* Metric Cards: Estimated Remaining Distance & Time */}
      <div className="grid grid-cols-2 gap-2 pt-0.5">
        <div className="bg-white/95 p-2 rounded-xl border border-blue-100 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="text-[10px] text-gray-500 font-semibold">Remaining Dist:</span>
          </div>
          <span className="text-xs font-black text-gray-900">~{remainingDistanceStr}</span>
        </div>

        <div className="bg-white/95 p-2 rounded-xl border border-blue-100 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-[10px] text-gray-500 font-semibold">Remaining Time:</span>
          </div>
          <span className="text-xs font-black text-emerald-950">~{remainingTimeStr}</span>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// SUB-COMPONENT: CANCEL ORDER MODAL
// ==========================================
interface CancelOrderModalProps {
  order: Order;
  onConfirm: () => void;
  onClose: () => void;
}

const CancelOrderModal: React.FC<CancelOrderModalProps> = ({
  order,
  onConfirm,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100 p-5 space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
            <Ban className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900">Cancel This Order?</h3>
            <p className="text-[11px] text-gray-500 font-medium">
              Order #{order.id} is currently being prepared.
            </p>
          </div>
        </div>

        <div className="bg-red-50/70 rounded-2xl p-3.5 border border-red-100 space-y-2 text-xs">
          <p className="text-red-900 font-medium leading-relaxed">
            Are you sure you want to cancel this order? The preparation will be halted immediately and any charges (₹{order.totalAmount}) will be refunded.
          </p>
          <div className="text-[11px] text-red-700 font-bold">
            • Items: {order.items.length} products (₹{order.totalAmount})
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Ban className="w-4 h-4 stroke-[2.5]" />
            <span>Yes, Cancel Order</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Keep Order
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// SUB-COMPONENT: REORDER QUANTITY ADJUSTMENT MODAL
// ==========================================
interface ReorderAdjustModalProps {
  order: Order;
  onClose: () => void;
  onProceedToConfirmation: (itemsToAdd: CartItem[]) => void;
}

const ReorderAdjustModal: React.FC<ReorderAdjustModalProps> = ({
  order,
  onClose,
  onProceedToConfirmation,
}) => {
  const { availableItems, unavailableItems } = checkReorderItems(order.items);

  // Maintain local state of item quantities for this reorder
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    availableItems.forEach((it) => {
      initial[it.product.id] = it.quantity;
    });
    return initial;
  });

  const handleUpdateQty = (productId: string, delta: number) => {
    setItemQuantities((prev) => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [productId]: next };
    });
  };

  // Compute selected items and total
  const selectedItemsToReorder: CartItem[] = availableItems
    .filter((it) => (itemQuantities[it.product.id] || 0) > 0)
    .map((it) => ({
      product: it.product,
      quantity: itemQuantities[it.product.id],
    }));

  const reorderTotal = selectedItemsToReorder.reduce(
    (acc, it) => acc + it.product.price * it.quantity,
    0
  );

  const totalItemsCount = selectedItemsToReorder.reduce(
    (acc, it) => acc + it.quantity,
    0
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#064e3b] text-white p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-emerald-200 uppercase tracking-wider font-bold block">
              Customize Reorder
            </span>
            <h3 className="text-base font-extrabold tracking-tight">
              Order #{order.id}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4 text-xs">
          <div className="bg-emerald-50 rounded-2xl p-3 border border-emerald-100 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-900 font-medium leading-relaxed">
              Adjust the quantities of individual items below before adding them to your basket.
            </p>
          </div>

          {unavailableItems.length > 0 && (
            <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200 text-amber-900 text-xs">
              <span className="font-bold block">Note on stock availability:</span>
              <span>
                {unavailableItems.length} item(s) from this previous order are currently out of stock and excluded.
              </span>
            </div>
          )}

          {/* List of items with +/- controls */}
          <div className="space-y-2">
            <span className="text-[11px] font-black text-gray-700 uppercase tracking-wider block">
              Items in Order ({availableItems.length})
            </span>

            <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl p-2 bg-white">
              {availableItems.map((item) => {
                const qty = itemQuantities[item.product.id] || 0;
                return (
                  <div
                    key={item.product.id}
                    className="py-2.5 flex items-center justify-between text-xs gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-xl object-contain bg-gray-50 p-1 border border-gray-100 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="font-extrabold text-gray-900 block truncate text-xs">
                          {item.product.name}
                        </span>
                        <span className="text-[10px] text-gray-500 block">
                          ₹{item.product.price} / {item.product.quantity}
                        </span>
                        {qty === 0 && (
                          <span className="text-[10px] text-red-500 font-semibold">
                            Removed from reorder
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center bg-gray-100 rounded-xl p-0.5 border border-gray-200">
                        <button
                          onClick={() => handleUpdateQty(item.product.id, -1)}
                          className="w-7 h-7 rounded-lg bg-white text-gray-700 flex items-center justify-center font-bold hover:bg-gray-200 active:scale-90 transition-all cursor-pointer shadow-2xs"
                          aria-label={`Decrease ${item.product.name}`}
                        >
                          <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                        <span className="w-8 text-center font-black text-xs text-gray-900">
                          {qty}
                        </span>
                        <button
                          onClick={() => handleUpdateQty(item.product.id, 1)}
                          className="w-7 h-7 rounded-lg bg-[#064e3b] text-white flex items-center justify-center font-bold hover:bg-[#043c2d] active:scale-90 transition-all cursor-pointer shadow-2xs"
                          aria-label={`Increase ${item.product.name}`}
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </div>

                      <div className="w-14 text-right">
                        <span className="font-extrabold text-gray-900 block text-xs">
                          ₹{item.product.price * qty}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reorder Summary Box */}
          <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100 space-y-1.5">
            <div className="flex justify-between text-gray-600">
              <span>Total Selected Items:</span>
              <span className="font-bold text-gray-900">{totalItemsCount}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Delivery:</span>
              <span className="font-bold text-emerald-800 uppercase text-[10px]">
                FREE 10-Min Lakkavalli Express
              </span>
            </div>
            <div className="pt-2 border-t border-gray-200 flex justify-between font-black text-sm text-gray-900">
              <span>Reorder Amount:</span>
              <span className="text-base text-emerald-950">₹{reorderTotal}</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-gray-100 bg-gray-50 flex items-center gap-2">
          <button
            onClick={() => onProceedToConfirmation(selectedItemsToReorder)}
            disabled={selectedItemsToReorder.length === 0}
            className="flex-1 py-3 rounded-xl bg-[#064e3b] disabled:opacity-50 text-white text-xs font-extrabold hover:bg-[#043c2d] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reorder {totalItemsCount} Items • ₹{reorderTotal}</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-3 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// SUB-COMPONENT: REORDER CONFIRMATION ALERT / TOAST
// Small confirmation modal before adding items to cart
// ==========================================
interface ReorderConfirmationAlertProps {
  items: CartItem[];
  orderId: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ReorderConfirmationAlert: React.FC<ReorderConfirmationAlertProps> = ({
  items,
  orderId,
  onConfirm,
  onCancel,
}) => {
  const totalQty = items.reduce((acc, it) => acc + it.quantity, 0);
  const totalPrice = items.reduce((acc, it) => acc + it.product.price * it.quantity, 0);

  return (
    <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100 p-5 space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900">Add to Basket?</h3>
            <p className="text-[11px] text-gray-500 font-medium">
              Reorder from Order #{orderId}
            </p>
          </div>
        </div>

        {/* Confirmation Summary Card */}
        <div className="bg-[#f3f7f4] rounded-2xl p-3.5 border border-emerald-100/80 space-y-2 text-xs">
          <div className="flex justify-between items-center text-gray-700">
            <span>Total Items:</span>
            <span className="font-extrabold text-gray-900 bg-white px-2 py-0.5 rounded-md border border-gray-200">
              {totalQty} {totalQty === 1 ? 'item' : 'items'}
            </span>
          </div>
          <div className="flex justify-between items-center text-gray-700">
            <span>Total Price:</span>
            <span className="text-sm font-black text-emerald-950">₹{totalPrice}</span>
          </div>
          <div className="pt-1 border-t border-emerald-200/50 text-[11px] text-emerald-800 font-medium">
            ⚡ Ready for 10-minute express doorstep delivery in Lakkavalli
          </div>
        </div>

        {/* Item preview chips */}
        <div className="max-h-24 overflow-y-auto no-scrollbar space-y-1 divide-y divide-gray-100">
          {items.map((it) => (
            <div key={it.product.id} className="pt-1 flex justify-between text-[11px] text-gray-600">
              <span className="truncate max-w-[200px] font-medium">{it.product.name}</span>
              <span className="font-bold text-gray-900">Qty: {it.quantity}</span>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-[#064e3b] text-white text-xs font-black hover:bg-[#043c2d] active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Confirm & Add (₹{totalPrice})</span>
          </button>
          <button
            onClick={onCancel}
            className="px-3.5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// SUB-COMPONENT: REAL ORDER DETAILS MODAL
// ==========================================
interface OrderDetailsModalProps {
  order: Order;
  onClose: () => void;
  onReorder: (order: Order) => void;
  onQuickAdd?: (product: Product, quantity: number) => void;
  onRateOrder?: (rating: number) => void;
  onOpenFeedback?: () => void;
  onRequestCancel?: () => void;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  onClose,
  onReorder,
  onQuickAdd,
  onRateOrder,
  onOpenFeedback,
  onRequestCancel,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'map'>('summary');
  const expectedDeliveryTime = getExpectedDeliveryTimeString(order);
  const isPreparing = order.status === 'packing' || order.status === 'confirmed';
  const isDelivered = order.status === 'delivered';
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#064e3b] text-white p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-emerald-200 uppercase tracking-wider font-bold block">
              Order Details
            </span>
            <h3 className="text-base font-extrabold tracking-tight">
              Order #{order.id}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers: Bill vs Live Map */}
        <div className="flex border-b border-gray-100 bg-gray-50 text-xs font-bold text-gray-600">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex-1 py-2.5 text-center transition-colors cursor-pointer ${
              activeTab === 'summary'
                ? 'bg-white text-emerald-950 border-b-2 border-[#064e3b]'
                : 'hover:text-gray-900'
            }`}
          >
            Bill & Items
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`flex-1 py-2.5 text-center transition-colors flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'map'
                ? 'bg-white text-emerald-950 border-b-2 border-[#064e3b]'
                : 'hover:text-gray-900'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Live Tracking</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4 text-xs">
          {activeTab === 'summary' ? (
            <>
              {/* Status Header with Color-Coded Badge */}
              <div className="bg-emerald-50 rounded-2xl p-3 border border-emerald-100 text-center space-y-1.5">
                <span className="text-[10px] text-emerald-800 uppercase tracking-wider font-extrabold block">
                  Current Status
                </span>
                <div className="flex justify-center">
                  <OrderStatusBadge status={order.status} />
                </div>
                <div className="text-[11px] text-emerald-800 font-medium">
                  {order.status === 'delivered'
                    ? 'Delivered safely to your address in Lakkavalli.'
                    : order.status === 'cancelled'
                    ? 'This order was cancelled.'
                    : `Placed on ${order.orderTime}`}
                </div>

                {/* Expected delivery timestamp */}
                {!isCancelled && (
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-950 bg-white px-3 py-1 rounded-full border border-emerald-200 mt-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      {order.status === 'delivered' ? 'Delivered around' : 'Expected Delivery:'}{' '}
                      {expectedDeliveryTime}
                    </span>
                  </div>
                )}
              </div>

              {/* Real-time Order Tracking Visualization Component */}
              <RealTimeOrderTracker
                order={order}
                compact={false}
                showRiderInfo={true}
                showStepIndicators={true}
              />

              {/* Star Rating & Review in Details modal for delivered orders */}
              {isDelivered && (
                <div className="bg-emerald-50/70 rounded-2xl p-3.5 border border-emerald-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StarRatingInput
                        rating={order.rating}
                        onRate={(r) => {
                          if (onOpenFeedback) {
                            onOpenFeedback();
                          } else if (onRateOrder) {
                            onRateOrder(r);
                          }
                        }}
                        size="md"
                      />
                      {order.rating ? (
                        <span className="text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                          Reviewed
                        </span>
                      ) : null}
                    </div>

                    {onOpenFeedback && (
                      <button
                        onClick={onOpenFeedback}
                        className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-[#064e3b] bg-white hover:bg-emerald-100 px-2.5 py-1 rounded-xl border border-emerald-200 shadow-2xs active:scale-95 transition-all cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 shrink-0" />
                        <span>{order.rating ? `Edit Rating (${order.rating}★)` : 'Rate Order'}</span>
                      </button>
                    )}
                  </div>

                  {order.feedbackComment && (
                    <div className="bg-white/95 rounded-xl p-2.5 border border-emerald-100 text-[11px] text-gray-700 italic flex items-start gap-1.5">
                      <span className="text-emerald-700 font-black not-italic text-sm">“</span>
                      <span className="not-italic flex-1 text-gray-700 font-medium">
                        {order.feedbackComment}
                      </span>
                      <span className="text-emerald-700 font-black not-italic text-sm">”</span>
                    </div>
                  )}

                  {order.feedbackTags && order.feedbackTags.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      {order.feedbackTags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-bold bg-white text-emerald-900 px-2 py-0.5 rounded-lg border border-emerald-200 shadow-2xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Delivery Rider info if available */}
              {order.rider && !isCancelled ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center">
                      <Bike className="w-5 h-5 stroke-[2]" />
                    </div>
                    <div>
                      <div className="font-extrabold text-gray-900">{order.rider.name}</div>
                      <div className="text-[10px] text-gray-500">
                        {order.rider.vehicle} • {order.rider.phone}
                      </div>
                    </div>
                  </div>
                  <a
                    href={`tel:${order.rider.phone}`}
                    className="px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs"
                  >
                    Call
                  </a>
                </div>
              ) : null}

              {/* Real Ordered Products Breakdown with Quick Add */}
              <div className="space-y-2">
                <span className="text-[11px] font-black text-gray-700 uppercase tracking-wider block">
                  Ordered Products ({order.items.length})
                </span>
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl p-2 bg-white">
                  {order.items.map((it, idx) => (
                    <div
                      key={`${it.product.id}-${idx}`}
                      className="py-2.5 flex items-center justify-between text-xs gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={it.product.image}
                          alt={it.product.name}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-lg object-contain bg-gray-50 p-1 border border-gray-100 shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="font-extrabold text-gray-900 block truncate">
                            {it.product.name}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {it.quantity} × ₹{it.product.price} ({it.product.quantity})
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className="font-black text-gray-900 block">
                            ₹{it.product.price * it.quantity}
                          </span>
                          {it.product.mrp > it.product.price && (
                            <span className="text-[10px] text-gray-400 line-through">
                              ₹{it.product.mrp * it.quantity}
                            </span>
                          )}
                        </div>
                        {onQuickAdd && (
                          <button
                            type="button"
                            onClick={() => onQuickAdd(it.product, 1)}
                            className="px-2 py-1 bg-emerald-50 hover:bg-[#064e3b] text-[#064e3b] hover:text-white rounded-lg text-[10px] font-bold border border-emerald-200 transition-colors cursor-pointer"
                          >
                            + Quick Add
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bill Details */}
              <div className="space-y-1.5 bg-gray-50 rounded-2xl p-3 border border-gray-100 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Items Total</span>
                  <span className="font-bold text-gray-900">₹{order.itemTotal}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount</span>
                    <span className="font-bold">-₹{order.discount}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Delivery Charge</span>
                  <span className="font-bold text-gray-900">
                    {order.deliveryFee > 0 ? `₹${order.deliveryFee}` : '₹0'}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-200 flex justify-between font-black text-sm text-gray-900">
                  <span>Grand Total</span>
                  <span
                    className={`text-base font-black ${
                      isCancelled ? 'text-gray-400 line-through' : 'text-emerald-950'
                    }`}
                  >
                    ₹{order.totalAmount}
                  </span>
                </div>
                <div className="text-[10px] text-gray-400 pt-1 flex justify-between">
                  <span>Payment Mode: {order.paymentMethod.toUpperCase()}</span>
                  <span>Address: {order.deliveryAddress}</span>
                </div>
              </div>
            </>
          ) : (
            /* LIVE TRACKING MAP TAB */
            <div className="space-y-3">
              <RealTimeOrderTracker
                order={order}
                compact={false}
                showRiderInfo={true}
                showStepIndicators={true}
              />

              {order.status === 'out_for_delivery' && order.rider ? (
                <div className="space-y-3">
                  <div className="h-56 bg-emerald-950/90 rounded-2xl relative overflow-hidden flex flex-col justify-between p-4 text-white">
                    {/* Simulated Clean Real Map View for Lakkavalli */}
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]" />
                    <div className="relative z-10 flex justify-between items-start">
                      <span className="bg-emerald-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        Live GPS Signal Active
                      </span>
                      <span className="text-[11px] font-black text-emerald-300">
                        Bhadra Dam Road, Lakkavalli
                      </span>
                    </div>

                    <div className="relative z-10 my-auto text-center space-y-1">
                      <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto shadow-lg animate-bounce">
                        <Bike className="w-6 h-6 stroke-[2.2]" />
                      </div>
                      <div className="text-xs font-black">
                        {order.rider.name} is on the way!
                      </div>
                      <div className="text-[10px] text-emerald-200">
                        Approaching destination • {order.deliveryAddress}
                      </div>
                    </div>

                    <div className="relative z-10 text-[10px] text-emerald-300/80 bg-black/40 px-2 py-1 rounded-md">
                      Delivery Vehicle: {order.rider.vehicle}
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-xs text-emerald-900">
                    <span className="font-extrabold block">Real-time status:</span>
                    <span>Your delivery partner is en-route within Lakkavalli town limits.</span>
                  </div>
                </div>
              ) : order.status === 'delivered' ? (
                <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <h4 className="font-extrabold text-sm text-gray-900">Order Already Delivered</h4>
                  <p className="text-xs text-gray-500">
                    This order was delivered to {order.deliveryAddress}. Live map tracking is closed for completed orders.
                  </p>
                </div>
              ) : order.status === 'cancelled' ? (
                <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto">
                    <Ban className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <h4 className="font-extrabold text-sm text-gray-900">Order Cancelled</h4>
                  <p className="text-xs text-gray-500">
                    This order was cancelled.
                  </p>
                </div>
              ) : isPreparing ? (
                <div className="space-y-3">
                  {/* Live Dynamic Preparing Animation */}
                  <PreparingAnimation order={order} compact={false} />

                  {/* Dark Store Facility Simulation Header */}
                  <div className="h-44 bg-gradient-to-br from-amber-950 via-gray-900 to-amber-950 rounded-2xl relative overflow-hidden flex flex-col justify-between p-4 text-white border border-amber-900/40">
                    <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px]" />
                    <div className="relative z-10 flex justify-between items-start">
                      <span className="bg-amber-500/90 text-amber-950 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        Live Dark Store Feed
                      </span>
                      <span className="text-[11px] font-black text-amber-300">
                        Station #3 • Lakkavalli Dark Store
                      </span>
                    </div>

                    <div className="relative z-10 my-auto text-center space-y-1">
                      <div className="w-11 h-11 rounded-full bg-amber-500 text-amber-950 flex items-center justify-center mx-auto shadow-lg animate-pulse">
                        <Boxes className="w-5 h-5 stroke-[2.2]" />
                      </div>
                      <div className="text-xs font-black">
                        Manoj is assembling your {order.items.length} items
                      </div>
                      <div className="text-[10px] text-amber-200/90">
                        Farm-fresh inspection & thermal pouch bagging in progress
                      </div>
                    </div>

                    <div className="relative z-10 flex items-center justify-between text-[10px] text-amber-300/80 bg-black/40 px-2.5 py-1 rounded-lg">
                      <span>Express Rider Suresh on standby at bay</span>
                      <span className="font-bold text-emerald-400">10-Min Target Active</span>
                    </div>
                  </div>

                  {/* 10-Minute Delivery Promise Roadmap */}
                  <div className="p-3 bg-amber-50/90 border border-amber-200/80 rounded-2xl text-xs space-y-1 text-amber-950">
                    <div className="flex items-center justify-between font-extrabold text-[11px]">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
                        10-Minute Express Guarantee
                      </span>
                      <span className="text-amber-800 text-[10px]">Lakkavalli Town</span>
                    </div>
                    <p className="text-[10px] text-amber-900/80 leading-relaxed">
                      Our dark store team completes precision picking and thermal packaging in &lt;3.5 minutes. Once sealed, your rider delivers directly to {order.deliveryAddress} in ~6.5 minutes.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6 stroke-[2]" />
                  </div>
                  <h4 className="font-extrabold text-sm text-gray-900">Tracking Initializing</h4>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto">
                    Order details are being synchronized with the local fulfillment network.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-gray-100 bg-gray-50 flex items-center gap-2 flex-wrap">
          {isDelivered && onOpenFeedback && (
            <button
              onClick={onOpenFeedback}
              className="py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/90 text-xs font-bold transition-all flex items-center gap-1 active:scale-95 cursor-pointer shadow-2xs"
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
              <span>{order.rating ? `Rate Order (${order.rating}★)` : 'Rate Order'}</span>
            </button>
          )}
          {isPreparing && onRequestCancel && (
            <button
              onClick={onRequestCancel}
              className="py-2.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel Order
            </button>
          )}
          <button
            onClick={() => onReorder(order)}
            className="flex-1 py-2.5 rounded-xl bg-[#064e3b] text-white text-xs font-extrabold hover:bg-[#043c2d] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Customize Reorder</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-white transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
