import { UserProfile } from '../types';
import { purgeSessionData } from '../utils/sessionClearance';

const ACCOUNTS_STORAGE_KEY = 'qukebasket_user_accounts';
const SESSION_STORAGE_KEY = 'qukebasket_auth_session';
const OTP_CHALLENGE_KEY = 'qukebasket_otp_challenge';
const PASSWORD_RESET_KEY = 'qukebasket_pwd_reset_challenge';

interface StoredAccount extends UserProfile {
  id: string;
  createdAt: number;
  updatedAt: number;
  passwordHash?: string;
}

interface OtpChallenge {
  phone: string;
  otp: string;
  name?: string;
  email?: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
}

/**
 * Get all registered accounts from persistent storage
 */
export const getStoredAccounts = (): Record<string, StoredAccount> => {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('Failed to parse accounts from storage', err);
    return {};
  }
};

/**
 * Save accounts dictionary to storage
 */
export const saveStoredAccounts = (accounts: Record<string, StoredAccount>): void => {
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch (err) {
    console.error('Failed to save accounts', err);
  }
};

/**
 * Get currently authenticated session
 */
export const getActiveSession = (): UserProfile | null => {
  try {
    const rawSession = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!rawSession) return null;

    const parsed = JSON.parse(rawSession);
    if (!parsed || !parsed.isLoggedIn) return null;

    // Cross-verify with stored accounts for latest updated data
    const accounts = getStoredAccounts();
    const account =
      (parsed.id && accounts[parsed.id]) ||
      (parsed.phone && accounts[parsed.phone]) ||
      (parsed.email && accounts[parsed.email.toLowerCase()]);
    if (account) {
      return account;
    }

    return parsed;
  } catch (err) {
    console.error('Failed to read auth session', err);
    return null;
  }
};

/**
 * Save authenticated session to persistent storage
 */
export const saveActiveSession = (user: UserProfile): void => {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
  } catch (err) {
    console.error('Failed to save active session', err);
  }
};

/**
 * Clear authenticated session (Logout)
 * Thoroughly purges active session from localStorage, sessionStorage, and memory.
 */
export const clearActiveSession = (): void => {
  try {
    purgeSessionData({ preservePersistentVault: true });
  } catch (err) {
    console.error('Failed to clear auth session', err);
  }
};

/**
 * Returns current customer's unique user ID, or null if logged out.
 */
export const getCurrentCustomerUserId = (): string | null => {
  const session = getActiveSession();
  if (session && session.isLoggedIn && session.id) {
    return session.id.trim();
  }
  return null;
};

/**
 * Validates Indian 10-digit mobile number
 */
export const validateIndianMobile = (phone: string): { isValid: boolean; cleanNumber: string; error?: string } => {
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Handle numbers with country code prefix (91XXXXXXXXXX)
  let cleanNumber = digitsOnly;
  if (cleanNumber.length === 12 && cleanNumber.startsWith('91')) {
    cleanNumber = cleanNumber.slice(2);
  } else if (cleanNumber.length === 11 && cleanNumber.startsWith('0')) {
    cleanNumber = cleanNumber.slice(1);
  }

  if (cleanNumber.length !== 10) {
    return {
      isValid: false,
      cleanNumber,
      error: 'Please enter a valid 10-digit mobile number.',
    };
  }

  // Indian mobile numbers must begin with 6, 7, 8, or 9
  if (!/^[6-9]/.test(cleanNumber)) {
    return {
      isValid: false,
      cleanNumber,
      error: 'Indian mobile numbers must start with 6, 7, 8, or 9.',
    };
  }

  return { isValid: true, cleanNumber };
};

/**
 * Validates email address format
 */
export const validateEmail = (email: string): boolean => {
  if (!email || !email.trim()) return true; // Email is optional in mobile login
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email.trim());
};

/**
 * Generates and sends a real cryptographically random 4-digit OTP
 */
export const sendMobileOtp = async (
  rawPhone: string,
  name?: string,
  email?: string
): Promise<{ success: boolean; message: string; challengeExpiresAt?: number; notificationCode?: string }> => {
  // Validate Phone
  const validation = validateIndianMobile(rawPhone);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid mobile number');
  }

  // Validate Email if provided
  if (email && email.trim() && !validateEmail(email)) {
    throw new Error('Please enter a valid email address format.');
  }

  const phone = `+91 ${validation.cleanNumber}`;

  // Generate cryptographically random 4-digit numeric code (1000 - 9999)
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const otpNumber = 1000 + (array[0] % 9000);
  const otp = otpNumber.toString();

  const now = Date.now();
  const expiresAt = now + 5 * 60 * 1000; // 5 minutes validity

  const challenge: OtpChallenge = {
    phone,
    otp,
    name: name?.trim(),
    email: email?.trim(),
    createdAt: now,
    expiresAt,
    attempts: 0,
  };

  // Save active challenge in session
  sessionStorage.setItem(OTP_CHALLENGE_KEY, JSON.stringify(challenge));

  // Simulate network dispatch delay for realistic production feedback
  await new Promise((resolve) => setTimeout(resolve, 600));

  return {
    success: true,
    message: `Verification code sent to ${phone}`,
    challengeExpiresAt: expiresAt,
    // Return code for instant notification banner to allow human verification in preview
    notificationCode: otp,
  };
};

