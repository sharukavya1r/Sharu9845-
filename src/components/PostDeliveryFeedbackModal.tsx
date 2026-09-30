import React, { useState, useEffect } from 'react';
import {
  Star,
  Sparkles,
  Bike,
  ThumbsUp,
  MessageSquare,
  Check,
  X,
  Heart,
  ShieldCheck,
  Clock,
  PackageCheck,
} from 'lucide-react';
import { Order } from '../types';
import { updateOrderFeedback } from '../services/orderService';
import { vibrateFeedback, vibrateSuccess } from '../utils/haptics';

export interface PostDeliveryFeedbackModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onSubmitSuccess?: (updatedOrder: Order) => void;
}

const FEEDBACK_TAG_OPTIONS = [
  '⚡ Lightning 10-Min Speed',
  '🛵 Courteous & Polite Rider',
  '📦 Clean Thermal Packaging',
  '🥦 Farm Fresh Quality',
  '📍 Exact Doorstep Drop',
  '💰 Great Value & Savings',
  '📱 Accurate GPS Tracking',
];

const RATING_DETAILS: Record<
  number,
  { title: string; subtitle: string; emoji: string }
> = {
  1: {
    emoji: '😞',
    title: 'Needs Improvement',
    subtitle: 'We apologize for the inconvenience and will do better.',
  },
  2: {
    emoji: '😐',
    title: 'Fair Experience',
    subtitle: 'Let us know how we can make your next delivery faster.',
  },
  3: {
    emoji: '🙂',
    title: 'Good Delivery',
    subtitle: 'Thank you for shopping with QuickBasket Lakkavalli.',
  },
  4: {
    emoji: '😊',
    title: 'Great Experience',
    subtitle: 'Fast, fresh, and delivered with care!',
  },
  5: {
    emoji: '🤩',
    title: 'Outstanding 10-Min Express!',
    subtitle: 'Lightning fast doorstep delivery in Lakkavalli!',
  },
};

