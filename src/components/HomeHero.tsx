import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HERO_SLIDES, BannerSlide } from '../data/hero';

export type { BannerSlide };
export { HERO_SLIDES };

interface HomeHeroProps {
  onShopNow?: (category?: string) => void;
}

export const HomeHero: React.FC<HomeHeroProps> = ({ onShopNow }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % HERO_SLIDES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  }, []);

  // Automatic gentle transition one by one every 4.5 seconds
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 4500);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide]);

  // Touch handlers for smooth mobile swipe gestures (invisible swipe controls, no buttons)
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 40;
    const isRightSwipe = distance < -40;

    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <section
      className="px-3.5 py-2 select-none"
      aria-label="QuickBasket Promotional Hero Banner"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-xl mx-auto">
        {/* Banner container with exact QuickBasket rounded corners, dimensions, and premium styling */}
        <div
          className="relative overflow-hidden rounded-2xl shadow-xs border border-emerald-100/90 bg-white"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Smooth horizontal slide track */}
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {HERO_SLIDES.map((slide, index) => (
              <div
                key={slide.id}
                id={`hero-banner-slide-${slide.id}`}
                onClick={() => onShopNow?.(slide.category)}
                className="w-full shrink-0 relative aspect-[16/9] sm:aspect-[2.1/1] overflow-hidden bg-emerald-50/20 cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={`Shop ${slide.title}`}
              >
                {/* Complete, naturally integrated banner image in the exact same style */}
                <img
                  src={slide.imageSrc}
                  alt={slide.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center"
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
