import { useCallback, useEffect, useState } from 'react';

// ============ HAPTIC PATTERNS ============
// Perceptible vibration patterns that actually work on mobile devices
export const HAPTIC_PATTERNS = {
  // Single taps - perceptible
  tap: [25],
  light: [20],
  
  // Double pulse patterns
  medium: [30, 50, 30],
  select: [25, 40, 25],
  
  // Strong feedback patterns
  heavy: [50, 40, 50, 40, 50],
  success: [30, 60, 40],
  error: [70, 50, 70],
  warning: [50, 70],
  
  // Navigation feedback
  swipe: [20, 30, 20],
  refresh: [40, 30, 40],
} as const;

export type HapticPattern = keyof typeof HAPTIC_PATTERNS;
export type HapticIntensity = 'off' | 'light' | 'medium' | 'strong';

// Storage key for haptic settings
const HAPTIC_SETTINGS_KEY = 'xlama-haptic-settings';

interface HapticSettings {
  intensity: HapticIntensity;
  enabled: boolean;
}

const defaultSettings: HapticSettings = {
  intensity: 'medium',
  enabled: true,
};

// Intensity multipliers
const INTENSITY_MULTIPLIERS: Record<HapticIntensity, number> = {
  off: 0,
  light: 0.6,
  medium: 1,
  strong: 1.5,
};

// Audio context for fallback tactile clicks
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioContext;
}

/**
 * Generate a tactile click sound as fallback for devices without vibration
 */
function playTactileClick(intensity: HapticIntensity = 'medium') {
  const ctx = getAudioContext();
  if (!ctx || intensity === 'off') return;
  
  try {
    // Resume context if suspended (autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Use a low frequency for tactile feel
    oscillator.type = 'sine';
    oscillator.frequency.value = 350;
    
    const volume = 0.08 * INTENSITY_MULTIPLIERS[intensity];
    const duration = 0.015 * INTENSITY_MULTIPLIERS[intensity];
    
    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    oscillator.start(now);
    oscillator.stop(now + duration + 0.01);
  } catch {
    // Ignore audio errors silently
  }
}

/**
 * Check for iOS Haptic Engine support (Taptic Engine)
 */
function triggerIOSHaptic(style: 'light' | 'medium' | 'heavy' = 'light'): boolean {
  try {
    // iOS webkit haptic API (if available in PWA context)
    if ((window as any).webkit?.messageHandlers?.hapticFeedback) {
      (window as any).webkit.messageHandlers.hapticFeedback.postMessage({ style });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function loadSettings(): HapticSettings {
  try {
    const stored = localStorage.getItem(HAPTIC_SETTINGS_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return defaultSettings;
}

function saveSettings(settings: HapticSettings): void {
  try {
    localStorage.setItem(HAPTIC_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Hook for triggering haptic feedback on mobile devices
 * Uses Web Vibration API with perceptible patterns + audio fallback
 */
export function useHapticFeedback() {
  const [settings, setSettings] = useState<HapticSettings>(defaultSettings);
  const isVibrationSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  // Load settings on mount
  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const vibrate = useCallback((pattern: number | number[]) => {
    if (settings.intensity === 'off' || !settings.enabled) return;
    
    // Apply intensity multiplier to pattern
    const multiplier = INTENSITY_MULTIPLIERS[settings.intensity];
    const scaledPattern = Array.isArray(pattern) 
      ? pattern.map((v, i) => i % 2 === 0 ? Math.round(v * multiplier) : v) // Scale vibration, not pauses
      : Math.round(pattern * multiplier);
    
    // Try iOS Taptic Engine first
    if (triggerIOSHaptic(settings.intensity === 'light' ? 'light' : settings.intensity === 'strong' ? 'heavy' : 'medium')) {
      return;
    }
    
    // Try Web Vibration API
    if (isVibrationSupported) {
      try {
        navigator.vibrate(scaledPattern);
        return;
      } catch {
        // Fall through to audio fallback
      }
    }
    
    // Fallback: tactile audio click
    playTactileClick(settings.intensity);
  }, [settings, isVibrationSupported]);

  const trigger = useCallback((pattern: HapticPattern = 'light') => {
    vibrate([...HAPTIC_PATTERNS[pattern]]);
  }, [vibrate]);

  const triggerSuccess = useCallback(() => {
    vibrate([...HAPTIC_PATTERNS.success]);
  }, [vibrate]);

  const triggerError = useCallback(() => {
    vibrate([...HAPTIC_PATTERNS.error]);
  }, [vibrate]);

  const triggerWarning = useCallback(() => {
    vibrate([...HAPTIC_PATTERNS.warning]);
  }, [vibrate]);

  const triggerSwipe = useCallback(() => {
    vibrate([...HAPTIC_PATTERNS.swipe]);
  }, [vibrate]);

  const setIntensity = useCallback((intensity: HapticIntensity) => {
    setSettings(prev => {
      const newSettings = { ...prev, intensity, enabled: intensity !== 'off' };
      saveSettings(newSettings);
      return newSettings;
    });
  }, []);

  const toggleEnabled = useCallback(() => {
    setSettings(prev => {
      const newSettings = { ...prev, enabled: !prev.enabled };
      saveSettings(newSettings);
      return newSettings;
    });
  }, []);

  return {
    isSupported: isVibrationSupported,
    settings,
    trigger,
    triggerSuccess,
    triggerError,
    triggerWarning,
    triggerSwipe,
    setIntensity,
    toggleEnabled,
  };
}

/**
 * Utility function for one-off haptic feedback without hook
 */
export function hapticFeedback(pattern: HapticPattern = 'light') {
  const settings = loadSettings();
  if (settings.intensity === 'off' || !settings.enabled) return;
  
  const multiplier = INTENSITY_MULTIPLIERS[settings.intensity];
  const basePattern = HAPTIC_PATTERNS[pattern];
  const scaledPattern = basePattern.map((v, i) => 
    i % 2 === 0 ? Math.round(v * multiplier) : v
  );
  
  // Try iOS first
  if (triggerIOSHaptic(settings.intensity === 'light' ? 'light' : settings.intensity === 'strong' ? 'heavy' : 'medium')) {
    return;
  }
  
  // Try vibration
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(scaledPattern);
      return;
    } catch {
      // Fall through
    }
  }
  
  // Audio fallback
  playTactileClick(settings.intensity);
}

// Legacy compatibility - map old intensity names to patterns
export function hapticTap() {
  hapticFeedback('tap');
}

export function hapticMedium() {
  hapticFeedback('medium');
}

export function hapticHeavy() {
  hapticFeedback('heavy');
}
