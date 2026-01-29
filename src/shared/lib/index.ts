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

// Animation utilities
export {
  getStaggerStyle,
  getStaggeredItemProps,
  STAGGER_ITEM_CLASS,
  STAGGER_DELAY_MS,
  MAX_STAGGER_DELAY_MS,
} from '@/lib/staggerAnimation';

// Motion variants and presets
export {
  springs,
  pageTransition,
  tabContentVariants,
  cardEntrance,
  staggerContainer,
  staggerItem,
  mobileSlideUp,
  mobileScale,
  tapScale,
  hoverLift,
  pressable,
  shimmer,
  pulse,
  drawerVariants,
  modalVariants,
  overlayVariants,
  headerBadge,
  headerTitle,
  headerSubtitle,
  listContainer,
  listItem,
  successPop,
  shake,
} from '@/lib/animations';

// Trade export utilities
export {
  exportTradesToCSV,
  exportTradesToJSON,
  generateShareableLink,
  parseShareableLink,
} from '@/lib/tradeExport';

// Transaction sync utilities
export {
  fetchDexTransactions,
  upsertDexTransaction,
  updateDexTransactionStatus,
  deleteDexTransaction,
  clearDexTransactions,
  fetchInstantTransactions,
  upsertInstantTransaction,
  updateInstantTransactionStatus,
  deleteInstantTransaction,
  clearInstantTransactions,
} from '@/lib/transactionSync';
export type { DexTransactionDB, InstantTransactionDB } from '@/lib/transactionSync';
