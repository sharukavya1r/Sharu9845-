/**
 * QuickBasket Mobile & Web Permission Manager
 * Handles browser-native permissions (Notifications, Speech/Mic, WebOTP, File Picker)
 * strictly Just-In-Time (JIT) when requested by explicit user action, with safe fallbacks.
 */

// Storage keys to avoid repeated nagging after user denial
const NOTIFICATION_DENIAL_KEY = 'quickbasket_notification_denied_at';

export type PermissionStatusResult = 'granted' | 'denied' | 'default' | 'unsupported';

/**
 * Checks current browser notification permission status safely
 */
export function getNotificationPermissionStatus(): PermissionStatusResult {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as PermissionStatusResult;
}

/**
 * Requests notification permission ONLY when the user explicitly triggers a notification feature.
 * Will not repeatedly prompt if the user previously denied.
 */
export async function requestNotificationPermission(): Promise<PermissionStatusResult> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  // If already granted
  if (Notification.permission === 'granted') {
    return 'granted';
  }

  // If denied by browser setting, do not attempt to spam
  if (Notification.permission === 'denied') {
    try {
      localStorage.setItem(NOTIFICATION_DENIAL_KEY, Date.now().toString());
    } catch {
      // ignore storage error
    }
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'denied') {
      try {
        localStorage.setItem(NOTIFICATION_DENIAL_KEY, Date.now().toString());
      } catch {
        // ignore
      }
    }
    return permission as PermissionStatusResult;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return 'unsupported';
  }
}

/**
 * Displays a native browser notification if granted, with graceful fallback
 */
export function sendBrowserNotification(
  title: string,
  options?: NotificationOptions
): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };
      return true;
    } catch (err) {
      console.warn('Could not dispatch browser notification:', err);
      return false;
    }
  }

  return false;
}

/**
 * WebOTP API Helper for standard browser SMS autofill
 * Safely listens for incoming SMS OTP without requiring invasive device permissions.
 */
export function listenForWebOTP(
  onOtpReceived: (otp: string) => void,
  signal?: AbortSignal
): void {
  if (
    typeof window === 'undefined' ||
    !('OTPCredential' in window) ||
    !navigator.credentials ||
    !navigator.credentials.get
  ) {
    return;
  }

  navigator.credentials
    .get({
      otp: { transport: ['sms'] },
      signal,
    } as any)
    .then((content: any) => {
      if (content && content.code) {
        // Extract 4-digit or 6-digit OTP code
        const matched = content.code.match(/\d{4,6}/);
        if (matched) {
          onOtpReceived(matched[0]);
        }
      }
    })
    .catch((err) => {
      // AbortError or timeout is normal when user enters manually or cancels
      if (err && err.name !== 'AbortError') {
        console.debug('WebOTP auto-read bypassed/unavailable:', err.message);
      }
    });
}
