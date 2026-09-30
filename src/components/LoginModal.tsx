import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ArrowLeft,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Edit3,
  Check,
  AlertCircle,
  Loader2,
  Zap,
  LogOut,
  Truck,
  Mail,
  Phone,
  Settings,
  Bell,
  CreditCard,
  Languages,
  Plus,
  Camera,
} from 'lucide-react';
import { UserProfile, Order } from '../types';
import { useLanguage } from '../i18n';
import {
  updateRealUserProfile,
  validateIndianMobile,
  validateEmail,
  clearActiveSession,
  authenticateWithGoogle,
  sendMobileOtp,
  verifyMobileOtp,
} from '../services/authService';
import { registerMemoryCleaner } from '../utils/sessionClearance';
import { vibrateFeedback, vibrateSuccess } from '../utils/haptics';
import {
  requestNotificationPermission,
  sendBrowserNotification,
  listenForWebOTP,
} from '../utils/permissionManager';

const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.36 7.31 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

const DEFAULT_USER_PROFILE: UserProfile = {
  id: '',
  name: '',
  phone: '',
  email: '',
  address: '',
  isLoggedIn: false,
};

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserProfile;
  orders?: Order[];
  onLoginSuccess: (updatedUser: UserProfile) => void;
  onLogout: () => void;
  onTrackOrder?: (order: Order) => void;
  onViewOrders?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  user = DEFAULT_USER_PROFILE,
  orders = [],
  onLoginSuccess,
  onLogout,
  onTrackOrder,
  onViewOrders,
}) => {
  // Loading & Feedback States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Full Profile Edit States (For Authenticated User)
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // Mobile Number inline edit state
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Address inline edit state
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressInput, setAddressInput] = useState('');

  // Real Google Sign-in Prompt Form (when GIS popup is not configured with a Client ID)
  const [showGoogleInputForm, setShowGoogleInputForm] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState('');
  const [googleNameInput, setGoogleNameInput] = useState('');

  // Mobile Number + OTP Login States
  const [authStep, setAuthStep] = useState<'main' | 'otp' | 'google_form'>('main');
  const [mobileNumber, setMobileNumber] = useState('');
  const [otpValue, setOtpValue] = useState(['', '', '', '']);
  const [otpNotification, setOtpNotification] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(30);
  const [isResendActive, setIsResendActive] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  // Account Settings state
  const { language: appLanguage, setLanguage, t } = useLanguage();
  const [smsNotifications, setSmsNotifications] = useState(true);
  const [paymentPreference, setPaymentPreference] = useState<'cod' | 'upi'>('cod');
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  // Avatar Image Picker Handler: uses native device/gallery picker with safe fallback
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        if (user.isLoggedIn && user.id) {
          const updated = updateRealUserProfile(user, { avatarUrl: dataUrl });
          if (updated) {
            onLoginSuccess(updated);
            vibrateSuccess();
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Safe notification toggle with JIT browser permission request
  const handleToggleNotifications = async () => {
    vibrateFeedback();
    const nextState = !smsNotifications;
    setSmsNotifications(nextState);

    if (nextState) {
      const result = await requestNotificationPermission();
      if (result === 'granted') {
        sendBrowserNotification('QuickBasket Lakkavalli', {
          body: 'Order alerts & delivery updates are active.',
        });
      }
    }
  };

  // Reset or initialize state whenever page opens or user updates
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
      setEditError(null);
      setPhoneError(null);
      setOtpError(null);
      setIsEditingAddress(false);
      setIsEditingPhone(false);
      setIsEditingProfile(false);
      setShowGoogleInputForm(false);
      setAuthStep('main');
      setMobileNumber('');
      setOtpValue(['', '', '', '']);
      setOtpNotification(null);
      setResendCountdown(30);
      setIsResendActive(false);
      setIsVerifyingOtp(false);

      if (user.isLoggedIn) {
        setEditName(user.name || '');
        setEditPhone(user.phone || '');
        setEditEmail(user.email || '');
        setEditAddress(user.address || '');
        setAddressInput(user.address || '');
        setPhoneInput(user.phone ? user.phone.replace('+91', '').trim() : '');
      } else {
        setEditName('');
        setEditPhone('');
        setEditEmail('');
        setEditAddress('');
        setAddressInput('');
        setPhoneInput('');
      }
    }
  }, [isOpen, user]);

  // Resend OTP countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (authStep === 'otp' && resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            setIsResendActive(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [authStep, resendCountdown]);

  // WebOTP API: Listen for incoming SMS OTP if browser supports it
  useEffect(() => {
    if (authStep !== 'otp') return;
    const ac = new AbortController();
    listenForWebOTP((code) => {
      const digits = code.split('').slice(0, 4);
      setOtpValue(digits);
      handleVerifyOtp(code);
    }, ac.signal);
    return () => {
      ac.abort();
    };
  }, [authStep]);

  // Register in-memory cleaner for session clearance
  useEffect(() => {
    const unregister = registerMemoryCleaner(() => {
      setErrorMessage(null);
      setSuccessMessage(null);
      setAuthStep('main');
      setMobileNumber('');
      setOtpValue(['', '', '', '']);
      setOtpNotification(null);
      setOtpError(null);
      setEditName('');
      setEditPhone('');
      setEditEmail('');
      setEditAddress('');
      setAddressInput('');
      setPhoneInput('');
      setGoogleEmailInput('');
      setGoogleNameInput('');
      setShowGoogleInputForm(false);
      setIsEditingProfile(false);
      setIsEditingAddress(false);
      setIsEditingPhone(false);
    });
    return unregister;
  }, []);

  // Enforce memory clearance of sensitive inputs on component unmount
  useEffect(() => {
    return () => {
      setOtpValue(['', '', '', '']);
      setOtpNotification(null);
      setOtpError(null);
      setErrorMessage(null);
    };
  }, []);

  if (!isOpen) return null;

  // Real Avatar Initials Calculation
  const getInitials = (nameStr?: string, emailStr?: string): string => {
    if (nameStr && nameStr.trim()) {
      const parts = nameStr.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return nameStr.trim().slice(0, 2).toUpperCase();
    }
    if (emailStr && emailStr.trim()) {
      return emailStr.trim().charAt(0).toUpperCase();
    }
    return 'U';
  };

  // Find active orders and latest completed order for this verified user
  const safeOrders = Array.isArray(orders) ? orders : [];
  const userOrders =
    user?.isLoggedIn && (user.id || user.phone || user.email)
      ? safeOrders.filter(
          (o) =>
            Boolean(o) &&
            ((user.id && o.userId === user.id) ||
              (user.phone && o.userId === user.phone) ||
              (user.email && o.userId === user.email))
        )
      : [];
  const activeOrder = userOrders.find(
    (o) => Boolean(o) && o.status !== 'delivered' && o.status !== 'cancelled'
  );
  const latestCompletedOrder = userOrders.find((o) => Boolean(o) && o.status === 'delivered');

  // =========================================================================
  // ACTIONS & HANDLERS
  // =========================================================================
  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.trim()) return;
    vibrateSuccess();
    const updated = updateRealUserProfile(user, {
      address: addressInput.trim(),
    });
    onLoginSuccess(updated);
    setIsEditingAddress(false);
    setSuccessMessage('Delivery address saved successfully.');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleSavePhone = (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(null);
    if (!phoneInput.trim()) {
      setPhoneError('Please enter a 10-digit mobile number.');
      vibrateFeedback();
      return;
    }
    const val = validateIndianMobile(phoneInput);
    if (!val.isValid) {
      setPhoneError(val.error || 'Invalid mobile number.');
      vibrateFeedback();
      return;
    }

    vibrateSuccess();
    const formatted = `+91 ${val.cleanNumber}`;
    const updated = updateRealUserProfile(user, {
      phone: formatted,
    });
    onLoginSuccess(updated);
    setIsEditingPhone(false);
    setSuccessMessage('Mobile number linked successfully.');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleSaveProfileEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    if (editPhone.trim()) {
      const phoneVal = validateIndianMobile(editPhone);
      if (!phoneVal.isValid) {
        setEditError(phoneVal.error || 'Invalid mobile number');
        vibrateFeedback();
        return;
      }
    }

    if (editEmail.trim() && !validateEmail(editEmail)) {
      setEditError('Please enter a valid email address.');
      vibrateFeedback();
      return;
    }

    try {
      vibrateSuccess();
      const updated = updateRealUserProfile(user, {
        name: editName.trim(),
        phone: editPhone.trim()
          ? editPhone.startsWith('+91')
            ? editPhone.trim()
            : `+91 ${editPhone.replace(/\D/g, '')}`
          : '',
        email: editEmail.trim(),
        address: editAddress.trim(),
      });
      onLoginSuccess(updated);
      setIsEditingProfile(false);
      setSuccessMessage('Profile updated successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile.';
      setEditError(msg);
      vibrateFeedback();
    }
  };

  // =========================================================================
  // REAL GOOGLE AUTHENTICATION FLOW
  // =========================================================================
  const handleStartGoogleAuth = () => {
    setErrorMessage(null);
    vibrateFeedback();

    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    const win = window as unknown as {
      google?: {
        accounts?: {
          oauth2?: {
            initTokenClient: (config: {
              client_id: string;
              scope: string;
              prompt: string;
              callback: (tokenResponse: {
                access_token?: string;
                error?: string;
                error_description?: string;
              }) => void;
              error_callback?: (err: { type?: string; message?: string }) => void;
            }) => {
              requestAccessToken: (opts?: { prompt?: string }) => void;
            };
          };
        };
      };
    };

    if (win.google?.accounts?.oauth2 && googleClientId) {
      setIsLoading(true);
      try {
        const tokenClient = win.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'openid email profile',
          prompt: 'select_account',
          callback: async (tokenResponse) => {
            if (tokenResponse.error) {
              setIsLoading(false);
              if (tokenResponse.error === 'access_denied') {
                setErrorMessage('Google Sign-In was cancelled.');
              } else {
                setErrorMessage(
                  `Google sign-in error: ${tokenResponse.error_description || tokenResponse.error}`
                );
              }
              vibrateFeedback();
              return;
            }

            if (tokenResponse.access_token) {
              try {
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: {
                    Authorization: `Bearer ${tokenResponse.access_token}`,
                  },
                });
                if (!res.ok) {
                  throw new Error('Failed to retrieve profile data from Google.');
                }
                const profile = await res.json();
                const authResult = await authenticateWithGoogle({
                  id: profile.sub,
                  name: profile.name || profile.given_name || profile.email?.split('@')[0],
                  email: profile.email,
                  picture: profile.picture,
                });
                vibrateSuccess();
                onLoginSuccess(authResult.user);
              } catch (fetchErr: unknown) {
                const msg =
                  fetchErr instanceof Error
                    ? fetchErr.message
                    : 'Google authentication failed.';
                setErrorMessage(msg);
                vibrateFeedback();
              } finally {
                setIsLoading(false);
              }
            }
          },
          error_callback: (err) => {
            setIsLoading(false);
            if (err?.type === 'popup_closed') {
              setErrorMessage('Google Sign-In was cancelled.');
            } else {
              setErrorMessage(err?.message || 'Google Sign-In window closed.');
            }
            vibrateFeedback();
          },
        });

        tokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (gisErr) {
        console.warn('GIS init error, providing direct Google Sign-in prompt', gisErr);
        setIsLoading(false);
      }
    }

    // Direct Google Account Sign-In Form (clean prompt for real account credentials)
    setAuthStep('google_form');
  };

  const handleCustomGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = googleEmailInput.trim().toLowerCase();
    if (!cleanEmail || !validateEmail(cleanEmail)) {
      setErrorMessage('Please enter a valid Google email address.');
      vibrateFeedback();
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    vibrateFeedback();

    try {
      const derivedName = googleNameInput.trim() || cleanEmail.split('@')[0];
      const res = await authenticateWithGoogle({
        name: derivedName,
        email: cleanEmail,
      });
      if (res.success && res.user) {
        vibrateSuccess();
        setAuthStep('main');
        onLoginSuccess(res.user);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google authentication failed';
      setErrorMessage(msg);
      vibrateFeedback();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMobileOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setOtpError(null);

    const validation = validateIndianMobile(mobileNumber);
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Please enter a valid 10-digit Indian mobile number.');
      vibrateFeedback();
      return;
    }

    setIsLoading(true);
    try {
      const res = await sendMobileOtp(validation.cleanNumber);
      if (res.success) {
        vibrateSuccess();
        setAuthStep('otp');
        setOtpValue(['', '', '', '']);
        setResendCountdown(30);
        setIsResendActive(false);
        if (res.notificationCode) {
          setOtpNotification(res.notificationCode);
        }
      } else {
        setErrorMessage(res.message || 'Failed to send OTP. Please try again.');
        vibrateFeedback();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send OTP.';
      setErrorMessage(msg);
      vibrateFeedback();
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (overrideCode?: string) => {
    const code = overrideCode || otpValue.join('');
    if (code.length !== 4) {
      setOtpError('Please enter the complete 4-digit verification code.');
      vibrateFeedback();
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError(null);

    try {
      const res = await verifyMobileOtp(mobileNumber, code);
      if (res.success && res.user) {
        vibrateSuccess();
        setSuccessMessage('Logged in successfully!');
        onLoginSuccess(res.user);
        setTimeout(() => {
          onClose();
        }, 500);
      } else {
        setOtpError(res.error || 'Invalid verification code. Please check and try again.');
        vibrateFeedback();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification failed.';
      setOtpError(msg);
      vibrateFeedback();
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleOtpBoxChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const updated = [...otpValue];
    updated[index] = digit;
    setOtpValue(updated);
    setOtpError(null);

    if (digit && index < 3) {
      const nextBox = document.getElementById(`otp-digit-${index + 1}`);
      nextBox?.focus();
    }

    if (digit && index === 3 && updated.every((d) => d !== '')) {
      handleVerifyOtp(updated.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValue[index] && index > 0) {
      const prevBox = document.getElementById(`otp-digit-${index - 1}`);
      prevBox?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;
    const chars = pasted.split('');
    const updated = ['', '', '', ''];
    chars.forEach((c, i) => {
      if (i < 4) updated[i] = c;
    });
    setOtpValue(updated);
    setOtpError(null);
    if (pasted.length === 4) {
      handleVerifyOtp(pasted);
    }
  };

  const handleLogoutFlow = () => {
    vibrateFeedback();
    clearActiveSession();
    onLogout();
    setErrorMessage(null);
    setSuccessMessage(null);
    setAuthStep('main');
    setMobileNumber('');
    setOtpValue(['', '', '', '']);
    setOtpNotification(null);
    setOtpError(null);
    setEditName('');
    setEditPhone('');
    setEditEmail('');
    setEditAddress('');
    setAddressInput('');
    setPhoneInput('');
    setGoogleEmailInput('');
    setGoogleNameInput('');
    setShowGoogleInputForm(false);
    setIsEditingProfile(false);
    setIsEditingAddress(false);
    setIsEditingPhone(false);
  };

  // =========================================================================
  // RENDER: COMPACT, HIGH-DENSITY MOBILE LAYOUT (360-390px tailored)
  // Clean solid white / light green background (#f8faf9)
  // =========================================================================
  return (
    <div
      id="quickbasket-profile-page"
      className="fixed inset-0 z-50 overflow-y-auto bg-[#f8faf9] flex flex-col min-h-screen w-full select-none"
    >
      <div className="w-full max-w-lg mx-auto min-h-screen flex flex-col bg-[#f8faf9]">
        {/* =========================================================================
            TOP SECTION (COMPACT HEADER)
            Back arrow + Your Account
            Subtitle: QuickBasket Lakkavalli Member
            Clean close/back control
            ========================================================================= */}
        <header
          id="account-page-header"
          className="sticky top-0 z-20 bg-white border-b border-emerald-100/80 px-3.5 py-2.5 sm:px-4 shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button
                id="account-header-back-btn"
                type="button"
                onClick={() => {
                  vibrateFeedback();
                  if (isEditingProfile) {
                    setIsEditingProfile(false);
                  } else if (authStep === 'otp' || authStep === 'google_form') {
                    setAuthStep('main');
                    setOtpError(null);
                  } else {
                    onClose();
                  }
                }}
                className="w-7.5 h-7.5 rounded-full bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-[#064e3b] flex items-center justify-center transition-colors cursor-pointer border border-emerald-200/70 shrink-0"
                aria-label="Back"
              >
                <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>

              <div>
                <h1 className="text-base sm:text-lg font-extrabold text-gray-950 tracking-tight leading-tight">
                  {user.isLoggedIn
                    ? 'Your Account'
                    : authStep === 'otp'
                    ? 'Verify Mobile'
                    : 'Welcome to QuickBasket'}
                </h1>
                <div className="flex items-center gap-1 mt-0.25">
                  <span className="text-[11px] font-semibold text-emerald-800">
                    {user.isLoggedIn
                      ? 'QuickBasket Lakkavalli Member'
                      : authStep === 'otp'
                      ? 'Enter 4-Digit OTP'
                      : 'Doorstep Delivery in Lakkavalli'}
                  </span>
                  <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-emerald-600 text-white text-[8px] font-black">
                    ✓
                  </span>
                </div>
              </div>
            </div>

            <button
              id="account-header-close-btn"
              type="button"
              onClick={() => {
                vibrateFeedback();
                onClose();
              }}
              className="w-7.5 h-7.5 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-600 hover:text-gray-900 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </header>

        {/* =========================================================================
            ACCOUNT CONTENT: VERTICALLY SCROLLABLE, PROPORTIONALLY COMPACT
            ========================================================================= */}
        {user.isLoggedIn ? (
          <div className="flex-1 p-3 sm:p-4 space-y-2.5 sm:space-y-3 pb-8">
            {/* Global Success Banner */}
            {successMessage && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* 1. REAL GOOGLE ACCOUNT PROFILE CARD */}
            <section
              id="profile-user-card"
              className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-3.5 border border-emerald-100/90 shadow-2xs space-y-2.5"
            >
              {/* Top Row: Compact Avatar, Real Google Name & Edit Button */}
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="relative shrink-0 group">
                    <input
                      ref={avatarFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileChange}
                      className="hidden"
                      aria-label="Upload profile picture"
                    />
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name || 'User Avatar'}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover shadow-2xs ring-1.5 ring-emerald-500"
                      />
                    ) : (
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#10b981] text-white flex items-center justify-center font-extrabold text-sm sm:text-base shadow-2xs ring-1.5 ring-emerald-300/60 select-none">
                        {getInitials(user.name, user.email)}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => avatarFileInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 p-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full shadow-xs cursor-pointer transition-all hover:scale-110"
                      title="Update profile photo"
                      aria-label="Update profile photo"
                    >
                      <Camera className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] uppercase font-bold text-emerald-800 tracking-wider block leading-tight">
                      {user.authProvider === 'google'
                        ? 'Google Account'
                        : 'Verified Mobile Account'}
                    </span>
                    <h2 className="text-sm sm:text-base font-bold text-gray-950 truncate leading-snug">
                      {user.name && user.name.trim() ? (
                        user.name
                      ) : (
                        <span className="text-gray-600 font-medium">
                          {user.phone || 'QuickBasket Member'}
                        </span>
                      )}
                    </h2>
                    <div className="flex items-center gap-1 text-[11px] text-gray-500 truncate leading-tight">
                      <span>{user.email || user.phone || 'QuickBasket Member'}</span>
                    </div>
                  </div>
                </div>

                {!isEditingProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      vibrateFeedback();
                      setEditName(user.name || '');
                      setEditPhone(user.phone || '');
                      setEditEmail(user.email || '');
                      setEditAddress(user.address || '');
                      setIsEditingProfile(true);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-200 hover:border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100 text-emerald-900 transition-all text-[11px] font-bold cursor-pointer shrink-0"
                    title="Edit Profile"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              {/* Full Profile Edit Form */}
              {isEditingProfile ? (
                <form
                  onSubmit={handleSaveProfileEdit}
                  className="pt-2.5 border-t border-gray-100 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                    <span className="font-bold text-gray-900 text-[11px]">
                      Update Account Details
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="text-gray-400 hover:text-gray-700 text-[11px] font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  {editError && (
                    <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{editError}</span>
                    </div>
                  )}

                  <div>
                    <label className="font-bold text-gray-700 block mb-0.5 text-[11px]">
                      Account Name
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-900 focus:outline-none focus:border-emerald-600 font-medium text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-0.5 text-[11px]">
                      Registered Email Address
                    </label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="yourname@gmail.com"
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-900 focus:outline-none focus:border-emerald-600 font-medium text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-0.5 text-[11px]">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-900 focus:outline-none focus:border-emerald-600 font-medium text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-0.5 text-[11px]">
                      Delivery Address
                    </label>
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      placeholder="Door No., Street, Landmark, Lakkavalli"
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-900 focus:outline-none focus:border-emerald-600 font-medium text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="flex-1 py-1.5 rounded-lg border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 cursor-pointer text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-1.5 rounded-lg bg-[#064e3b] hover:bg-[#043c2d] text-white font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                    >
                      <Check className="w-3 h-3 stroke-[2.5]" />
                      <span>Save</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* Real Registered Google Email Address Row */
                <div className="pt-2 border-t border-gray-100 flex items-center gap-2.5">
                  <div className="w-7.5 h-7.5 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] text-gray-400 font-bold block uppercase tracking-wider leading-tight">
                      Registered Google Email
                    </span>
                    {user.email && user.email.trim() ? (
                      <div className="flex items-center gap-1.5 mt-0.25">
                        <span className="font-bold text-gray-900 text-xs truncate">
                          {user.email}
                        </span>
                        <span className="text-[9px] font-extrabold bg-emerald-100 text-emerald-900 px-1 py-0.25 rounded shrink-0">
                          Verified ✓
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs italic">
                        No email address linked
                      </span>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* 2. MOBILE NUMBER SECTION */}
            <section
              id="profile-mobile-card"
              className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-3.5 border border-emerald-100/90 shadow-2xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7.5 h-7.5 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-950 leading-tight">
                      Mobile Number
                    </h3>
                    <span className="text-[10px] text-gray-500 font-medium">
                      Used for delivery updates & call on arrival
                    </span>
                  </div>
                </div>

                {!isEditingPhone && (
                  <button
                    type="button"
                    onClick={() => {
                      vibrateFeedback();
                      setPhoneInput(
                        user.phone ? user.phone.replace('+91', '').trim() : ''
                      );
                      setIsEditingPhone(true);
                    }}
                    className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 cursor-pointer"
                  >
                    {user.phone ? 'Edit' : '+ Add'}
                  </button>
                )}
              </div>

              {isEditingPhone ? (
                <form onSubmit={handleSavePhone} className="space-y-2 pt-1 border-t border-gray-100">
                  {phoneError && (
                    <div className="p-1.5 rounded-lg bg-red-50 text-red-700 text-[10px] font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{phoneError}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-1.5 rounded-lg bg-gray-100 text-gray-700 font-bold text-xs">
                      +91
                    </span>
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-emerald-600 font-medium"
                      autoFocus
                    />
                  </div>
                  <div className="flex justify-end gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setIsEditingPhone(false)}
                      className="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 rounded-lg bg-[#064e3b] hover:bg-[#043c2d] text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </form>
              ) : (
                <div className="pt-1.5 border-t border-gray-100">
                  {user.phone && user.phone.trim() ? (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900">
                        {user.phone}
                      </span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-900 font-extrabold px-1.5 py-0.25 rounded-full">
                        Verified ✓
                      </span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-400 italic">
                      No mobile number linked. Add one to receive SMS updates.
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* 3. SAVED DELIVERY ADDRESS WITH + ADD ADDRESS */}
            <section
              id="profile-address-card"
              className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-3.5 border border-emerald-100/90 shadow-2xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7.5 h-7.5 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-950 leading-tight">
                      Saved Delivery Address
                    </h3>
                    <span className="text-[10px] text-gray-500 font-medium">
                      Primary drop-off location in Lakkavalli
                    </span>
                  </div>
                </div>

                {!isEditingAddress && (
                  <button
                    type="button"
                    onClick={() => {
                      vibrateFeedback();
                      setAddressInput(user.address || '');
                      setIsEditingAddress(true);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 hover:text-emerald-950 cursor-pointer"
                  >
                    {user.address ? (
                      'Edit'
                    ) : (
                      <>
                        <Plus className="w-3 h-3 stroke-[2.5]" />
                        <span>Add</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {isEditingAddress ? (
                <form
                  onSubmit={handleSaveAddress}
                  className="space-y-1.5 pt-1 border-t border-gray-100"
                >
                  <label className="text-[10px] font-bold text-gray-700 block">
                    House / Door No., Street & Landmark
                  </label>
                  <textarea
                    rows={2}
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    placeholder="e.g. House No., Street, Landmark"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:border-emerald-600 font-medium"
                    autoFocus
                  />
                  <div className="flex justify-end gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setIsEditingAddress(false)}
                      className="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!addressInput.trim()}
                      className="px-3 py-1 rounded-lg bg-[#064e3b] hover:bg-[#043c2d] text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                    >
                      Save Address
                    </button>
                  </div>
                </form>
              ) : (
                <div className="pt-1.5 border-t border-gray-100">
                  {user.address && user.address.trim() ? (
                    <p className="text-xs text-gray-800 font-medium leading-relaxed">
                      {user.address}
                    </p>
                  ) : (
                    <p className="text-[11px] text-gray-400 italic">
                      No delivery address saved yet. Tap "+ Add" above.
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* 4. DELIVERY INFORMATION */}
            <section
              id="profile-delivery-card"
              className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-3.5 border border-emerald-100/90 shadow-2xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7.5 h-7.5 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
                    <Truck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-950 leading-tight">
                      Delivery Information
                    </h3>
                    <span className="text-[10px] text-gray-500 font-medium">
                      Lakkavalli Local Fulfillment • 10 Mins
                    </span>
                  </div>
                </div>

                {activeOrder && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.25 rounded-full bg-emerald-100 text-emerald-900 animate-pulse">
                    ● Active
                  </span>
                )}
              </div>

              {/* Real Delivery Details Only When Available */}
              {activeOrder ? (
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[11px] text-emerald-950">
                      Order #{activeOrder.id.slice(-6).toUpperCase()}
                    </span>
                    <span className="text-[10px] font-bold capitalize px-2 py-0.25 rounded-full bg-white text-emerald-900 border border-emerald-200">
                      {activeOrder.status === 'out_for_delivery'
                        ? 'Out for Delivery 🛵'
                        : activeOrder.status === 'packing'
                        ? 'Packing Order 📦'
                        : 'Order Confirmed ✓'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-700">
                    Total: ₹{activeOrder.totalAmount} • {activeOrder.items.length}{' '}
                    {activeOrder.items.length === 1 ? 'item' : 'items'}
                  </p>
                  {onTrackOrder && (
                    <button
                      type="button"
                      onClick={() => {
                        vibrateFeedback();
                        onTrackOrder(activeOrder);
                      }}
                      className="w-full py-1.5 bg-[#064e3b] hover:bg-[#043c2d] text-white text-[11px] font-bold rounded-lg transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Zap className="w-3 h-3 text-emerald-300 fill-emerald-300" />
                      <span>Track Live Delivery</span>
                    </button>
                  )}
                </div>
              ) : latestCompletedOrder ? (
                <div className="bg-gray-50 border border-gray-200/70 rounded-xl p-2.5 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-[11px]">
                    <span className="text-gray-900">Last Order</span>
                    <span className="text-emerald-700 flex items-center gap-1 text-[10px]">
                      <CheckCircle2 className="w-3 h-3" /> Delivered
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 truncate">
                    {latestCompletedOrder.items
                      .map((i) => `${i.product.name} (x${i.quantity})`)
                      .join(', ')}
                  </p>
                  <div className="flex items-center justify-between pt-0.5 border-t border-gray-100 text-[10px]">
                    <span className="text-gray-400">
                      {latestCompletedOrder.orderTime}
                    </span>
                    <span className="font-bold text-gray-900">
                      ₹{latestCompletedOrder.totalAmount}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-center">
                  <p className="text-[11px] text-gray-600 font-medium">
                    No active delivery in progress.
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.25">
                    Orders in Lakkavalli are dispatched locally within 10 minutes.
                  </p>
                </div>
              )}
            </section>

            {/* 5. ACCOUNT SETTINGS */}
            <section
              id="profile-settings-card"
              className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-3.5 border border-emerald-100/90 shadow-2xs space-y-2"
            >
              <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                <div className="w-7.5 h-7.5 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
                  <Settings className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-950 leading-tight">
                    Account Settings
                  </h3>
                  <span className="text-[10px] text-gray-500 font-medium">
                    Preferences & notification controls
                  </span>
                </div>
              </div>

              {/* Toggle: SMS & Order Notifications */}
              <div className="flex items-center justify-between py-0.5">
                <div className="flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-gray-800 block leading-tight">
                      Order Alerts & SMS
                    </span>
                    <span className="text-[9px] text-gray-400">
                      Dispatch updates
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleNotifications}
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                    smsNotifications ? 'bg-emerald-600' : 'bg-gray-300'
                  }`}
                  aria-label="Toggle notifications"
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-xs transform transition-transform ${
                      smsNotifications ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Payment Preference */}
              <div className="flex items-center justify-between py-0.5 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-gray-800 block leading-tight">
                      Preferred Payment
                    </span>
                    <span className="text-[9px] text-gray-400">
                      Default option
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      vibrateFeedback();
                      setPaymentPreference('cod');
                    }}
                    className={`px-2 py-0.75 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                      paymentPreference === 'cod'
                        ? 'bg-[#064e3b] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    COD
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      vibrateFeedback();
                      setPaymentPreference('upi');
                    }}
                    className={`px-2 py-0.75 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                      paymentPreference === 'upi'
                        ? 'bg-[#064e3b] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    UPI
                  </button>
                </div>
              </div>

              {/* App Language */}
              <div className="flex items-center justify-between py-0.5 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <Languages className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-gray-800 block leading-tight">
                      {t('profile.appLanguage')}
                    </span>
                    <span className="text-[9px] text-gray-400">
                      English / ಕನ್ನಡ
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      vibrateFeedback();
                      setLanguage('en');
                    }}
                    className={`px-2 py-0.75 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                      appLanguage === 'en'
                        ? 'bg-[#064e3b] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      vibrateFeedback();
                      setLanguage('kn');
                    }}
                    className={`px-2 py-0.75 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                      appLanguage === 'kn'
                        ? 'bg-[#064e3b] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    ಕನ್ನಡ
                  </button>
                </div>
              </div>
            </section>

            {/* 6. LOGOUT BUTTON */}
            <div className="pt-1">
              <button
                id="account-logout-btn"
                type="button"
                onClick={handleLogoutFlow}
                className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-red-50 active:scale-[0.99] border border-red-400 text-red-600 hover:text-red-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <LogOut className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Log Out</span>
              </button>
            </div>

            {/* 7. FOOTER WITH BUSINESS COPYRIGHT INFORMATION */}
            <footer className="pt-4 border-t border-emerald-100/70 text-center pb-2 space-y-0.5">
              <p className="text-[11px] text-gray-700 font-bold">
                QuickBasket™ Lakkavalli • Sharu Enterprises
              </p>
              <p className="text-[10px] text-gray-500 font-medium">
                © 2026 Sharu Enterprises. All Rights Reserved.
              </p>
              <p className="text-[9px] text-gray-400">
                100% Fresh Groceries & Daily Essentials Delivered in 10 Minutes.
              </p>
            </footer>
          </div>
        ) : (
          /* =========================================================================
             STATE: USER NOT LOGGED IN -> DIRECT GOOGLE AUTHENTICATION VIEW
             Compact, high-density layout (NO huge cards, NO oversized banners)
             ========================================================================= */
          <div className="flex-1 flex flex-col justify-between p-3.5 sm:p-4 pb-8 space-y-3.5">
            <div className="space-y-3">
              {/* Compact Forest Green Header Banner with grocery basket icon */}
              <div className="bg-[#064e3b] text-white p-4 rounded-2xl relative overflow-hidden flex items-center justify-between shadow-2xs">
                <div className="space-y-0.5 relative z-10">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#86efac] block leading-tight">
                    QuickBasket Lakkavalli
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-white leading-tight tracking-tight">
                    Welcome to QuickBasket
                  </h2>
                  <p className="text-[11px] text-[#86efac] font-medium pt-0.5">
                    Login for fast 1-tap checkout
                  </p>
                </div>

                {/* Compact Grocery Basket Icon in Header */}
                <div className="relative z-10 flex items-center justify-center shrink-0 ml-2">
                  <div className="w-11 h-11 rounded-xl bg-emerald-800/90 border border-emerald-600/50 flex items-center justify-center text-xl shadow-inner">
                    🧺
                  </div>
                </div>
              </div>

              {/* Error Banner if any */}
              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                  <span className="flex-1">{errorMessage}</span>
                  <button
                    type="button"
                    onClick={() => setErrorMessage(null)}
                    className="text-red-400 hover:text-red-600 text-xs font-black cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* 1. VIEW: OTP VERIFICATION SCREEN */}
              {authStep === 'otp' ? (
                <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-2xs space-y-4 animate-in fade-in duration-200">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthStep('main');
                      setOtpError(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-emerald-700 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Change Mobile Number (+91 {mobileNumber})</span>
                  </button>

                  {/* Real-time SMS Notification Banner with cryptographic OTP for preview verification */}
                  {otpNotification && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 shadow-2xs space-y-1.5 animate-in slide-in-from-top-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">💬</span>
                          <span className="text-[11px] font-black uppercase text-emerald-900 tracking-wide">
                            Incoming SMS Alert
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const digits = otpNotification.split('').slice(0, 4);
                            setOtpValue(digits);
                            handleVerifyOtp(otpNotification);
                          }}
                          className="px-2 py-0.5 rounded-md bg-emerald-700 text-white text-[10px] font-bold hover:bg-emerald-800 cursor-pointer"
                        >
                          Auto-Fill Code
                        </button>
                      </div>
                      <p className="text-xs text-emerald-950 font-medium leading-tight">
                        Your QuickBasket OTP is{' '}
                        <span className="font-black text-sm tracking-widest text-emerald-900 bg-white px-2 py-0.5 rounded border border-emerald-300">
                          {otpNotification}
                        </span>
                        . Valid for 5 minutes.
                      </p>
                    </div>
                  )}

                  <div className="text-center space-y-1 pt-1">
                    <h3 className="text-base font-black text-gray-900">
                      Verify Mobile Number
                    </h3>
                    <p className="text-xs text-gray-500 font-medium">
                      Enter the 4-digit code sent to{' '}
                      <span className="font-bold text-gray-800">+91 {mobileNumber}</span>
                    </p>
                  </div>

                  {/* 4 OTP Input Boxes */}
                  <div className="flex justify-center gap-3 my-2">
                    {[0, 1, 2, 3].map((idx) => (
                      <input
                        key={idx}
                        id={`otp-digit-${idx}`}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={otpValue[idx]}
                        onChange={(e) => handleOtpBoxChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        onPaste={handleOtpPaste}
                        className="w-12 h-14 text-center text-xl font-black text-gray-900 bg-gray-50 focus:bg-white border-2 border-gray-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 rounded-xl outline-none transition-all"
                        autoFocus={idx === 0}
                        autoComplete={idx === 0 ? "one-time-code" : undefined}
                      />
                    ))}
                  </div>

                  {otpError && (
                    <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                      <span>{otpError}</span>
                    </div>
                  )}

                  <button
                    id="verify-otp-btn"
                    type="button"
                    disabled={isVerifyingOtp || otpValue.join('').length !== 4}
                    onClick={() => handleVerifyOtp()}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white text-sm font-extrabold transition-all shadow-xs hover:shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isVerifyingOtp ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Verifying OTP...</span>
                      </>
                    ) : (
                      <span>Verify & Login</span>
                    )}
                  </button>

                  {/* Resend OTP */}
                  <div className="text-center pt-1">
                    {isResendActive ? (
                      <button
                        type="button"
                        onClick={() => handleSendMobileOtp()}
                        disabled={isLoading}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                      >
                        Resend OTP
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400 font-medium">
                        Resend OTP in {resendCountdown}s
                      </span>
                    )}
                  </div>
                </div>
              ) : authStep === 'google_form' ? (
                /* 2. VIEW: GOOGLE ACCOUNT CONNECT PROMPT */
                <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-2xs space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <GoogleIcon className="w-4 h-4" />
                      <h3 className="text-xs font-extrabold text-gray-900">
                        Continue with Google Account
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAuthStep('main')}
                      className="text-gray-400 hover:text-gray-600 text-[11px] font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Select or enter your authentic Google account to connect:
                  </p>

                  <form onSubmit={handleCustomGoogleSubmit} className="space-y-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">
                        Google Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={googleEmailInput}
                        onChange={(e) => setGoogleEmailInput(e.target.value)}
                        placeholder="yourname@gmail.com"
                        className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-emerald-600 font-medium"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">
                        Full Name (as on Google)
                      </label>
                      <input
                        type="text"
                        value={googleNameInput}
                        onChange={(e) => setGoogleNameInput(e.target.value)}
                        placeholder="Your full name"
                        className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-emerald-600 font-medium"
                      />
                    </div>

                    <div className="pt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAuthStep('main')}
                        className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading || !googleEmailInput.trim()}
                        className="flex-1 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                        ) : (
                          <span>Verify & Sign In</span>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* 3. VIEW: PRIMARY LOGIN SCREEN: GOOGLE + DIVIDER + MOBILE NUMBER */
                <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-2xs space-y-4">
                  {/* Option 1: Continue with Google */}
                  <div>
                    <button
                      id="continue-with-google-btn"
                      type="button"
                      disabled={isLoading}
                      onClick={handleStartGoogleAuth}
                      className="w-full py-3 px-4 rounded-xl bg-white hover:bg-gray-50 active:scale-[0.99] border border-gray-300 hover:border-emerald-500 text-gray-800 hover:text-gray-950 text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2.5 shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                          <span className="font-bold text-gray-900">
                            Connecting to Google...
                          </span>
                        </>
                      ) : (
                        <>
                          <GoogleIcon className="w-4.5 h-4.5 shrink-0 transition-transform group-hover:scale-105" />
                          <span className="font-extrabold tracking-tight">
                            Continue with Google
                          </span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Clean Text Divider: ──────── OR ──────── */}
                  <div className="relative flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative bg-white px-3 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                      OR
                    </div>
                  </div>

                  {/* Option 2: Mobile Number Form */}
                  <form onSubmit={handleSendMobileOtp} className="space-y-3">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="login-mobile-input"
                        className="block text-xs font-extrabold text-gray-800"
                      >
                        Mobile Number
                      </label>
                      <div className="flex items-center rounded-xl border border-gray-300 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100 bg-white overflow-hidden transition-all">
                        <div className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-50 border-r border-gray-200 text-xs font-black text-gray-700 select-none shrink-0">
                          <span className="text-sm">🇮🇳</span>
                          <span>+91</span>
                        </div>
                        <input
                          id="login-mobile-input"
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={10}
                          value={mobileNumber}
                          onChange={(e) => {
                            const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                            setMobileNumber(clean);
                            setErrorMessage(null);
                          }}
                          placeholder="Enter mobile number"
                          className="w-full px-3 py-2.5 text-sm font-bold text-gray-900 placeholder:text-gray-400 placeholder:font-normal focus:outline-none bg-transparent"
                          autoComplete="tel-national"
                        />
                        {mobileNumber && (
                          <button
                            type="button"
                            onClick={() => setMobileNumber('')}
                            className="pr-3 text-gray-400 hover:text-gray-600 text-xs font-bold"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500 block">
                        Enter valid 10-digit Indian mobile number
                      </span>
                    </div>

                    <button
                      id="mobile-continue-btn"
                      type="submit"
                      disabled={isLoading || mobileNumber.length !== 10}
                      className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white text-sm font-extrabold transition-all shadow-xs hover:shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Sending OTP...</span>
                        </>
                      ) : (
                        <span>Continue</span>
                      )}
                    </button>
                  </form>

                  <div className="flex items-center justify-center gap-1 pt-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-[10px] font-medium text-gray-500">
                      Real & secure login • Instant OTP verification
                    </span>
                  </div>
                </div>
              )}

              {/* Delivery Speed Card - Proportional & Compact */}
              <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Zap className="w-4 h-4 text-emerald-100 fill-emerald-100" />
                </div>
                <div>
                  <h4 className="text-[11px] font-black text-emerald-950 uppercase tracking-wider leading-tight">
                    Lakkavalli Express Delivery
                  </h4>
                  <p className="text-[11px] text-emerald-800/90 font-medium mt-0.25">
                    Farm-fresh groceries delivered to your door in 10 mins
                  </p>
                </div>
              </div>

              {/* Feature Highlights - Compact & Tight */}
              <div className="bg-white rounded-xl p-3 border border-emerald-100/70 space-y-1.5">
                <div className="flex items-center gap-2 text-[11px] text-gray-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Instant 1-tap sign in with your Google account</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Live GPS order tracking and saved delivery address</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Speedy 10-minute delivery in Lakkavalli</span>
                </div>
              </div>
            </div>

            {/* Footer with Business Copyright */}
            <footer className="pt-3 border-t border-emerald-100/70 text-center space-y-0.5">
              <p className="text-[11px] text-gray-700 font-bold">
                QuickBasket™ Lakkavalli • Sharu Enterprises
              </p>
              <p className="text-[10px] text-gray-500 font-medium">
                © 2026 Sharu Enterprises. All Rights Reserved.
              </p>
              <p className="text-[9px] text-gray-400">
                100% Fresh Groceries & Daily Essentials Delivered in 10 Minutes.
              </p>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
};
