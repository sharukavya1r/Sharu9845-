/**
 * Tactile Haptic Feedback Utility
 * Uses navigator.vibrate to simulate physical button clicks and confirmations on supported mobile devices.
 */

export const triggerHaptic = (pattern: number | number[] = 25): boolean => {
  try {
    if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
      return navigator.vibrate(pattern);
    }
  } catch (err) {
    // Gracefully handle iframe / security context restrictions
    console.debug('Haptic feedback not supported or blocked:', err);
  }
  return false;
};

/**
 * Subtle tactile pulse for adding items to the basket
 */
export const vibrateAddToCart = () => {
  // Quick, punchy 35ms pulse
  triggerHaptic([35]);
};

/**
 * Satisfying multi-stage tactile pulse sequence for placing an order / checkout
 */
export const vibrateCheckout = () => {
  // Pattern: pulse -> pause -> medium pulse -> pause -> strong confirmation pulse
  triggerHaptic([40, 40, 60, 40, 110]);
};

/**
 * Gentle tap for star rating and review submissions
 */
export const vibrateFeedback = () => {
  triggerHaptic([30, 30, 45]);
};

/**
 * Success acknowledgment vibration
 */
export const vibrateSuccess = () => {
  triggerHaptic([30, 50, 60]);
};
