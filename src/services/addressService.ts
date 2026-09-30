import { CustomerAddress, DeliveryLocation } from '../types';
import { getActiveSession } from './authService';
import { calculateDeliveryCharge } from '../config/deliveryConfig';
import { toCanonicalUserId } from '../utils/userUtils';

const STORAGE_KEY_USER_ADDRESSES = 'quickbasket_addresses_by_user';
const STORAGE_KEY_USER_SELECTED_ADDR = 'quickbasket_selected_addr_by_user';
const LEGACY_STORAGE_KEY_ADDRESSES = 'quickbasket_saved_addresses';
const LEGACY_STORAGE_KEY_SELECTED_ID = 'quickbasket_selected_address_id';

/**
 * Resolves delivery distance if actual available distance data exists
 * on the address / delivery-area record.
 */
export function getAddressDeliveryDistance(addr: { distanceKm?: number }): number | undefined {
  if (typeof addr.distanceKm === 'number' && !isNaN(addr.distanceKm) && addr.distanceKm >= 0) {
    return addr.distanceKm;
  }
  return undefined;
}

/**
 * Loads all addresses partitioned strictly by customer ID.
 * Maps userId -> CustomerAddress[]
 */
export function getAllUserAddressesMap(): Record<string, CustomerAddress[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER_ADDRESSES);
    const map: Record<string, CustomerAddress[]> = raw ? JSON.parse(raw) : {};

    // One-time safe migration of legacy database entries
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY_ADDRESSES);
    if (legacyRaw) {
      try {
        const legacyList: CustomerAddress[] = JSON.parse(legacyRaw);
        if (Array.isArray(legacyList)) {
          for (const addr of legacyList) {
            if (addr && addr.userId && addr.userId !== 'verified_user') {
              const uId = addr.userId.trim();
              if (!map[uId]) map[uId] = [];
              if (!map[uId].some((existing) => existing.id === addr.id)) {
                map[uId].push(addr);
              }
            }
          }
        }
      } catch (e) {
        console.warn('Legacy address migration warning:', e);
      }
      localStorage.removeItem(LEGACY_STORAGE_KEY_ADDRESSES);
      localStorage.removeItem(LEGACY_STORAGE_KEY_SELECTED_ID);
      localStorage.setItem(STORAGE_KEY_USER_ADDRESSES, JSON.stringify(map));
    }

    return map && typeof map === 'object' ? map : {};
  } catch (err) {
    console.error('Failed to read user addresses from storage:', err);
    return {};
  }
}

/**
 * Saves customer addresses dictionary to persistent storage.
 */
export function saveAllUserAddressesMap(map: Record<string, CustomerAddress[]>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_USER_ADDRESSES, JSON.stringify(map));
  } catch (err) {
    console.error('Failed to save user addresses map:', err);
  }
}

/**
 * Resolves the effective customer user ID.
 */
function resolveEffectiveUserId(userId?: string): string | null {
  if (userId && userId.trim()) return toCanonicalUserId(userId);
  const session = getActiveSession();
  if (session && session.isLoggedIn) {
    return toCanonicalUserId(session.id || session.phone || session.email);
  }
  return null;
}

/**
 * Retrieves saved customer addresses strictly for the authenticated customer.
 * If user is unauthenticated or has no addresses, returns an empty array.
 * Customer B will NEVER see Customer A's addresses.
 */
export function getStoredAddresses(forUserKey?: string): CustomerAddress[] {
  if (typeof window === 'undefined') return [];
  const effectiveKey = resolveEffectiveUserId(forUserKey);
  if (!effectiveKey) {
    // Unauthenticated: strictly return empty list. No leakage!
    return [];
  }

  const map = getAllUserAddressesMap();
  const list = map[effectiveKey];
  return Array.isArray(list) ? list : [];
}

/**
 * Persists customer addresses strictly for the authenticated customer ID.
 */
