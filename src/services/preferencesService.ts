import { toCanonicalUserId } from '../utils/userUtils';

export interface CustomerPreferences {
  language?: 'en' | 'kn';
  viewMode?: 'mobile-frame' | 'expanded';
  theme?: string;
  savedAt?: number;
}

const STORAGE_KEY_USER_PREFERENCES = 'quickbasket_preferences_by_user';

/**
 * Loads the user preferences dictionary from persistent storage.
 * Maps canonical userId -> CustomerPreferences
 */
export function getAllUserPreferencesMap(): Record<string, CustomerPreferences> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER_PREFERENCES);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    console.error('Failed to read user preferences map from storage:', err);
    return {};
  }
}

/**
 * Returns saved account preferences strictly belonging to the authenticated customer ID.
 */
export function getUserPreferences(rawUserId?: string | null): CustomerPreferences {
  const canonicalId = toCanonicalUserId(rawUserId);
  if (!canonicalId || typeof window === 'undefined') {
    return {};
  }
  const map = getAllUserPreferencesMap();
  return map[canonicalId] || {};
}

/**
 * Saves account preferences strictly linked to the authenticated customer's canonical ID.
 */
export function saveUserPreferences(
  rawUserId: string,
  prefs: Partial<CustomerPreferences>
): void {
  const canonicalId = toCanonicalUserId(rawUserId);
  if (!canonicalId || typeof window === 'undefined') {
    return;
  }
  const map = getAllUserPreferencesMap();
  map[canonicalId] = {
    ...(map[canonicalId] || {}),
    ...prefs,
    savedAt: Date.now(),
  };
  try {
    localStorage.setItem(STORAGE_KEY_USER_PREFERENCES, JSON.stringify(map));
  } catch (err) {
    console.error('Failed to save customer preferences:', err);
  }
}
