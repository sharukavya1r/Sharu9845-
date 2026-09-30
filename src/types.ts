export interface ProductItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  mrp?: number;
  discountPercent?: number;
  image: string;
  images?: string[];
  category: string;
  quantity: string;
  unit?: string;
  brand?: string;
  inStock?: boolean;
  stock?: number;
  createdAt?: number | string;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  description?: string;
  specifications?: Record<string, unknown> | string[];
  warranty?: string;
  manufacturerInfo?: string;
}

export type Product = ProductItem;

export interface CategoryItem {
  id: string;
  name: string;
  icon?: string;
  image?: string;
  iconName?: string;
}

export type Category = CategoryItem;

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CustomerAddress {
  id: string;
  userId?: string;
  fullName: string;
  mobile: string;
  houseNo: string;
  street: string;
  village: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  isDefault?: boolean;
  createdAt: number;
  distanceKm?: number;
}

export interface DeliveryLocation {
  id: string;
  fullName?: string;
  mobile?: string;
  houseNo?: string;
  street?: string;
  city?: string;
  area: string;
  landmark: string;
  village?: string;
  taluk?: string;
  district?: string;
  state?: string;
  pincode?: string;
  houseDetails?: string;
  formattedAddress?: string;
  isDefault?: boolean;
  isServiceable?: boolean;
  isTenMinEligible?: boolean;
  distanceKm?: number;
}

export interface RiderInfo {
  name: string;
  phone: string;
  vehicle?: string;
  currentLocation?: {
    lat: number;
    lng: number;
  };
}

export interface Order {
  id: string;
  userId?: string; // Links order to the logged-in user phone/id
  items: CartItem[];
  itemTotal: number;
  discount: number;
  deliveryFee: number;
  totalAmount: number;
  orderTimestamp: number; // actual millisecond timestamp for dynamic calculation
  createdAt?: number; // timestamp alias for order creation time
  orderTime: string; // formatted date & time
  status: 'confirmed' | 'packing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  rating?: number; // 1 to 5 star rating given by user once delivered
  feedbackComment?: string; // Short text comment submitted by the customer
  feedbackTags?: string[]; // Quick tags selected in feedback modal
  estimatedDeliveryTimestamp?: number; // actual estimated arrival timestamp
  deliveredTimestamp?: number; // actual delivered timestamp
  deliveryAddress: string;
  rider?: RiderInfo | null; // Real rider info only when assigned
  paymentMethod: 'cod' | 'upi' | 'card';
}

export interface UserProfile {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  isLoggedIn: boolean;
  avatarUrl?: string;
  memberSince?: string;
  authProvider?: 'phone' | 'google' | 'email';
  isVerified?: boolean;
  preferredLanguage?: 'en' | 'kn';
}
