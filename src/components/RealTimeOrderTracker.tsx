import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  PackageCheck,
  Bike,
  Home,
  Zap,
  Phone,
  AlertCircle,
  Sparkles,
  MapPin,
  ShieldCheck,
  Boxes,
} from 'lucide-react';
import { Order } from '../types';

interface RealTimeOrderTrackerProps {
  order: Order;
  compact?: boolean;
  showRiderInfo?: boolean;
  showStepIndicators?: boolean;
  className?: string;
  onCallRider?: (phone: string) => void;
}

export const RealTimeOrderTracker: React.FC<RealTimeOrderTrackerProps> = ({
  order,
  compact = false,
  showRiderInfo = true,
  showStepIndicators = true,
  className = '',
  onCallRider,
}) => {
  // Live tick every second to keep ETA and progress bar strictly accurate in real time
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    // If already delivered or cancelled, no need for 1-second interval
    if (order.status === 'delivered' || order.status === 'cancelled') {
      return;
    }
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [order.status]);

  const createdAtMs = order.createdAt || order.orderTimestamp;
  const estimatedTimestamp =
    order.estimatedDeliveryTimestamp || createdAtMs + 10 * 60 * 1000;
  const totalPromiseMs = 10 * 60 * 1000; // 10 minutes (600,000 ms)
  const elapsedMs = Math.max(0, now - createdAtMs);
  const remainingMs = Math.max(0, estimatedTimestamp - now);

  const isCancelled = order.status === 'cancelled';
  const isDelivered = order.status === 'delivered';
  const isOutForDelivery = order.status === 'out_for_delivery';
  const isPreparing = order.status === 'packing' || order.status === 'confirmed';

  // Calculate dynamic progress percentage based on order status and elapsed real-time
  let progressPercent = 0;
  let currentStageLabel = 'Order Placed';
  let currentStageDescription = 'Order received at Lakkavalli fulfillment store';
  let activeStep = 1;

  if (isCancelled) {
    progressPercent = 0;
    currentStageLabel = 'Order Cancelled';
    currentStageDescription = 'This order has been cancelled and refunded';
    activeStep = 0;
  } else if (isDelivered) {
    progressPercent = 100;
    currentStageLabel = 'Delivered';
    currentStageDescription = 'Order handed over safely at your doorstep in Lakkavalli';
    activeStep = 4;
  } else if (isOutForDelivery) {
    activeStep = 3;
    currentStageLabel = 'Out for Delivery';
    currentStageDescription = order.rider
      ? `${order.rider.name} is on the way to your location`
      : 'Express delivery partner is on the way to your address';

    // Out for delivery is between 55% and 94%
    const deliveryElapsedRatio = Math.min(
      1,
      Math.max(0, (elapsedMs - 4.5 * 60 * 1000) / (5.5 * 60 * 1000))
    );
    progressPercent = Math.min(94, Math.round(55 + deliveryElapsedRatio * 39));
  } else if (order.status === 'packing') {
    activeStep = 2;
    currentStageLabel = 'Preparing & Packing';
    currentStageDescription = 'Picking fresh grocery items & bagging with temperature control';

    // Packing is between 25% and 54%
    const packingElapsedRatio = Math.min(
      1,
      Math.max(0, (elapsedMs - 1.5 * 60 * 1000) / (3.0 * 60 * 1000))
    );
    progressPercent = Math.min(54, Math.round(25 + packingElapsedRatio * 29));
  } else {
    // Confirmed
    activeStep = 1;
    currentStageLabel = 'Confirmed';
    currentStageDescription = 'Order confirmed & assigned to dark store picker';
    const confirmedRatio = Math.min(1, Math.max(0, elapsedMs / (1.5 * 60 * 1000)));
    progressPercent = Math.min(24, Math.round(10 + confirmedRatio * 14));
  }

  // Format countdown string
  const remMinutes = Math.floor(remainingMs / 60000);
  const remSeconds = Math.floor((remainingMs % 60000) / 1000);

  let etaDisplay = '';
  if (isCancelled) {
    etaDisplay = 'Cancelled';
  } else if (isDelivered) {
    const deliveryDate = new Date(order.deliveredTimestamp || estimatedTimestamp);
    etaDisplay = `Delivered at ${deliveryDate.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })}`;
  } else if (remainingMs <= 0) {
    etaDisplay = 'Arriving any moment';
  } else if (remMinutes > 0) {
    etaDisplay = `Arriving in ${remMinutes}m ${remSeconds < 10 ? `0${remSeconds}` : remSeconds}s`;
  } else {
    etaDisplay = `Arriving in ${remSeconds}s`;
  }

  // Format expected target delivery clock time
  const targetDate = new Date(estimatedTimestamp);
  const targetTimeStr = targetDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  // Calculate simulated hyperlocal distance for out-for-delivery phase (2.5 km radius)
  const remainingDistanceKm = Math.max(0.1, 2.5 * (1 - (progressPercent - 55) / 45));
  const remainingDistanceStr =
    remainingDistanceKm < 0.5
      ? `${Math.round(remainingDistanceKm * 1000)}m away`
      : `${remainingDistanceKm.toFixed(1)} km away`;

  return (
    <div
      className={`rounded-2xl transition-all duration-300 ${
        isCancelled
          ? 'bg-red-50/80 border border-red-200/80 p-3.5'
          : isDelivered
          ? 'bg-emerald-50/70 border border-emerald-200/80 p-3.5'
          : isOutForDelivery
          ? 'bg-blue-50/80 border border-blue-200/80 p-3.5'
          : 'bg-amber-50/80 border border-amber-200/80 p-3.5'
      } ${className}`}
    >
      {/* 1. Header: Live Status Badge, Dynamic ETA, and Target Clock */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {!isCancelled && !isDelivered && (
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isOutForDelivery ? 'bg-blue-400' : 'bg-amber-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isOutForDelivery ? 'bg-blue-600' : 'bg-amber-600'
                }`}
              />
            </span>
          )}

          {isDelivered && (
            <CheckCircle2 className="w-4 h-4 text-emerald-700 stroke-[2.5] shrink-0" />
          )}

          {isCancelled && (
            <AlertCircle className="w-4 h-4 text-red-600 stroke-[2.5] shrink-0" />
          )}

          <div className="truncate">
            <span
              className={`text-xs font-black uppercase tracking-wider block leading-tight truncate ${
                isCancelled
                  ? 'text-red-900'
                  : isDelivered
                  ? 'text-emerald-900'
                  : isOutForDelivery
                  ? 'text-blue-950'
                  : 'text-amber-950'
              }`}
            >
              {currentStageLabel}
            </span>
          </div>
        </div>

        {/* ETA Highlight Pill */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div
            className={`px-2.5 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-2xs ${
              isCancelled
                ? 'bg-white text-red-700 border border-red-200'
                : isDelivered
                ? 'bg-white text-emerald-800 border border-emerald-200'
                : isOutForDelivery
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-amber-500 text-white shadow-xs'
            }`}
          >
            <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{etaDisplay}</span>
          </div>

          {!isCancelled && !isDelivered && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-gray-600 bg-white/80 px-2 py-0.5 rounded-full border border-gray-200">
              Target: {targetTimeStr}
            </span>
          )}
        </div>
      </div>

      {/* 2. Real-Time Dynamic Progress Bar with Moving Marker */}
      {!isCancelled && (
        <div className="space-y-1.5 my-3">
          <div className="relative pt-2.5 pb-1">
            {/* Moving Status Indicator Icon */}
            {!isDelivered && (
              <div
                className="absolute top-0 -translate-x-1/2 transition-all duration-1000 ease-out z-10 flex flex-col items-center pointer-events-none"
                style={{ left: `${Math.min(96, Math.max(4, progressPercent))}%` }}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-white shadow-md ${
                    isOutForDelivery
                      ? 'bg-blue-600 ring-2 ring-white animate-bounce'
                      : 'bg-amber-500 ring-2 ring-white'
                  }`}
                >
                  {isOutForDelivery ? (
                    <Bike className="w-3.5 h-3.5 stroke-[2.5]" />
                  ) : (
                    <Boxes className="w-3.5 h-3.5 stroke-[2.2]" />
                  )}
                </div>
              </div>
            )}

            {/* Base Progress Track */}
            <div className="h-2 w-full bg-white/80 rounded-full overflow-hidden border border-gray-200/80 shadow-inner relative">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${
                  isDelivered
                    ? 'bg-emerald-600'
                    : isOutForDelivery
                    ? 'bg-gradient-to-r from-amber-500 via-blue-500 to-blue-600'
                    : 'bg-gradient-to-r from-amber-400 to-amber-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Micro-status captions beneath the track */}
          <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 px-0.5">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>10-Min Fast-Track</span>
            </span>

            <span className="font-extrabold text-gray-700 font-mono">
              {isDelivered ? '100% Complete' : `${progressPercent}% Completed`}
            </span>

            {isOutForDelivery ? (
              <span className="text-blue-700 font-extrabold flex items-center gap-0.5">
                <Bike className="w-3 h-3" />
                {remainingDistanceStr}
              </span>
            ) : isPreparing ? (
              <span className="text-amber-700 font-extrabold flex items-center gap-0.5">
                <Boxes className="w-3 h-3" />
                Hub Station #3
              </span>
            ) : isDelivered ? (
              <span className="text-emerald-700 font-extrabold flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" />
                Safe Delivery
              </span>
            ) : null}
          </div>
        </div>
      )}

      {/* 3. 4-Stage Visual Milestones Stepper */}
      {showStepIndicators && !isCancelled && (
        <div className="pt-2 border-t border-gray-200/60 mt-2">
          <div className="grid grid-cols-4 gap-1 text-center">
            {/* Step 1: Confirmed */}
            <div className="flex flex-col items-center">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all shadow-2xs ${
                  activeStep >= 1
                    ? 'bg-emerald-700 text-white ring-2 ring-white'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
              </div>
              <span
                className={`text-[9px] font-bold mt-1 leading-tight ${
                  activeStep === 1
                    ? 'text-emerald-950 font-black'
                    : activeStep > 1
                    ? 'text-emerald-800'
                    : 'text-gray-400'
                }`}
              >
                Confirmed
              </span>
            </div>

            {/* Step 2: Preparing */}
            <div className="flex flex-col items-center">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all shadow-2xs ${
                  activeStep === 2
                    ? 'bg-amber-500 text-white ring-2 ring-amber-200 animate-pulse'
                    : activeStep > 2
                    ? 'bg-emerald-700 text-white ring-2 ring-white'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                <PackageCheck className="w-3 h-3 stroke-[2.5]" />
              </div>
              <span
                className={`text-[9px] font-bold mt-1 leading-tight ${
                  activeStep === 2
                    ? 'text-amber-950 font-black'
                    : activeStep > 2
                    ? 'text-emerald-800'
                    : 'text-gray-400'
                }`}
              >
                Preparing
              </span>
            </div>

            {/* Step 3: Out for Delivery */}
            <div className="flex flex-col items-center">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all shadow-2xs ${
                  activeStep === 3
                    ? 'bg-blue-600 text-white ring-2 ring-blue-200'
                    : activeStep > 3
                    ? 'bg-emerald-700 text-white ring-2 ring-white'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                <Bike className="w-3 h-3 stroke-[2.5]" />
              </div>
              <span
                className={`text-[9px] font-bold mt-1 leading-tight ${
                  activeStep === 3
                    ? 'text-blue-950 font-black'
                    : activeStep > 3
                    ? 'text-emerald-800'
                    : 'text-gray-400'
                }`}
              >
                On the way
              </span>
            </div>

            {/* Step 4: Delivered */}
            <div className="flex flex-col items-center">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all shadow-2xs ${
                  activeStep >= 4
                    ? 'bg-emerald-700 text-white ring-2 ring-emerald-200'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                <Home className="w-3 h-3 stroke-[2.5]" />
              </div>
              <span
                className={`text-[9px] font-bold mt-1 leading-tight ${
                  activeStep >= 4 ? 'text-emerald-950 font-black' : 'text-gray-400'
                }`}
              >
                Delivered
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Live Context Details (Rider info when out for delivery, dark store info when preparing) */}
      {!compact && (
        <div className="mt-3 pt-2.5 border-t border-gray-200/60 text-xs">
          {isOutForDelivery && order.rider && showRiderInfo ? (
            <div className="bg-white/90 rounded-xl p-2.5 border border-blue-100 flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 font-bold text-xs">
                  <Bike className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-gray-900 truncate">
                      {order.rider.name}
                    </span>
                    <span className="text-[9px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.2 rounded border border-blue-200 shrink-0">
                      Rider Assigned
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 truncate">
                    {order.rider.vehicle || 'Hero Electric Express'} • {remainingDistanceStr}
                  </p>
                </div>
              </div>

              {order.rider.phone && (
                <a
                  href={`tel:${order.rider.phone}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCallRider?.(order.rider?.phone || '');
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] flex items-center gap-1 shrink-0 transition-colors cursor-pointer shadow-xs active:scale-95"
                >
                  <Phone className="w-3 h-3 stroke-[2.5]" />
                  <span>Call Rider</span>
                </a>
              )}
            </div>
          ) : isPreparing ? (
            <div className="bg-white/90 rounded-xl p-2.5 border border-amber-100 flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Boxes className="w-3.5 h-3.5 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-gray-900 text-[11px] block truncate">
                    Lakkavalli Fulfillment Hub #3
                  </span>
                  <p className="text-[10px] text-gray-500 truncate">
                    {currentStageDescription}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 shrink-0">
                QC In Progress
              </span>
            </div>
          ) : isDelivered ? (
            <div className="bg-white/90 rounded-xl p-2.5 border border-emerald-100 flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                <span className="text-[11px] font-bold text-emerald-950 truncate">
                  Handed over to recipient at {order.deliveryAddress}
                </span>
              </div>
              <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                On-Time 10 Min
              </span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
