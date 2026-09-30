export interface PriceAlert {
  productId: string;
  productName: string;
  originalPrice: number; // The reference price when the alert was created
  targetPrice?: number;   // Optional specific price threshold requested
  createdAt: number;
  lastCheckedAt: number;
  notified: boolean;
  simulatedPrice?: number; // Used to simulate a price reduction for testing
}

const STORAGE_KEY = 'quickbasket_price_drop_alerts';

/**
 * Retrieve all price alerts from local storage
 */
export function getPriceAlerts(): Record<string, PriceAlert> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read price alerts from localStorage:', err);
    return {};
  }
}

/**
 * Save all price alerts to local storage
 */
export function savePriceAlerts(alerts: Record<string, PriceAlert>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  } catch (err) {
    console.error('Failed to save price alerts to localStorage:', err);
  }
}

/**
 * Check if a price alert exists for a product
 */
export function getPriceAlert(productId: string): PriceAlert | null {
  const alerts = getPriceAlerts();
  return alerts[productId] || null;
}

/**
 * Set or toggle a price drop alert for a product
 */
export function setPriceAlert(
  productId: string,
  productName: string,
  price: number,
  targetPrice?: number
): PriceAlert {
  const alerts = getPriceAlerts();
  const existing = alerts[productId];

  const updated: PriceAlert = {
    productId,
    productName,
    originalPrice: existing ? existing.originalPrice : price,
    targetPrice: targetPrice ?? (price > 20 ? price - 10 : Math.max(1, price - 2)),
    createdAt: existing ? existing.createdAt : Date.now(),
    lastCheckedAt: Date.now(),
    notified: false,
    simulatedPrice: existing?.simulatedPrice,
  };

  alerts[productId] = updated;
  savePriceAlerts(alerts);
  return updated;
}

/**
 * Remove a price alert
 */
export function removePriceAlert(productId: string): boolean {
  const alerts = getPriceAlerts();
  if (alerts[productId]) {
    delete alerts[productId];
    savePriceAlerts(alerts);
    return true;
  }
  return false;
}

export interface PriceDropCheckResult {
  hasDropped: boolean;
  originalPrice: number;
  effectivePrice: number;
  savings: number;
  isSimulated: boolean;
  percentageDrop: number;
  lastCheckedAt: number;
}

/**
 * Checks local storage for any price drop on the specified product
 */
export function checkPriceDrop(
  productId: string,
  currentMarketPrice: number
): PriceDropCheckResult | null {
  const alerts = getPriceAlerts();
  const alert = alerts[productId];
  if (!alert) return null;

  // Use simulated price if active, otherwise current catalog price
  const isSimulated = typeof alert.simulatedPrice === 'number';
  const effectivePrice = isSimulated ? (alert.simulatedPrice as number) : currentMarketPrice;

  // Update check timestamp
  alert.lastCheckedAt = Date.now();
  alerts[productId] = alert;
  savePriceAlerts(alerts);

  if (effectivePrice < alert.originalPrice) {
    const savings = alert.originalPrice - effectivePrice;
    const percentageDrop = Math.round((savings / alert.originalPrice) * 100);
    return {
      hasDropped: true,
      originalPrice: alert.originalPrice,
      effectivePrice,
      savings,
      isSimulated,
      percentageDrop,
      lastCheckedAt: alert.lastCheckedAt,
    };
  }

  return {
    hasDropped: false,
    originalPrice: alert.originalPrice,
    effectivePrice,
    savings: 0,
    isSimulated: false,
    percentageDrop: 0,
    lastCheckedAt: alert.lastCheckedAt,
  };
}

/**
 * Simulates a price drop for a specific product by writing a lower price to local storage
 */
export function simulatePriceDrop(
  productId: string,
  dropAmount: number = 15
): PriceAlert | null {
  const alerts = getPriceAlerts();
  const alert = alerts[productId];
  if (!alert) return null;

  const calculatedDrop = Math.min(dropAmount, Math.max(1, alert.originalPrice - 5));
  alert.simulatedPrice = Math.max(1, alert.originalPrice - calculatedDrop);
  alert.lastCheckedAt = Date.now();
  alert.notified = true;

  alerts[productId] = alert;
  savePriceAlerts(alerts);
  return alert;
}

/**
 * Resets the simulated price drop back to standard
 */
export function resetSimulatedPriceDrop(productId: string): PriceAlert | null {
  const alerts = getPriceAlerts();
  const alert = alerts[productId];
  if (!alert) return null;

  delete alert.simulatedPrice;
  alert.lastCheckedAt = Date.now();
  alert.notified = false;

  alerts[productId] = alert;
  savePriceAlerts(alerts);
  return alert;
}