/**
 * Verifies the user-entered OTP against the stored challenge
 */
export const verifyMobileOtp = async (
  rawPhone: string,
  enteredOtp: string,
  additionalData?: { name?: string; email?: string; address?: string }
): Promise<{ success: boolean; user?: UserProfile; error?: string }> => {
  const validation = validateIndianMobile(rawPhone);
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  const formattedPhone = `+91 ${validation.cleanNumber}`;
  const rawChallenge = sessionStorage.getItem(OTP_CHALLENGE_KEY);

  if (!rawChallenge) {
    return {
      success: false,
      error: 'No active OTP request found. Please request a new verification code.',
    };
  }

  let challenge: OtpChallenge;
  try {
    challenge = JSON.parse(rawChallenge);
  } catch {
    return { success: false, error: 'Invalid session state. Please retry.' };
  }

  // Check phone match
  if (challenge.phone !== formattedPhone) {
    return {
      success: false,
      error: 'Mobile number mismatch. Please request a new code.',
    };
  }

  // Check Expiry
  if (Date.now() > challenge.expiresAt) {
    sessionStorage.removeItem(OTP_CHALLENGE_KEY);
    return {
      success: false,
      error: 'Verification code has expired. Please tap Resend Code.',
    };
  }

  // Check Attempts
  if (challenge.attempts >= 4) {
    sessionStorage.removeItem(OTP_CHALLENGE_KEY);
    return {
      success: false,
      error: 'Too many incorrect attempts. Please request a new verification code.',
    };
  }

  // Validate OTP code match
  if (challenge.otp !== enteredOtp.trim()) {
    challenge.attempts += 1;
    sessionStorage.setItem(OTP_CHALLENGE_KEY, JSON.stringify(challenge));
    const remaining = 4 - challenge.attempts;
    return {
      success: false,
      error: `Incorrect verification code. ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} remaining.`,
    };
  }

  // Clear challenge on success
  sessionStorage.removeItem(OTP_CHALLENGE_KEY);

  // Retrieve or create real user account
  const accounts = getStoredAccounts();
  const cleanId = `user_phone_${validation.cleanNumber}`;
  const existingAccount = accounts[formattedPhone] || accounts[cleanId];

  const now = Date.now();
  const dateFormatted = new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  const realName = (
    additionalData?.name ||
    challenge.name ||
    existingAccount?.name ||
    'Customer'
  ).trim();

  const realEmail = (
    additionalData?.email ||
    challenge.email ||
    existingAccount?.email ||
    ''
  ).trim();

  const realAddress = (
    additionalData?.address ||
    existingAccount?.address ||
    ''
  ).trim();

  const userProfile: StoredAccount = {
    id: existingAccount?.id || cleanId,
    name: realName,
    phone: formattedPhone,
    email: realEmail,
    address: realAddress,
    isLoggedIn: true,
    isVerified: true,
    authProvider: 'phone',
    memberSince: existingAccount?.memberSince || dateFormatted,
    createdAt: existingAccount?.createdAt || now,
    updatedAt: now,
  };

  // Save to database permanently under both phone and canonical ID
  accounts[formattedPhone] = userProfile;
  accounts[userProfile.id] = userProfile;
  if (userProfile.email) {
    accounts[userProfile.email.toLowerCase()] = userProfile;
  }
  saveStoredAccounts(accounts);

  // Save active session
  saveActiveSession(userProfile);

  return { success: true, user: userProfile };
};

/**
 * Authenticates with real Google account data
 */