export const PostDeliveryFeedbackModal: React.FC<PostDeliveryFeedbackModalProps> = ({
  isOpen,
  order,
  onClose,
  onSubmitSuccess,
}) => {
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [complimentRider, setComplimentRider] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Initialize or reset values when opened for a new order
  useEffect(() => {
    if (isOpen && order) {
      setSelectedRating(order.rating || 5);
      setComment(order.feedbackComment || '');
      setSelectedTags(order.feedbackTags || []);
      setComplimentRider(
        order.feedbackTags?.includes('🛵 Courteous & Polite Rider') || false
      );
      setIsSubmitted(false);
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const displayRating = hoverRating || selectedRating;
  const ratingInfo = RATING_DETAILS[displayRating] || RATING_DETAILS[5];

  const handleStarClick = (star: number) => {
    vibrateFeedback();
    setSelectedRating(star);
  };

  const handleToggleTag = (tag: string) => {
    vibrateFeedback();
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleToggleCompliment = () => {
    vibrateFeedback();
    const nextState = !complimentRider;
    setComplimentRider(nextState);
    if (nextState && !selectedTags.includes('🛵 Courteous & Polite Rider')) {
      setSelectedTags((prev) => [...prev, '🛵 Courteous & Polite Rider']);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    vibrateSuccess();

    const finalTags =
      complimentRider && !selectedTags.includes('🛵 Courteous & Polite Rider')
        ? [...selectedTags, '🛵 Courteous & Polite Rider']
        : selectedTags;

    // Save to database
    updateOrderFeedback(order.id, selectedRating, comment.trim(), finalTags);

    const updatedOrder: Order = {
      ...order,
      rating: selectedRating,
      feedbackComment: comment.trim(),
      feedbackTags: finalTags,
    };

    setIsSubmitted(true);

    if (onSubmitSuccess) {
      onSubmitSuccess(updatedOrder);
    }

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-70 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Celebration Header */}
        <div className="bg-gradient-to-r from-[#064e3b] via-[#043c2d] to-[#022c22] text-white p-4 sm:p-5 relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-emerald-500/20 rounded-full blur-xl pointer-events-none" />

          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-800/80 border border-emerald-500/40 text-[10px] font-black text-emerald-200">
                <Sparkles className="w-3 h-3 text-emerald-300" />
                <span>Delivered in Lakkavalli</span>
              </div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white pt-0.5">
                Rate Your Delivery Experience
              </h3>
              <p className="text-[11px] text-emerald-200/90 font-medium">
                Order #{order.id} • {order.items.length} items (₹{order.totalAmount})
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Submitted Success Confirmation Screen */}
        {isSubmitted ? (
          <div className="p-8 text-center space-y-4 my-auto animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner ring-4 ring-emerald-50">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-black text-gray-900">
                Thank You for Your Feedback!
              </h4>
              <p className="text-xs text-gray-600 max-w-xs mx-auto">
                Your rating helps us keep Lakkavalli's 10-minute delivery fast, fresh, and friendly.
              </p>
            </div>
            <div className="inline-flex items-center gap-1 text-amber-500 font-extrabold text-sm pt-1">
              {[...Array(selectedRating)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-500" />
              ))}
            </div>
          </div>
        ) : (
          /* Form Content */
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 text-xs">
            {/* Delivery Rider Card */}
            {order.rider ? (
              <div className="bg-emerald-50/80 rounded-2xl p-3 border border-emerald-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#064e3b] text-white flex items-center justify-center font-black text-xs shadow-2xs">
                    <Bike className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-gray-900 text-xs">
                        {order.rider.name}
                      </span>
                      <span className="text-[9px] font-black bg-white text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
                        ⚡ 10-Min Rider
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500 block">
                      Delivered via {order.rider.vehicle || 'Electric Scooter'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleCompliment}
                  className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    complimentRider
                      ? 'bg-[#064e3b] text-white border-[#064e3b] shadow-2xs'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-emerald-50'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>{complimentRider ? 'Complimented!' : 'Compliment'}</span>
                </button>
              </div>
            ) : (
              <div className="bg-emerald-50/50 rounded-2xl p-2.5 border border-emerald-100 flex items-center gap-2 text-emerald-900 text-xs font-semibold">
                <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Delivered to {order.deliveryAddress}</span>
              </div>
            )}

            {/* Interactive Star Rating Selector */}
            <div className="bg-gradient-to-b from-amber-50/80 to-white rounded-2xl p-4 border border-amber-200/80 text-center space-y-2 shadow-2xs">
              <span className="text-[11px] font-black text-amber-950 uppercase tracking-wider block">
                How was your 10-minute delivery?
              </span>

              {/* 5 Stars */}
              <div className="flex justify-center items-center gap-2.5 pt-1 pb-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = displayRating >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => handleStarClick(star)}
                      className="p-1 hover:scale-125 active:scale-90 transition-transform cursor-pointer focus:outline-none"
                      aria-label={`Rate ${star} star`}
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          isFilled
                            ? 'fill-amber-400 text-amber-500 drop-shadow-xs'
                            : 'text-gray-300 stroke-[1.5]'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Rating description banner */}
              {ratingInfo && (
                <div className="animate-in fade-in zoom-in-95 duration-150 pt-0.5">
                  <span className="text-sm font-black text-amber-950 block">
                    {ratingInfo.emoji} {ratingInfo.title}
                  </span>
                  <span className="text-[11px] text-amber-800/90 font-medium">
                    {ratingInfo.subtitle}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Feedback Tags */}
            <div className="space-y-2">
              <span className="text-[11px] font-black text-gray-700 uppercase tracking-wider block">
                What went well? (Select all that apply)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {FEEDBACK_TAG_OPTIONS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer active:scale-95 ${
                        isSelected
                          ? 'bg-[#064e3b] text-white border-[#064e3b] shadow-2xs'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Short Text Comment */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px] text-gray-700 font-bold">
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                  Additional Comments (Optional)
                </span>
                <span className="text-[10px] text-gray-400 font-normal">
                  {comment.length}/280
                </span>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 280))}
                placeholder="Tell us about the delivery speed, packaging freshness, or rider friendliness..."
                rows={3}
                className="w-full p-3 rounded-2xl border border-gray-200 focus:outline-none focus:border-[#064e3b] focus:ring-2 focus:ring-[#064e3b]/20 text-xs text-gray-900 bg-gray-50/50 resize-none font-medium placeholder:text-gray-400"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-[#064e3b] hover:bg-[#043c2d] active:scale-95 text-white text-xs font-black transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Submit Feedback</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-3 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Skip
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
