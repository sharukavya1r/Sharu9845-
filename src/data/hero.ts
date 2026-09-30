export interface BannerSlide {
  id: string;
  title: string;
  category: string;
  imageSrc: string;
}

export const HERO_BANNER = {
  titleLine1: 'Fresh Groceries',
  titleLine2: 'Delivered in 10 Minutes',
  ctaText: 'Shop Now',
  image: '/hero-banner.jpg',
};

export const HERO_SLIDES: BannerSlide[] = [
  {
    id: 'vegetables',
    title: 'Fresh Vegetables',
    category: 'Vegetables',
    imageSrc: '/hero-vegetables.jpg',
  },
  {
    id: 'meat-fish',
    title: 'Fresh Chicken, Fish & Mutton',
    category: 'Meat & Eggs',
    imageSrc: '/hero-meat-fish.jpg',
  },
  {
    id: 'fruits',
    title: 'Fresh Fruits',
    category: 'Fruits',
    imageSrc: '/hero-fruits.jpg',
  },
  {
    id: 'snacks',
    title: 'Snacks',
    category: 'Snacks',
    imageSrc: '/hero-snacks.jpg',
  },
];
