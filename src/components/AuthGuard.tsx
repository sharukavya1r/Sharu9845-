import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import { toCanonicalUserId } from '../utils/userUtils';
import { purgeSessionData, registerMemoryCleaner } from '../utils/sessionClearance';
import { Lock, Loader2 } from 'lucide-react';

export type AuthStatus = 'loading' | 'logged-out' | 'authenticated';

export interface AuthGuardProps {
  children: React.ReactNode;
  isLoggedIn?: boolean;
  isLoading?: boolean;
  user?: UserProfile | null;
  userId?: string | null;
  onSessionCleared?: () => void;
  requireAuth?: boolean;
  fallback?: React.ReactNode;
  onRequireAuth?: () => void;
  loadingFallback?: React.ReactNode;
}

export interface UseAuthGuardOptions {
  isLoggedIn?: boolean;
  isLoading?: boolean;
  userId?: string | null;
  onSessionCleared?: () => void;
  onClearMemory?: () => void;
}

export interface UseAuthGuardResult {
  initialized: boolean;
  authStatus: AuthStatus;
}

/**
 * Hook to manage customer session isolation and in-memory cleanups safely.
 * Explicitly tracks initialization with a stable internal state `const [initialized, setInitialized] = useState(false)`.
 * 
 * Rules:
 * - While initialized === false:
 *     - Do NOT call purgeSessionData()
 *     - Do NOT treat customer as logged out
 * - Only after initialized === true:
 *     - If logged in -> 'authenticated'
 *     - If not logged in -> 'logged-out'
 * - Session purge ONLY triggers on confirmed real logout (authenticated -> logged-out)
 *   or an authenticated account switch between two distinct IDs.
 */
export function useAuthGuard({
  isLoggedIn = false,
  isLoading = false,
  userId,
  onSessionCleared,
  onClearMemory,
}: UseAuthGuardOptions): UseAuthGuardResult {
  const [initialized, setInitialized] = useState(false);
  const canonicalId = toCanonicalUserId(userId);

  // Stable internal tracker for transitions
  const prevAuthState = useRef<{
    initialized: boolean;
    isLoggedIn: boolean;
    canonicalId: string | null;
  }>({
    initialized: false,
    isLoggedIn: false,
    canonicalId: null,
  });

  // Register in-memory cleaner for explicit purge events
  useEffect(() => {
    if (!onClearMemory) return;
    const unregister = registerMemoryCleaner(onClearMemory);
    return unregister;
  }, [onClearMemory]);

  // Handle initialization and auth state transitions
  useEffect(() => {
    // 1. If auth check is still resolving, do NOT mark initialized and do NOT purge
    if (isLoading) {
      return;
    }

    const currentIsLoggedIn = Boolean(isLoggedIn);

    // 2. Initial resolution: mark initialized true only after loading completes
    if (!initialized) {
      setInitialized(true);
      prevAuthState.current = {
        initialized: true,
        isLoggedIn: currentIsLoggedIn,
        canonicalId,
      };
      return;
    }

    // 3. Post-initialization transitions
    const prev = prevAuthState.current;
    if (!prev.initialized) {
      prevAuthState.current = {
        initialized: true,
        isLoggedIn: currentIsLoggedIn,
        canonicalId,
      };
      return;
    }

    const wasLoggedIn = prev.isLoggedIn;
    const nowLoggedIn = currentIsLoggedIn;
    const hadCanonical = Boolean(prev.canonicalId);
    const hasCanonical = Boolean(canonicalId);
    const accountSwitched = hadCanonical && hasCanonical && prev.canonicalId !== canonicalId;

    // PURGE TRIGGER: ONLY when transitioning from confirmed authenticated -> logged-out
    // OR when switching accounts between two distinct valid customer IDs
    if ((wasLoggedIn && !nowLoggedIn) || (wasLoggedIn && nowLoggedIn && accountSwitched)) {
      purgeSessionData({
        preservePersistentVault: true,
        onComplete: onSessionCleared,
      });
    }

    // Update stable reference
    prevAuthState.current = {
      initialized: true,
      isLoggedIn: nowLoggedIn,
      canonicalId,
    };
  }, [isLoading, initialized, isLoggedIn, canonicalId, onSessionCleared]);

  const authStatus: AuthStatus = (!initialized || isLoading)
    ? 'loading'
    : isLoggedIn
    ? 'authenticated'
    : 'logged-out';

  return { initialized, authStatus };
}

/**
 * AuthGuard Component
 * 
 * Explicitly separates rendering into three clear states:
 * 1. 'loading'       -> shows graceful loader without unmounting/purging while initialized === false or isLoading === true
 * 2. 'logged-out'    -> if requireAuth, shows login prompt or fallback once initialized === true and user is logged out
 * 3. 'authenticated' -> renders protected page normally once initialized === true and user is authenticated
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  isLoggedIn = false,
  isLoading = false,
  user,
  userId,
  onSessionCleared,
  requireAuth = false,
  fallback,
  onRequireAuth,
  loadingFallback,
}) => {
  const effectiveUserId = userId || user?.id || user?.phone || user?.email;
  const effectiveIsLoggedIn = Boolean(isLoggedIn || user?.isLoggedIn);

  const { initialized, authStatus } = useAuthGuard({
    isLoggedIn: effectiveIsLoggedIn,
    isLoading,
    userId: effectiveUserId,
    onSessionCleared,
  });

  // 1. LOADING STATE (while initialized === false or isLoading === true)
  if (!initialized || isLoading || authStatus === 'loading') {
    if (loadingFallback) {
      return <>{loadingFallback}</>;
    }
    return (
      <div className="w-full min-h-[260px] flex flex-col items-center justify-center p-6 text-center bg-white rounded-2xl border border-gray-100 shadow-2xs m-2">
        <Loader2 className="w-7 h-7 animate-spin text-[#064e3b] mb-3" />
        <h4 className="font-bold text-sm text-gray-800 mb-1">Loading Account...</h4>
        <p className="text-xs text-gray-500 max-w-xs">
          Please wait while your QuickBasket session is verified.
        </p>
      </div>
    );
  }

  // 2. LOGGED-OUT STATE (when initialized === true and user is not authenticated)
  if (authStatus === 'logged-out' && requireAuth) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="w-full min-h-[300px] flex flex-col items-center justify-center p-6 text-center bg-white rounded-2xl border border-gray-100 shadow-2xs m-2">
        <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#064e3b] flex items-center justify-center mb-3">
          <Lock className="w-6 h-6 stroke-[2]" />
        </div>
        <h3 className="font-extrabold text-base text-gray-900 mb-1">
          Authentication Required
        </h3>
        <p className="text-xs text-gray-500 max-w-xs mb-4">
          Please log in to your account to view your customer details, orders, and addresses.
        </p>
        {onRequireAuth && (
          <button
            onClick={onRequireAuth}
            className="px-5 py-2.5 rounded-xl bg-[#064e3b] text-white text-xs font-extrabold hover:bg-[#043c2d] transition-colors shadow-xs cursor-pointer"
          >
            Log In or Register
          </button>
        )}
      </div>
    );
  }

  // 3. AUTHENTICATED OR PUBLIC VIEW
  return <>{children}</>;
};
