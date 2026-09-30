export interface BusinessConfig {
  brandName: string;
  legalEntity: string;
  hubName: string;
  hubAddress: string;
  landmark: string;
  postalCode: string;
  taluk: string;
  district: string;
  state: string;
  deliveryPromise: string;
  supportPhone?: string;
  supportEmail: string;
  operatingHours: string;
  copyright: string;
}

export const BUSINESS_CONFIG: BusinessConfig = {
  brandName: 'QuickBasket',
  legalEntity: 'Sharu Enterprises',
  hubName: 'Lakkavalli Local Hub',
  hubAddress: 'Bhadra Reservoir Road, Lakkavalli',
  landmark: 'Near Bhadra Reservoir Channel & Main Bazaar',
  postalCode: '577128',
  taluk: 'Tarikere',
  district: 'Chikkamagaluru',
  state: 'Karnataka',
  deliveryPromise: 'Guaranteed 10-Minute Delivery',
  // Real environment-configured support phone if provided by business owner
  supportPhone: import.meta.env.VITE_SUPPORT_PHONE || '',
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || 'support@quickbasket.in',
  operatingHours: '6:30 AM – 10:30 PM (Daily)',
  copyright: '© 2026 Sharu Enterprises. All Rights Reserved.',
};
