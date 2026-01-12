import { useCallback } from 'react';

type HapticIntensity = 'light' | 'medium' | 'heavy';

/**
 * Hook for triggering haptic feedback on mobile devices
 * Uses the Web Vibration API with fallback for unsupported devices
 */
export function useHapticFeedback() {
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  const vibrate = useCallback((pattern: number | number[]) => {
    if (isSupported) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Silently fail if vibration not allowed
      }
    }
  }, [isSupported]);

  const trigger = useCallback((intensity: HapticIntensity = 'light') => {
    const patterns: Record<HapticIntensity, number> = {
      light: 10,
      medium: 25,
      heavy: 50,
    };
    vibrate(patterns[intensity]);
  }, [vibrate]);

  const triggerSuccess = useCallback(() => {
    // Double tap pattern for success
    vibrate([15, 50, 15]);
  }, [vibrate]);

  const triggerError = useCallback(() => {
    // Triple tap pattern for error
    vibrate([30, 50, 30, 50, 30]);
  }, [vibrate]);

  const triggerWarning = useCallback(() => {
    // Single longer vibration for warning
    vibrate(40);
  }, [vibrate]);

  return {
    isSupported,
    trigger,
    triggerSuccess,
    triggerError,
    triggerWarning,
  };
}

/**
 * Utility function for one-off haptic feedback without hook
 */
export function hapticFeedback(intensity: HapticIntensity = 'light') {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    const patterns: Record<HapticIntensity, number> = {
      light: 10,
      medium: 25,
      heavy: 50,
    };
    try {
      navigator.vibrate(patterns[intensity]);
    } catch {
      // Silently fail
    }
  }
}