export function saveStoredAddresses(addresses: CustomerAddress[], forUserKey?: string): void {
  if (typeof window === 'undefined') return;
  const effectiveKey = resolveEffectiveUserId(forUserKey);
  if (!effectiveKey) return;

  const map = getAllUserAddressesMap();
  map[effectiveKey] = Array.isArray(addresses) ? addresses : [];
  saveAllUserAddressesMap(map);
}

/**
 * Gets the ID of the currently selected delivery address for this customer.
 */
export function getSelectedAddressId(forUserKey?: string): string | null {
  if (typeof window === 'undefined') return null;
  const effectiveKey = resolveEffectiveUserId(forUserKey);
  if (!effectiveKey) return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER_SELECTED_ADDR);
    const map = raw ? JSON.parse(raw) : {};
    return map[effectiveKey] || null;
  } catch {
    return null;
  }
}

/**
 * Sets the ID of the currently selected delivery address for this customer.
 */
export function setSelectedAddressId(id: string, forUserKey?: string): void {
  if (typeof window === 'undefined') return;
  const effectiveKey = resolveEffectiveUserId(forUserKey);
  if (!effectiveKey) return;

  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER_SELECTED_ADDR);
    const map = raw ? JSON.parse(raw) : {};
    map[effectiveKey] = id;
    localStorage.setItem(STORAGE_KEY_USER_SELECTED_ADDR, JSON.stringify(map));
  } catch (err) {
    console.warn('Error setting selected address ID:', err);
  }
}

/**
 * Clears the selected address ID for this customer.
 */
export function clearSelectedAddressId(forUserKey?: string): void {
  if (typeof window === 'undefined') return;
  const effectiveKey = resolveEffectiveUserId(forUserKey);
  if (!effectiveKey) return;

  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER_SELECTED_ADDR);
    const map = raw ? JSON.parse(raw) : {};
    delete map[effectiveKey];
    localStorage.setItem(STORAGE_KEY_USER_SELECTED_ADDR, JSON.stringify(map));
  } catch (err) {
    console.warn('Error clearing selected address ID:', err);
  }
}

/**
 * Gets the active delivery address for checkout and header display.
 * Returns the customer's selected address or default saved address.
 * Strictly returns null if the customer is not authenticated or has not saved any address.
 */
export function getActiveDeliveryAddress(forUserKey?: string): CustomerAddress | null {
  const addresses = getStoredAddresses(forUserKey);
  if (addresses.length === 0) return null;

  const selectedId = getSelectedAddressId(forUserKey);
  if (selectedId) {
    const found = addresses.find((a) => a.id === selectedId);
    if (found) return found;
  }

  const defaultAddr = addresses.find((a) => a.isDefault);
  return defaultAddr || addresses[0];
}

/**
 * Saves a new or updated customer address strictly linked to authenticated customer.
 */
