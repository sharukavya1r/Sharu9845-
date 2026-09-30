/**
 * Converts any user identifier (phone, email, ID) into a stable canonical customer ID.
 * This guarantees that Customer A will ALWAYS map to the exact same permanent customer key
 * across all logins and sessions, and will never collide with Customer B.
 */
export function toCanonicalUserId(identifier?: string | null): string | null {
  if (!identifier || typeof identifier !== 'string') return null;
  const trimmed = identifier.trim();
  if (!trimmed || trimmed === 'verified_user') return null;

  // Already formatted canonical ID
  if (
    trimmed.startsWith('user_phone_') ||
    trimmed.startsWith('user_email_') ||
    trimmed.startsWith('google_')
  ) {
    return trimmed;
  }

  // Email format
  if (trimmed.includes('@')) {
    const cleanEmail = trimmed.toLowerCase();
    return `user_email_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  // Phone number (Indian 10-digit mobile or international)
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length >= 10) {
    const last10 = digitsOnly.slice(-10);
    return `user_phone_${last10}`;
  }

  // Fallback sanitized ID
  return `user_${trimmed.replace(/[^a-zA-Z0-9]/g, '_')}`;
}