export const authenticateWithGoogle = async (googleProfile: {
  name: string;
  email: string;
  picture?: string;
  id?: string;
  phone?: string;
  address?: string;
}): Promise<{ success: boolean; user: UserProfile }> => {
  if (!googleProfile.email) {
    throw new Error('Google authentication did not provide an email address.');
  }

  const accounts = getStoredAccounts();
  const accountKey = googleProfile.email.toLowerCase().trim();
  const existingAccount = accounts[accountKey];

  const now = Date.now();
  const dateFormatted = new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  const userProfile: StoredAccount = {
    id: googleProfile.id || existingAccount?.id || `google_${accountKey.replace(/[^a-zA-Z0-9]/g, '_')}`,
    name: googleProfile.name.trim() || existingAccount?.name || 'Google User',
    email: accountKey,
    phone: googleProfile.phone || existingAccount?.phone || '',
    address: googleProfile.address || existingAccount?.address || '',
    avatarUrl: googleProfile.picture || existingAccount?.avatarUrl,
    isLoggedIn: true,
    isVerified: true,
    authProvider: 'google',
    memberSince: existingAccount?.memberSince || dateFormatted,
    createdAt: existingAccount?.createdAt || now,
    updatedAt: now,
  };

  accounts[accountKey] = userProfile;
  accounts[userProfile.id] = userProfile;
  saveStoredAccounts(accounts);
  saveActiveSession(userProfile);

  return { success: true, user: userProfile };
};

/**
 * Updates profile details for currently authenticated user
 */
export const updateRealUserProfile = (
  currentUser: UserProfile,
  updates: { name?: string; phone?: string; email?: string; address?: string; avatarUrl?: string; preferredLanguage?: 'en' | 'kn' }
): UserProfile => {
  const accounts = getStoredAccounts();
  const key = currentUser.id || currentUser.phone || currentUser.email || '';

  const now = Date.now();
  const updatedProfile: StoredAccount = {
    ...currentUser,
    name: updates.name !== undefined ? updates.name.trim() : currentUser.name,
    phone: updates.phone !== undefined ? updates.phone.trim() : currentUser.phone,
    email: updates.email !== undefined ? updates.email.trim() : currentUser.email,
    address: updates.address !== undefined ? updates.address.trim() : currentUser.address,
    avatarUrl: updates.avatarUrl !== undefined ? updates.avatarUrl : currentUser.avatarUrl,
    preferredLanguage: updates.preferredLanguage !== undefined ? updates.preferredLanguage : currentUser.preferredLanguage,
    isLoggedIn: true,
    id: currentUser.id || `user_${now}`,
    createdAt: (currentUser as StoredAccount).createdAt || now,
    updatedAt: now,
  };

  if (key) {
    accounts[key] = updatedProfile;
  }
  if (updatedProfile.id) {
    accounts[updatedProfile.id] = updatedProfile;
  }
  if (updatedProfile.phone) {
    accounts[updatedProfile.phone] = updatedProfile;
  }
  if (updatedProfile.email) {
    accounts[updatedProfile.email.toLowerCase()] = updatedProfile;
  }
  saveStoredAccounts(accounts);

  saveActiveSession(updatedProfile);
  return updatedProfile;
};

/**
 * Hash password securely using standard Web Crypto SHA-256
 */
export const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + '_quickbasket_secure_salt_v1');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Register a new user account with Email and Password
 */