export function saveCustomerAddress(
  addressData: Omit<CustomerAddress, 'id' | 'createdAt'>,
  existingId?: string,
  forUserKey?: string
): CustomerAddress {
  const effectiveKey = resolveEffectiveUserId(forUserKey || addressData.userId);
  if (!effectiveKey) {
    throw new Error('Customer must be authenticated to save a delivery address.');
  }

  const addresses = getStoredAddresses(effectiveKey);

  if (existingId) {
    // Update existing address
    const index = addresses.findIndex((a) => a.id === existingId);
    if (index !== -1) {
      const updated: CustomerAddress = {
        ...addresses[index],
        ...addressData,
        userId: effectiveKey,
      };
      addresses[index] = updated;
      saveStoredAddresses(addresses, effectiveKey);
      setSelectedAddressId(updated.id, effectiveKey);
      return updated;
    }
  }

  // Create new address strictly for this user
  const newAddress: CustomerAddress = {
    ...addressData,
    userId: effectiveKey,
    id: `addr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    createdAt: Date.now(),
    isDefault: addresses.length === 0 || addressData.isDefault,
  };

  const updatedList = [newAddress, ...addresses];
  saveStoredAddresses(updatedList, effectiveKey);
  setSelectedAddressId(newAddress.id, effectiveKey);
  return newAddress;
}

/**
 * Deletes a customer address by ID.
 */
export function deleteCustomerAddress(id: string, forUserKey?: string): CustomerAddress[] {
  const effectiveKey = resolveEffectiveUserId(forUserKey);
  if (!effectiveKey) return [];

  const addresses = getStoredAddresses(effectiveKey);
  const filtered = addresses.filter((a) => a.id !== id);
  saveStoredAddresses(filtered, effectiveKey);

  const currentSelectedId = getSelectedAddressId(effectiveKey);
  if (currentSelectedId === id) {
    if (filtered.length > 0) {
      setSelectedAddressId(filtered[0].id, effectiveKey);
    } else {
      clearSelectedAddressId(effectiveKey);
    }
  }

  return filtered;
}

/**
 * Formats a CustomerAddress into a complete single-line string.
 */
export function formatCustomerAddress(addr: CustomerAddress): string {
  const parts = [
    addr.houseNo,
    addr.street,
    addr.village || addr.city,
    addr.district,
    addr.state,
    addr.pincode,
  ].filter(Boolean);

  return parts.join(', ');
}

/**
 * Converts a CustomerAddress into the app's standard DeliveryLocation model.
 */
export function addressToDeliveryLocation(addr: CustomerAddress): DeliveryLocation {
  const fullAddress = formatCustomerAddress(addr);
  const villageName = addr.village || addr.city || '';
  const shortArea = addr.street
    ? `${addr.street}, ${villageName}`
    : `${addr.houseNo}, ${villageName}`;

  const distanceKm = getAddressDeliveryDistance(addr);

  let isServiceable = true;
  if (typeof distanceKm === 'number') {
    const charge = calculateDeliveryCharge(distanceKm);
    isServiceable = charge !== null;
  }

  return {
    id: addr.id,
    fullName: addr.fullName,
    mobile: addr.mobile,
    houseNo: addr.houseNo,
    street: addr.street,
    village: villageName,
    city: addr.city || villageName,
    district: addr.district,
    state: addr.state,
    pincode: addr.pincode,
    area: villageName || shortArea,
    landmark: shortArea,
    houseDetails: addr.houseNo,
    formattedAddress: `${addr.fullName} (${addr.mobile}) - ${fullAddress}`,
    isDefault: addr.isDefault,
    isServiceable,
    isTenMinEligible: isServiceable && (typeof distanceKm === 'number' ? distanceKm <= 3.0 : true),
    distanceKm,
  };
}

/**
 * Validation rules for the 5-field Delivery Address form.
 */
export interface AddressFormValidationErrors {
  fullName?: string;
  mobile?: string;
  houseNo?: string;
  street?: string;
  village?: string;
}

export function validateCustomerAddress(data: {
  fullName: string;
  mobile: string;
  houseNo: string;
  street: string;
  village: string;
}): AddressFormValidationErrors {
  const errors: AddressFormValidationErrors = {};

  if (!data.fullName.trim()) {
    errors.fullName = 'Full Name is required';
  } else if (data.fullName.trim().length < 2) {
    errors.fullName = 'Please enter a valid full name';
  }

  const cleanMobile = data.mobile.trim().replace(/\D/g, '');
  if (!cleanMobile) {
    errors.mobile = 'Mobile Number is required';
  } else if (cleanMobile.length !== 10) {
    errors.mobile = 'Enter a valid 10-digit mobile number';
  } else if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
    errors.mobile = 'Mobile number must start with 6, 7, 8, or 9';
  }

  if (!data.houseNo.trim()) {
    errors.houseNo = 'House is required';
  }

  if (!data.street.trim()) {
    errors.street = 'Street / Area is required';
  }

  if (!data.village.trim()) {
    errors.village = 'Village is required';
  }

  return errors;
}
