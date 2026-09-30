import React, { useState, useEffect, useMemo } from 'react';
import { PhoneCall, X, ChevronRight, Sparkles, Clock, Bike, ShieldCheck } from 'lucide-react';
import { Order } from '../types';
import { calculateDynamicOrderStatus } from '../services/orderService';
import { vibrateFeedback } from '../utils/haptics';

interface DeliveryTipsBannerProps {
  orders: Order[];
  onTrackOrder: (order: Order) => void;
  className?: string;
}

// 5 minutes threshold in milliseconds
const FIVE_MINUTES_MS = 5 * 60 * 1000;
// Max threshold (e.g. 25 minutes) before considering delivery window closed if not already delivered
const MAX_ACTIVE_WINDOW_MS = 25 * 60 * 1000;

export const DeliveryTipsBanner: React.FC<DeliveryTipsBannerProps> = ({
  orders,
  onTrackOrder,
  className = '',
}) => {
  const [now, setNow] = useState<number>(Date.now());
  const [dismissedOrderIds, setDismissedOrderIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = sessionStorage.getItem('quickbasket_dismissed_tips_orders');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Re-check every 2 seconds to smoothly reveal banner exactly at 5-minute milestone
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Find the most recent active order that reached 5+ minutes since confirmation
  const qualifyingOrder = useMemo(() => {
    if (!orders || orders.length === 0) return null;

    for (const rawOrder of orders) {
      if (dismissedOrderIds.has(rawOrder.id)) continue;

      const dynamic = calculateDynamicOrderStatus(rawOrder);
      if (dynamic.status === 'delivered' || dynamic.status === 'cancelled') {
        continue;
      }

      const createdAtMs = dynamic.createdAt || dynamic.orderTimestamp;
      const elapsedMs = now - createdAtMs;

      // Condition: Appears 5 minutes (300s) after order placement and remains while active
      if (elapsedMs >= FIVE_MINUTES_MS && elapsedMs <= MAX_ACTIVE_WINDOW_MS) {
        return dynamic;
      }
    }
    return null;
  }, [orders, dismissedOrderIds, now]);

  if (!qualifyingOrder) {
    return null;
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    vibrateFeedback();
    const nextSet = new Set(dismissedOrderIds);
    nextSet.add(qualifyingOrder.id);
    setDismissedOrderIds(nextSet);
    try {
      sessionStorage.setItem(
        'quickbasket_dismissed_tips_orders',
        JSON.stringify(Array.from(nextSet))
      );
    } catch {
      // Ignore storage errors
    }
  };

  const handleOpenTracker = () => {
    vibrateFeedback();
    onTrackOrder(qualifyingOrder);
  };

  const riderName = qualifyingOrder.rider?.name || 'Your delivery partner';
  const orderIdShort = qualifyingOrder.id;

  return (
    <aside
      id="home-delivery-tips-banner"
      aria-label="Delivery Tips"
      className={`px-3.5 pt-1.5 pb-1 ${className}`}
    >
      <div
        onClick={handleOpenTracker}
        className="group relative overflow-hidden bg-gradient-to-r from-amber-50 via-amber-50/80 to-emerald-50/70 border border-amber-200/90 rounded-2xl p-3 shadow-xs hover:border-amber-300 transition-all cursor-pointer animate-in fade-in slide-in-from-top-2 duration-300"
      >
        <div className="flex items-start gap-3">
          {/* Subtle Icon Badge */}
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
            <PhoneCall className="w-4 h-4 stroke-[2.3] animate-pulse" />
          </div>

          {/* Banner Content */}
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded-md border border-amber-300/80">
                Delivery Tip
              </span>
              <span className="text-[10px] font-bold text-gray-500">
                Order #{orderIdShort}
              </span>
            </div>

            <p className="text-xs font-black text-gray-900 mt-1 leading-snug">
              Keep your phone reachable for delivery
            </p>

            <p className="text-[11px] text-gray-600 leading-normal mt-0.5">
              {riderName} is preparing to deliver your fresh groceries. Please ensure your mobile phone is nearby in case of gate entry or address confirmation.
            </p>

            {/* Quick Action Link */}
            <div className="mt-2 flex items-center gap-1 text-[11px] font-extrabold text-amber-900 group-hover:text-amber-950">
              <span>Track live order progress</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Dismiss Button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss delivery tip"
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-amber-200/40 transition-colors cursor-pointer shrink-0 -mr-1 -mt-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