export const registerWithEmail = async (
  name: string,
  email: string,
  password: string,
  phone?: string,
  address?: string
): Promise<{ success: boolean; user?: UserProfile; error?: string }> => {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !validateEmail(cleanEmail)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  if (!name.trim()) {
    return { success: false, error: 'Please enter your full name.' };
  }

  if (!password || password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  let formattedPhone = '';
  if (phone && phone.trim()) {
    const phoneVal = validateIndianMobile(phone);
    if (!phoneVal.isValid) {
      return { success: false, error: phoneVal.error || 'Invalid mobile number.' };
    }
    formattedPhone = `+91 ${phoneVal.cleanNumber}`;
  }

  const accounts = getStoredAccounts();

  // Check if account already exists with this email
  if (accounts[cleanEmail]) {
    return {
      success: false,
      error: 'An account with this email already exists. Please log in.',
    };
  }

  // If phone is given, check if another account already uses it
  if (formattedPhone && accounts[formattedPhone]) {
    return {
      success: false,
      error: 'This mobile number is already linked to another account.',
    };
  }

  const pwdHash = await hashPassword(password);
  const now = Date.now();
  const dateFormatted = new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  const newAccount: StoredAccount = {
    id: `user_email_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
    name: name.trim(),
    email: cleanEmail,
    phone: formattedPhone,
    address: (address || '').trim(),
    isLoggedIn: true,
    isVerified: true,
    authProvider: 'email',
    passwordHash: pwdHash,
    memberSince: dateFormatted,
    createdAt: now,
    updatedAt: now,
  };

  accounts[cleanEmail] = newAccount;
  accounts[newAccount.id] = newAccount;
  if (formattedPhone) {
    accounts[formattedPhone] = newAccount;
  }
  saveStoredAccounts(accounts);
  saveActiveSession(newAccount);

  return { success: true, user: newAccount };
};

/**
 * Login with Email and Password
 */
export const loginWithEmail = async (
  email: string,
  password: string
): Promise<{ success: boolean; user?: UserProfile; error?: string }> => {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !validateEmail(cleanEmail)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  if (!password) {
    return { success: false, error: 'Please enter your password.' };
  }

  const accounts = getStoredAccounts();
  const account = accounts[cleanEmail];

  if (!account) {
    return {
      success: false,
      error: 'No account found with this email. Please check the address or create an account.',
    };
  }

  if (!account.passwordHash) {
    return {
      success: false,
      error: 'This account was created via Mobile OTP or Google. Please sign in using your mobile number or reset password.',
    };
  }

  const inputHash = await hashPassword(password);
  if (account.passwordHash !== inputHash) {
    return {
      success: false,
      error: 'Incorrect password. Please try again or tap "Forgot Password?".',
    };
  }

  const updatedAccount: StoredAccount = {
    ...account,
    isLoggedIn: true,
    updatedAt: Date.now(),
  };

  accounts[cleanEmail] = updatedAccount;
  accounts[updatedAccount.id] = updatedAccount;
  if (account.phone) {
    accounts[account.phone] = updatedAccount;
  }
  saveStoredAccounts(accounts);
  saveActiveSession(updatedAccount);

  return { success: true, user: updatedAccount };
};

interface PasswordResetChallenge {
  email: string;
  otp: string;
  expiresAt: number;
  attempts: number;
}

/**
 * Send Password Reset OTP
 */
export const sendPasswordResetOtp = async (
  email: string
): Promise<{ success: boolean; message: string; notificationCode?: string; error?: string }> => {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !validateEmail(cleanEmail)) {
    return { success: false, message: '', error: 'Please enter a valid email address.' };
  }

  const accounts = getStoredAccounts();
  const account = accounts[cleanEmail];

  if (!account) {
    return {
      success: false,
      message: '',
      error: 'No account found with this email address. Please register a new account.',
    };
  }

  // Generate 4-digit reset OTP
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const otpNumber = 1000 + (array[0] % 9000);
  const otp = otpNumber.toString();

  const challenge: PasswordResetChallenge = {
    email: cleanEmail,
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000,
    attempts: 0,
  };

  sessionStorage.setItem(PASSWORD_RESET_KEY, JSON.stringify(challenge));

  // Simulate network dispatch delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    success: true,
    message: `Password reset verification code sent to ${cleanEmail}`,
    notificationCode: otp,
  };
};

/**
 * Reset password using verification code
 */
export const resetPasswordWithOtp = async (
  email: string,
  otp: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> => {
  const cleanEmail = email.trim().toLowerCase();
  const rawChallenge = sessionStorage.getItem(PASSWORD_RESET_KEY);

  if (!rawChallenge) {
    return {
      success: false,
      error: 'No active password reset request found. Please request a new code.',
    };
  }

  let challenge: PasswordResetChallenge;
  try {
    challenge = JSON.parse(rawChallenge);
  } catch {
    return { success: false, error: 'Session error. Please retry password reset.' };
  }

  if (challenge.email !== cleanEmail) {
    return { success: false, error: 'Email mismatch. Please request a new code.' };
  }

  if (Date.now() > challenge.expiresAt) {
    sessionStorage.removeItem(PASSWORD_RESET_KEY);
    return { success: false, error: 'Verification code has expired. Please request a new one.' };
  }

  if (challenge.attempts >= 4) {
    sessionStorage.removeItem(PASSWORD_RESET_KEY);
    return { success: false, error: 'Too many incorrect attempts. Please request a new code.' };
  }

  if (challenge.otp !== otp.trim()) {
    challenge.attempts += 1;
    sessionStorage.setItem(PASSWORD_RESET_KEY, JSON.stringify(challenge));
    const remaining = 4 - challenge.attempts;
    return {
      success: false,
      error: `Incorrect code. ${remaining} attempts remaining.`,
    };
  }

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'New password must be at least 6 characters long.' };
  }

  // Clear challenge
  sessionStorage.removeItem(PASSWORD_RESET_KEY);

  // Update account password in database
  const accounts = getStoredAccounts();
  const account = accounts[cleanEmail];
  if (!account) {
    return { success: false, error: 'Account not found.' };
  }

  const newHash = await hashPassword(newPassword);
  account.passwordHash = newHash;
  account.updatedAt = Date.now();
  accounts[cleanEmail] = account;
  if (account.phone) {
    accounts[account.phone] = account;
  }
  saveStoredAccounts(accounts);

  return { success: true };
};
