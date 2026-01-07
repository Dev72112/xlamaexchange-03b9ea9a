/**
 * Shared Hooks - Barrel Export
 * Cross-cutting hooks used across features
 */

// Mobile detection
export { useIsMobile } from '@/hooks/use-mobile';

// Toast notifications
export { useToast, toast } from '@/hooks/use-toast';

// Cookie consent
export { useCookieConsent } from '@/hooks/useCookieConsent';

// Theme customization
export { useThemeCustomization } from '@/hooks/useThemeCustomization';

// Favorites
export { useFavorites } from '@/hooks/useFavorites';
export { useFavoritePairs } from '@/hooks/useFavoritePairs';

// Feedback
export { useFeedback } from '@/hooks/useFeedback';
export { useFeedbackList } from '@/hooks/useFeedbackList';
export { useFeatureVotes } from '@/hooks/useFeatureVotes';

// Push notifications
export { usePushNotifications } from '@/hooks/usePushNotifications';

// Price alerts
export { usePriceAlerts } from '@/hooks/usePriceAlerts';
export { useDexPriceAlerts } from '@/hooks/useDexPriceAlerts';

// Transaction history
export { useTransactionHistory } from '@/hooks/useTransactionHistory';
export { useDexTransactionHistory } from '@/hooks/useDexTransactionHistory';

// Referral
export { useReferral } from '@/hooks/useReferral';

// Crypto news
export { useCryptoNews } from '@/hooks/useCryptoNews';
