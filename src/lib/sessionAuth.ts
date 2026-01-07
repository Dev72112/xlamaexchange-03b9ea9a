/**
 * Session-Based Authentication
 * @deprecated Import from '@/features/wallet' instead
 * This file is kept for backwards compatibility
 */

// Re-export everything from the new location
export {
  type SessionAuth,
  type SigningProviders,
  clearSessionAuth,
  clearAllSessionAuth,
  hasValidSessionAuth,
  getOrCreateSessionAuth,
  getSessionTimeRemaining,
} from '@/features/wallet/lib/sessionAuth';
