/**
 * QuickBasket – Lakkavalli Grocery Web App
 * Central Delivery Charge & Distance Configuration
 *
 * EXACT DELIVERY CHARGE SLABS:
 * 0–1 km        → ₹15
 * Above 1–2 km  → ₹20
 * Above 2–2.5 km → ₹25
 * Above 2.5–3 km → ₹26
 * Above 3–5 km  → ₹28
 *
 * Maximum delivery distance = 5 km.
 * Above 5 km → Delivery not available
 */

export interface DeliveryChargeSlab {
  minKmExclusive: number;
  maxKmInclusive: number;
  charge: number;
  label: string;
}

export const MAX_DELIVERY_DISTANCE_KM = 5;
export const DELIVERY_UNAVAILABLE_MESSAGE = 'Delivery is not available at this location.';

export const DELIVERY_CHARGE_SLABS: readonly DeliveryChargeSlab[] = [
  { minKmExclusive: 0, maxKmInclusive: 1, charge: 15, label: '0–1 km' },
  { minKmExclusive: 1, maxKmInclusive: 2, charge: 20, label: 'Above 1–2 km' },
  { minKmExclusive: 2, maxKmInclusive: 2.5, charge: 25, label: 'Above 2–2.5 km' },
  { minKmExclusive: 2.5, maxKmInclusive: 3, charge: 26, label: 'Above 2.5–3 km' },
  { minKmExclusive: 3, maxKmInclusive: 5, charge: 28, label: 'Above 3–5 km' },
] as const;

/**
 * Reusable calculateDeliveryCharge function.
 *
 * Calculates the exact distance-based delivery charge according to business slabs.
 * Returns the exact delivery charge amount in ₹ (number), or null if the distance
 * exceeds the maximum 5 km limit or is invalid.
 *
 * @param distanceKm Distance in kilometers from Lakkavalli Dark Store Hub
 * @returns Delivery charge in ₹ or null if above 5 km
 *
 * EXAMPLES:
 * - 1 km      → ₹15
 * - 1.5 km    → ₹20
 * - 2 km      → ₹20
 * - 2.2 km    → ₹25
 * - 2.5 km    → ₹25
 * - 2.7 km    → ₹26
 * - 3 km      → ₹26
 * - 3.5 km    → ₹28
 * - 5 km      → ₹28
 * - Above 5 km → null (Delivery not available)
 */
export function calculateDeliveryCharge(distanceKm: number): number | null {
  if (typeof distanceKm !== 'number' || isNaN(distanceKm) || distanceKm < 0) {
    return null;
  }

  // Maximum delivery distance = 5 km. Above 5 km → Delivery not available
  if (distanceKm > MAX_DELIVERY_DISTANCE_KM) {
    return null;
  }

  if (distanceKm <= 1) {
    return 15;
  }
  if (distanceKm <= 2) {
    return 20;
  }
  if (distanceKm <= 2.5) {
    return 25;
  }
  if (distanceKm <= 3) {
    return 26;
  }
  if (distanceKm <= 5) {
    return 28;
  }

  return null;
}

export interface DeliveryCalculationResult {
  charge: number | null;
  isDeliverable: boolean;
  distanceKm: number;
  message?: string;
}

/**
 * Helper to obtain full delivery calculation breakdown for Cart and Checkout.
 */
export function getDeliveryChargeResult(distanceKm: number | null | undefined): DeliveryCalculationResult {
  if (distanceKm === null || distanceKm === undefined || isNaN(distanceKm)) {
    return {
      charge: null,
      isDeliverable: false,
      distanceKm: 0,
      message: 'Delivery location required to calculate delivery charge.',
    };
  }

  const charge = calculateDeliveryCharge(distanceKm);

  if (charge === null) {
    return {
      charge: null,
      isDeliverable: false,
      distanceKm,
      message: DELIVERY_UNAVAILABLE_MESSAGE,
    };
  }

  return {
    charge,
    isDeliverable: true,
    distanceKm,
  };
}
