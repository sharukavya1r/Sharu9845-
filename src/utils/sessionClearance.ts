/**
 * Session Clearance Utility
 * 
 * Thoroughly purges all customer-specific data from localStorage,
 * sessionStorage, and memory upon logout to ensure complete data isolation,
 * while preserving permanent account data associated with customer IDs.
 */

const SESSION_STORAGE_KEY = 'qukebasket_auth_session';
const OTP_CHALLENGE_KEY = 'quickbasket_otp_challenge';
const PASSWORD_RESET_KEY = 'quickbasket_reset_challenge';

// Transient / Legacy keys that must never persist across customer sessions
const TRANSIENT_OR_LEGACY_KEYS = [
  SESSION_STORAGE_KEY,
  OTP_CHALLENGE_KEY,
  PASSWORD_RESET_KEY,
  'quickbasket_saved_location',
  'quickbasket_selected_address_id',
  'quickbasket_saved_addresses',
  'quickbasket_orders_db',
  'quickbasket_checkout_draft',
  'quickbasket_temp_cart',
  'quickbasket_search_history',
];

// Set of registered in-memory cleaner callbacks
const memoryCleaners = new Set<() => void>();

/**
 * Register an in-memory cleaner callback to be executed when session data is purged.
 * Returns an unregister function for component lifecycle management (e.g. in useEffect cleanup).
 */
export function registerMemoryCleaner(cleaner: () => void): () => void {
  memoryCleaners.add(cleaner);
  return () => {
    memoryCleaners.delete(cleaner);
  };
}

/**
 * Execute all registered in-memory cleaner functions.
 */
export function runMemoryCleaners(): void {
  memoryCleaners.forEach((cleaner) => {
    try {
      cleaner();
    } catch (err) {
      console.error('Error running memory cleaner:', err);
    }
  });
}

export interface SessionPurgeOptions {
  /**
   * If true (default), preserves permanent partitioned vaults (orders_by_user,
   * addresses_by_user, user_accounts, carts_by_user, preferences_by_user).
   * Only active session tokens and transient caches are purged.
   */
  preservePersistentVault?: boolean;
  /**
   * Optional callback after memory has been cleared.
   */
  onComplete?: () => void;
}

/**
 * Thoroughly purges all customer-specific session data from:
 * 1. localStorage (active session token, unpartitioned legacy pointers, temporary drafts)
 * 2. sessionStorage (all keys including OTP challenges, auth challenges, form states)
 * 3. Memory (executes all registered memory cleaners and dispatches session-purged event)
 */
export function purgeSessionData(options: SessionPurgeOptions = {}): void {
  const { preservePersistentVault = true, onComplete } = options;

  // 1. Purge sessionStorage completely
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.clear();
    } catch (err) {
      console.warn('Failed to clear sessionStorage:', err);
      // Fallback: manually remove known keys
      try {
        window.sessionStorage.removeItem(OTP_CHALLENGE_KEY);
        window.sessionStorage.removeItem(PASSWORD_RESET_KEY);
      } catch (fallbackErr) {
        console.error('Failed to remove sessionStorage fallback keys:', fallbackErr);
      }
    }
  }

  // 2. Purge transient / active session keys from localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      // Remove all known transient / legacy keys
      for (const key of TRANSIENT_OR_LEGACY_KEYS) {
        window.localStorage.removeItem(key);
      }

      // Check for any temporary or draft keys with prefixes
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && (
          key.startsWith('quickbasket_temp_') ||
          key.startsWith('quickbasket_draft_') ||
          key.startsWith('quickbasket_session_')
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => window.localStorage.removeItem(k));

      // If preservePersistentVault is false (explicit hard wipe requested),
      // we would wipe user accounts, but by default we strictly preserve customer permanent records.
      if (!preservePersistentVault) {
        window.localStorage.clear();
      }
    } catch (err) {
      console.error('Failed to clear localStorage session keys:', err);
    }
  }

  // 3. Purge In-Memory State across all active components & subscribers
  try {
    runMemoryCleaners();
  } catch (err) {
    console.error('Failed to run in-memory cleaners during session purge:', err);
  }

  // 4. Dispatch a custom window event for any independent component listeners
  if (typeof window !== 'undefined') {
    try {
      const event = new CustomEvent('quickbasket:session-purged', {
        detail: { timestamp: Date.now() },
      });
      window.dispatchEvent(event);
    } catch (err) {
      console.warn('CustomEvent not supported or failed to dispatch:', err);
    }
  }

  if (onComplete) {
    try {
      onComplete();
    } catch (err) {
      console.error('Error in onComplete callback of purgeSessionData:', err);
    }
  }
}

/**
 * Checks whether an active authenticated session currently exists.
 */
export function isSessionActive(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Boolean(parsed && parsed.isLoggedIn);
  } catch {
    return false;
  }
}
