/**
 * Shared Utilities - Barrel Export
 * Common utility functions used across the app
 */

// General utilities
export { cn } from '@/lib/utils';

// API utilities
export { getUserFriendlyErrorMessage } from '@/lib/api-utils';
export { apiCoordinator, CACHE_TTL } from '@/lib/apiCoordinator';

// Cache utilities
export { cache, cacheKeys } from '@/lib/cache';

// Request signing
export {
  signEvmMessage,
  signSolanaMessage,
  signTronMessage,
  signSuiMessage,
  signTonMessage,
  generateNonce,
} from '@/lib/requestSigning';

// Route prefetching
export { prefetchRoute } from '@/lib/routePrefetch';
export { prefetchChain } from '@/lib/tokenPrefetch';

// Sounds
export { SOUNDS, type SoundType, NOTIFICATION_SOUNDS, type NotificationSoundId } from '@/lib/sounds';

// Technical indicators
export {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
} from '@/lib/technicalIndicators';

// Tracking
export {
  trackSwapInitiated,
  trackSwapCompleted,
  trackBridgeInitiated,
  trackBridgeCompleted,
} from '@/lib/tracking';
