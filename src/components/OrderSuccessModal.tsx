import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Bike,
  PackageCheck,
  Home,
  AlertCircle,
  X,
  Zap,
  Navigation,
  Store,
  Boxes,
  Sparkles,
  ShieldCheck,
  Star,
  MessageSquare,
  Check,
  ThumbsUp,
  Bell,
  BellRing,
} from 'lucide-react';
import { Order } from '../types';
import {
  updateOrderRating,
  calculateDynamicOrderStatus,
  markOrderDelivered,
  getUserOrders,
} from '../services/orderService';
import {
  isOrderSubscribed,
  toggleOrderNotification,
} from '../services/orderNotificationService';
import { vibrateFeedback } from '../utils/haptics';

interface OrderSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onOrdersChange?: (orders: Order[]) => void;
}

const RATING_DESCRIPTIONS: Record<
  number,
  { label: string; tone: string; emoji: string }
> = {
  1: { label: 'Needs Improvement', tone: 'text-rose-600', emoji: '😞' },
  2: { label: 'Fair Delivery', tone: 'text-amber-600', emoji: '😐' },
  3: { label: 'Good Experience', tone: 'text-amber-700', emoji: '🙂' },
  4: { label: 'Very Good & Fast', tone: 'text-emerald-700', emoji: '😊' },
  5: { label: 'Super Fast & Fresh!', tone: 'text-emerald-800', emoji: '🌟' },
};

const QUICK_FEEDBACK_TAGS = [
  '⚡ 10-Min Fast Delivery',
  '🛵 Courteous Rider',
  '🥦 Fresh & Crisp Items',
  '📦 Secure Packaging',
  '🛡️ Contactless Handover',
  '📍 Accurate Location',
];

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  isOpen,
  onClose,
  order: initialOrder,
  onOrdersChange,
}) => {
  const [currentOrder, setCurrentOrder] = useState<Order | null>(initialOrder);
  const [callAlert, setCallAlert] = useState(false);
  const [, setTick] = useState(0);

  // Feedback state for when order reaches 'delivered' status
  const [rating, setRating] = useState<number>(initialOrder?.rating || 0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedbackComment, setFeedbackComment] = useState<string>(
    initialOrder?.feedbackComment || ''
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(
    initialOrder?.feedbackTags || []
  );
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<boolean>(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(
    Boolean(initialOrder?.rating)
  );
  const [isEditingFeedback, setIsEditingFeedback] = useState<boolean>(false);
  const [feedbackSuccessMsg, setFeedbackSuccessMsg] = useState<string>('');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(() => {
    return initialOrder ? isOrderSubscribed(initialOrder.id) : false;
  });

  const handleToggleNotification = async () => {
    if (!currentOrder) return;
    vibrateFeedback();
    const next = !isSubscribed;
    const ok = await toggleOrderNotification(currentOrder, next);
    setIsSubscribed(ok);
  };

  useEffect(() => {
    if (initialOrder) {
      setIsSubscribed(isOrderSubscribed(initialOrder.id));
      const dynamic = calculateDynamicOrderStatus(initialOrder);
      setCurrentOrder(dynamic);
      if (dynamic.rating) {
        setRating(dynamic.rating);
        setFeedbackSubmitted(true);
      }
      if (dynamic.feedbackComment !== undefined) {
        setFeedbackComment(dynamic.feedbackComment);
      }
      if (dynamic.feedbackTags) {
        setSelectedTags(dynamic.feedbackTags);
      }
    }
  }, [initialOrder]);

  // Live 1-second interval to update real-time progress & ETA
  useEffect(() => {
    if (!isOpen || !currentOrder) return;
    if (currentOrder.status === 'delivered' || currentOrder.status === 'cancelled') return;

    const timer = setInterval(() => {
      setTick((t) => t + 1);
      setCurrentOrder((prev) => (prev ? calculateDynamicOrderStatus(prev) : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, currentOrder?.status]);

  if (!isOpen || !currentOrder) return null;

  const order = currentOrder;
  const isDelivered = order.status === 'delivered';

  // Real ETA calculation based on orderTimestamp + estimated arrival (10 minutes = 600,000 ms)
  const now = Date.now();
  const orderTime = order.orderTimestamp ? new Date(order.orderTimestamp).getTime() : now;
  const totalDurationMs = 10 * 60 * 1000; // 10 minutes total promise
  const elapsedMs = Math.max(0, now - orderTime);
  const remainingMs = Math.max(0, totalDurationMs - elapsedMs);

  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const remainingSeconds = Math.floor(remainingMs / 1000);

  const elapsedMin = Math.floor(elapsedSeconds / 60);
  const elapsedSec = elapsedSeconds % 60;
  const remainingMin = Math.ceil(remainingSeconds / 60);

  // Dynamic percentage across 10-minute duration (starts at least 8% for immediate confirmation feel)
  const rawPercent = (elapsedSeconds / 600) * 100;
  const progressPercent = isDelivered ? 100 : Math.min(98, Math.max(8, Math.round(rawPercent)));

  const etaDisplay = isDelivered
    ? 'Delivered'
    : remainingSeconds <= 0
    ? 'Arriving now'
    : `~${remainingMin} MINS`;

  // Dynamic milestones for 10-min delivery
  const stages = [
    {
      id: 1,
      title: 'Confirmed',
      desc: 'Order placed',
      threshold: 0,
      icon: CheckCircle2,
    },
    {
      id: 2,
      title: 'Packing',
      desc: 'Lakkavalli Hub',
      threshold: 20,
      icon: Boxes,
    },
    {
      id: 3,
      title: 'On the Way',
      desc: 'Express Rider',
      threshold: 50,
      icon: Bike,
    },
    {
      id: 4,
      title: 'Doorstep',
      desc: 'Within 10m',
      threshold: 85,
      icon: Home,
    },
  ];

  // Determine current active stage
  const currentStageIndex = isDelivered
    ? 3
    : stages.reduce((acc, stage, idx) => {
        return progressPercent >= stage.threshold ? idx : acc;
      }, 0);

  const handleCall = () => {
    setCallAlert(true);
    setTimeout(() => setCallAlert(false), 3000);
  };

  const handleToggleTag = (tag: string) => {
    vibrateFeedback();
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmitFeedback = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!order || rating === 0) return;

    setIsSubmittingFeedback(true);
    vibrateFeedback();

    const trimmedComment = feedbackComment.trim();
    const success = updateOrderRating(
      order.id,
      rating,
      trimmedComment,
      selectedTags
    );

    if (success) {
      const updatedOrder: Order = {
        ...order,
        rating,
        feedbackComment: trimmedComment,
        feedbackTags: selectedTags,
      };
      setCurrentOrder(updatedOrder);
      setFeedbackSubmitted(true);
      setIsEditingFeedback(false);
      setFeedbackSuccessMsg('Thank you! Your delivery feedback has been recorded.');

      if (onOrdersChange) {
        onOrdersChange(getUserOrders(order.userId));
      }
    }
    setIsSubmittingFeedback(false);
  };

  const handleSimulateDelivery = () => {
    if (!order) return;
    vibrateFeedback();
    markOrderDelivered(order.id, order.userId);
    const updated: Order = {
      ...order,
      status: 'delivered',
      deliveredTimestamp: Date.now(),
    };
    setCurrentOrder(updated);
    if (onOrdersChange) {
      onOrdersChange(getUserOrders(order.userId));
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-250 flex flex-col max-h-[92vh]">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-br from-[#064e3b] via-[#043c2d] to-[#022c22] text-white p-5 text-center relative overflow-hidden">
          {/* Subtle grid pattern background */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:12px_12px]" />

          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-2 border border-white/20 shadow-inner">
            <CheckCircle2 className="w-7 h-7 text-emerald-300 stroke-[2.5]" />
          </div>
          <h2 className="text-lg font-black tracking-tight">
            {isDelivered ? 'Order Delivered!' : 'Order Confirmed!'}
          </h2>
          <p className="text-xs text-emerald-200/90 mt-0.5">
            Order #{order.id} • Lakkavalli 10-Min Fast-Track
          </p>

          {/* Real ETA calculation badge */}
          <div className="mt-3.5 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex items-center justify-around">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-400 animate-pulse stroke-[2.5]" />
              <div className="text-left">
                <span className="text-[10px] text-emerald-200 uppercase font-bold tracking-wider block leading-none">
                  {isDelivered ? 'Delivery Status' : 'Estimated Delivery'}
                </span>
                <span className="text-base font-black text-white tracking-wider">
                  {etaDisplay}
                </span>
              </div>
            </div>
            <div className="h-6 w-[1px] bg-white/20" />
            <div className="text-right">
              <span className="text-[10px] text-emerald-200 uppercase font-bold tracking-wider block leading-none">
                Dispatch Speed
              </span>
              <span className="text-xs font-black text-emerald-950 bg-[#22c55e] px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 mt-0.5 shadow-[0_0_10px_rgba(34,197,94,0.4)]">
                <span>⚡</span>
                <span>{isDelivered ? 'COMPLETED' : '10 MIN EXPRESS'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-gray-800 text-xs">
          {/* =========================================================================
              VISUAL PROGRESS BAR & STAGES
              ========================================================================= */}
          <div className="bg-gradient-to-b from-emerald-50/70 to-white border border-emerald-100 rounded-3xl p-3.5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isDelivered ? 'bg-emerald-600' : 'bg-emerald-500 animate-ping'}`} />
                <span className="font-black text-xs text-gray-900 tracking-tight">
                  10-Min Delivery Tracker
                </span>
              </div>
              <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                {isDelivered ? '✓ Delivered at Doorstep' : '⚡ Express Doorstep Delivery'}
              </span>
            </div>

            <div className="space-y-3">
              {/* Visual Progress Bar with Gliding Rider Marker */}
              <div className="pt-2 pb-1 relative">
                {/* Floating Marker Icon along track */}
                <div
                  className="absolute top-0 -translate-x-1/2 transition-all duration-700 ease-out z-10 flex flex-col items-center"
                  style={{ left: `${progressPercent}%` }}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shadow-md ring-2 ${
                    isDelivered
                      ? 'bg-emerald-700 text-white ring-emerald-400'
                      : 'bg-[#064e3b] text-white ring-emerald-300 animate-pulse'
                  }`}>
                    {isDelivered ? (
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    ) : (
                      <Bike className="w-3.5 h-3.5 stroke-[2.2]" />
                    )}
                  </div>
                </div>

                {/* Track container */}
                <div className="h-2.5 w-full bg-emerald-100/90 rounded-full overflow-hidden border border-emerald-200/80 relative">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-[#10b981] to-[#047857] rounded-full transition-all duration-700 ease-out shadow-xs"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Progress Stats Summary */}
              <div className="flex justify-between items-center text-[11px] font-bold text-gray-600 px-1">
                <span className="flex items-center gap-1 text-emerald-800">
                  <Clock className="w-3 h-3" />
                  <span>
                    {isDelivered
                      ? 'Delivered on-time'
                      : `Elapsed: ${String(elapsedMin).padStart(2, '0')}:${String(elapsedSec).padStart(2, '0')}`}
                  </span>
                </span>
                <span className="font-extrabold text-emerald-950 bg-emerald-100/80 px-2 py-0.5 rounded-full text-[10px]">
                  {progressPercent}% Complete
                </span>
                <span className="text-gray-500">Goal: 10:00 Mins</span>
              </div>

              {/* 4 Step Milestone Indicators */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {stages.map((st, idx) => {
                  const Icon = st.icon;
                  const isDone = isDelivered || progressPercent >= st.threshold;
                  const isCurrent = isDelivered ? idx === 3 : currentStageIndex === idx;

                  return (
                    <div
                      key={st.id}
                      className={`rounded-2xl p-2 text-center transition-all border ${
                        isCurrent
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm ring-2 ring-emerald-300/60'
                          : isDone
                          ? 'bg-emerald-50/90 text-emerald-900 border-emerald-200'
                          : 'bg-gray-50/80 text-gray-400 border-gray-100'
                      }`}
                    >
                      <div className="flex justify-center mb-1">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            isCurrent
                              ? 'bg-white text-emerald-800'
                              : isDone
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 stroke-[2.2]" />
                        </div>
                      </div>
                      <div className="text-[10px] font-black truncate leading-tight">
                        {st.title}
                      </div>
                      <div
                        className={`text-[8px] truncate mt-0.5 ${
                          isCurrent ? 'text-emerald-100' : isDone ? 'text-emerald-700' : 'text-gray-400'
                        }`}
                      >
                        {st.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Browser Live Notification Status Banner */}
          <div className="bg-emerald-50/60 rounded-2xl p-3 border border-emerald-100 flex items-center justify-between gap-2.5 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                  isSubscribed
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {isSubscribed ? (
                  <BellRing className="w-3.5 h-3.5 stroke-[2.3]" />
                ) : (
                  <Bell className="w-3.5 h-3.5 stroke-[2.2]" />
                )}
              </div>
              <div className="min-w-0">
                <span className="font-extrabold text-gray-900 text-xs block leading-tight truncate">
                  {isSubscribed
                    ? 'Live Order Alerts Active'
                    : 'Browser Order Notifications'}
                </span>
                <p className="text-[10px] text-gray-600 truncate leading-tight mt-0.5">
                  {isSubscribed
                    ? 'Packing, rider dispatch & delivery alerts enabled'
                    : 'Get instant status alerts on your screen'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleNotification}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black shrink-0 transition-all cursor-pointer ${
                isSubscribed
                  ? 'bg-white text-emerald-900 border border-emerald-300 hover:bg-emerald-100/50'
                  : 'bg-[#064e3b] hover:bg-[#043c2d] text-white shadow-xs'
              }`}
            >
              {isSubscribed ? 'Subscribed ✓' : 'Enable Alerts'}
            </button>
          </div>

          {/* =========================================================================
              REAL-TIME DELIVERY EXPERIENCE FEEDBACK (STAR RATING & TEXT INPUT)
              Displayed after order reaches 'delivered' status
              ========================================================================= */}
          {isDelivered ? (
            <div
              id="delivery-feedback-section"
              className="bg-gradient-to-b from-amber-50/90 via-emerald-50/50 to-white rounded-3xl p-4 border border-amber-200/80 shadow-xs space-y-3.5 animate-in fade-in duration-300"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <Star className="w-4 h-4 fill-white stroke-none" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-gray-900 leading-tight">
                      Rate Delivery Experience
                    </h4>
                    <span className="text-[10px] text-gray-500 font-medium block">
                      How was your 10-minute QuickBasket delivery?
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-extrabold text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                  Delivered ✓
                </span>
              </div>

              {/* Success Banner */}
              {feedbackSuccessMsg && (
                <div className="bg-emerald-100/90 border border-emerald-300 text-emerald-900 rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-2 animate-in zoom-in-95">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{feedbackSuccessMsg}</span>
                </div>
              )}

              {/* Already Submitted View Mode */}
              {feedbackSubmitted && !isEditingFeedback ? (
                <div className="bg-white rounded-2xl p-3.5 border border-emerald-100 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-5 h-5 ${
                              (order.rating || rating) >= star
                                ? 'fill-amber-400 text-amber-500'
                                : 'text-gray-200 stroke-[1.5]'
                            }`}
                          />
                        ))}
                        <span className="ml-1.5 text-xs font-black text-gray-900">
                          {order.rating || rating}.0 / 5.0
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-800 mt-0.5 block">
                        {RATING_DESCRIPTIONS[order.rating || rating]?.label || 'Feedback Recorded'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        vibrateFeedback();
                        setIsEditingFeedback(true);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Edit Feedback</span>
                    </button>
                  </div>

                  {/* Submitted Comment */}
                  {(order.feedbackComment || feedbackComment) && (
                    <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100 text-xs text-gray-700 italic">
                      "{order.feedbackComment || feedbackComment}"
                    </div>
                  )}

                  {/* Submitted Tags */}
                  {((order.feedbackTags && order.feedbackTags.length > 0) || selectedTags.length > 0) && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {(order.feedbackTags || selectedTags).map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-bold bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded-md border border-emerald-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Interactive Input Mode: Star Rating & Text Input */
                <form
                  onSubmit={handleSubmitFeedback}
                  className="bg-white rounded-2xl p-3.5 border border-amber-100 shadow-2xs space-y-3"
                >
                  {/* 1. Star Rating System */}
                  <div>
                    <label className="text-[11px] font-black text-gray-800 uppercase tracking-wider block mb-1.5">
                      Your Delivery Rating <span className="text-amber-500">*</span>
                    </label>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const activeStar = (hoverRating || rating) >= star;
                          return (
                            <button
                              key={star}
                              type="button"
                              onClick={() => {
                                setRating(star);
                                vibrateFeedback();
                              }}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                              className="p-1 rounded-lg hover:bg-amber-50 active:scale-95 transition-all cursor-pointer group"
                              aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                            >
                              <Star
                                className={`w-7 h-7 transition-all ${
                                  activeStar
                                    ? 'fill-amber-400 text-amber-500 scale-110 drop-shadow-xs'
                                    : 'text-gray-300 stroke-[1.5] group-hover:text-amber-300'
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>

                      {/* Dynamic Rating Label */}
                      <div className="text-right">
                        {(hoverRating || rating) > 0 ? (
                          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200">
                            <span className="text-xs">
                              {RATING_DESCRIPTIONS[hoverRating || rating]?.emoji}
                            </span>
                            <span className="text-[11px] font-black text-amber-900">
                              {RATING_DESCRIPTIONS[hoverRating || rating]?.label}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">
                            Tap 1-5 stars to rate
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2. Quick Tags for Delivery Highlights */}
                  <div>
                    <label className="text-[11px] font-black text-gray-700 block mb-1.5">
                      What went well? <span className="text-gray-400 text-[10px] font-normal">(Tap to add)</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_FEEDBACK_TAGS.map((tag) => {
                        const isSelected = selectedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleToggleTag(tag)}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer active:scale-95 ${
                              isSelected
                                ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs'
                                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Text Input Field for Delivery Experience */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label
                        htmlFor="delivery-feedback-text"
                        className="text-[11px] font-black text-gray-800 block"
                      >
                        Delivery Experience Feedback
                      </label>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {feedbackComment.length}/300
                      </span>
                    </div>
                    <textarea
                      id="delivery-feedback-text"
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      placeholder="Share your experience (e.g. fast rider arrival, polite delivery partner, fresh groceries, neat bagging)..."
                      rows={3}
                      maxLength={300}
                      className="w-full p-2.5 text-xs bg-gray-50 rounded-xl border border-gray-200 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-200/50 focus:outline-none placeholder:text-gray-400 resize-none transition-all"
                    />
                  </div>

                  {/* 4. Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    {isEditingFeedback && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingFeedback(false);
                          setRating(order.rating || 0);
                          setFeedbackComment(order.feedbackComment || '');
                          setSelectedTags(order.feedbackTags || []);
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={rating === 0 || isSubmittingFeedback}
                      className={`flex-1 py-2.5 px-4 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                        rating > 0 && !isSubmittingFeedback
                          ? 'bg-gradient-to-r from-[#064e3b] to-emerald-700 hover:from-[#043c2d] hover:to-emerald-800 text-white active:scale-98'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isSubmittingFeedback ? (
                        <span>Saving feedback...</span>
                      ) : (
                        <>
                          <Check className="w-4 h-4 stroke-[2.5]" />
                          <span>Submit Delivery Feedback</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="bg-emerald-50/70 rounded-2xl p-3.5 border border-emerald-100 flex flex-col gap-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-900">
                <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="font-medium text-[11px]">
                  Star rating & delivery feedback unlocks as soon as your order reaches your doorstep.
                </span>
              </div>

              {/* Fast-Forward / Test Button for immediate evaluation */}
              <div className="pt-1.5 border-t border-emerald-100/80 flex items-center justify-between">
                <span className="text-[10px] text-gray-500 font-medium">
                  Testing? Advance order immediately:
                </span>
                <button
                  type="button"
                  onClick={handleSimulateDelivery}
                  className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-extrabold flex items-center gap-1 shadow-2xs active:scale-95 transition-all cursor-pointer"
                >
                  <Zap className="w-3 h-3 fill-white" />
                  <span>Fast-Forward to Delivered</span>
                </button>
              </div>
            </div>
          )}

          {/* Rider Details (Only shown when genuine rider is assigned) */}
          {order.rider ? (
            <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#064e3b] text-white flex items-center justify-center shadow-2xs">
                  <Bike className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <div className="font-extrabold text-sm text-gray-900">{order.rider.name}</div>
                  <div className="text-[11px] text-emerald-800 font-semibold">
                    {order.rider.vehicle || 'Delivery Partner'} • Verified ✓
                  </div>
                </div>
              </div>
              <button
                onClick={handleCall}
                className="p-2.5 rounded-xl bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100/50 active:scale-90 transition-all shadow-2xs cursor-pointer"
                aria-label="Call delivery rider"
              >
                <Phone className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3 flex items-center gap-2.5 text-gray-600 text-xs">
              <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Order received by Lakkavalli store. Dedicated 10-minute delivery rider assigned.</span>
            </div>
          )}

          {callAlert && order.rider && (
            <div className="bg-orange-50 border border-orange-200 text-orange-700 rounded-xl p-2.5 text-center text-xs font-bold animate-in fade-in">
              📞 Connecting to delivery partner ({order.rider.phone})...
            </div>
          )}

          {/* Delivery Address */}
          <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100 flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-gray-900 block">Delivering to</span>
              <span className="text-[11px] text-gray-600 leading-snug">{order.deliveryAddress}</span>
            </div>
          </div>

          {/* Items Summary */}
          <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-2xs space-y-2">
            <span className="font-bold text-gray-900 block text-xs uppercase tracking-wider">
              Items Ordered ({order.items.length})
            </span>
            <div className="divide-y divide-gray-50 max-h-36 overflow-y-auto pr-1">
              {order.items.map((it, idx) => (
                <div key={`${it.product.id}-${idx}`} className="py-1.5 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <img
                      src={it.product.image}
                      alt={it.product.name}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-lg object-contain border border-gray-100 p-0.5 bg-white"
                    />
                    <div>
                      <span className="font-bold text-gray-900">{it.product.name}</span>
                      <span className="text-gray-500 text-[11px] block">
                        {it.product.quantity} × {it.quantity}
                      </span>
                    </div>
                  </div>
                  <span className="font-extrabold text-gray-900">
                    ₹{it.product.price * it.quantity}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-gray-100 flex justify-between items-center font-black text-sm text-gray-900">
              <span>Total Paid ({order.paymentMethod.toUpperCase()})</span>
              <span className="text-emerald-900 font-black">₹{order.totalAmount}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-gray-100 space-y-2">
          <button
            id="order-modal-close-btn"
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-[#064e3b] text-white font-extrabold text-sm hover:bg-[#043c2d] active:scale-98 transition-all shadow-md shadow-emerald-950/20 cursor-pointer"
          >
            View in My Orders
          </button>
        </div>
      </div>
    </div>
  );
};


