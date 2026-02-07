import { useCallback, useEffect, useRef, useState } from 'react';

// ============ HAPTIC PATTERNS ============
export const HAPTIC_PATTERNS = {
  tap: [50],
  light: [45],
  medium: [55, 80, 55],
  select: [50, 70, 50],
  heavy: [80, 60, 80, 60, 80],
  success: [60, 100, 70],
  error: [100, 80, 100],
  warning: [80, 100],
  swipe: [45, 60, 45],
  refresh: [70, 60, 70],
} as const;

export type HapticPattern = keyof typeof HAPTIC_PATTERNS;
export type HapticIntensity = 'off' | 'light' | 'medium' | 'strong';

const HAPTIC_SETTINGS_KEY = 'xlama-haptic-settings';

interface HapticSettings {
  intensity: HapticIntensity;
  enabled: boolean;
}

const defaultSettings: HapticSettings = {
  intensity: 'medium',
  enabled: true,
};

const INTENSITY_MULTIPLIERS: Record<HapticIntensity, number> = {
  off: 0,
  light: 0.6,
  medium: 1,
  strong: 1.5,
};

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

function playTactileClick(intensity: HapticIntensity = 'medium') {
  const ctx = getAudioContext();
  if (!ctx || intensity === 'off') return;
  try {
    if (ctx.state === 'suspended') ctx.resume();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
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
    // Ignore audio errors
  }
}

function triggerIOSHaptic(style: 'light' | 'medium' | 'heavy' = 'light'): boolean {
  try {
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
    if (stored) return { ...defaultSettings, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return defaultSettings;
}

function saveSettings(settings: HapticSettings): void {
  try {
    localStorage.setItem(HAPTIC_SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

export function useHapticFeedback() {
  const [settings, setSettings] = useState<HapticSettings>(() => loadSettings());
  const settingsRef = useRef(settings);
  const isVibrationSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  // Keep ref in sync
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Sync with localStorage changes from other components
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === HAPTIC_SETTINGS_KEY) {
        setSettings(loadSettings());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Also listen for custom sync events (same-tab updates from useFeedback)
  useEffect(() => {
    const handleSync = () => setSettings(loadSettings());
    window.addEventListener('haptic-settings-sync', handleSync);
    return () => window.removeEventListener('haptic-settings-sync', handleSync);
  }, []);

  const vibrate = useCallback((pattern: number | number[]) => {
    const s = settingsRef.current;
    if (s.intensity === 'off' || !s.enabled) return;
    
    const multiplier = INTENSITY_MULTIPLIERS[s.intensity];
    const scaledPattern = Array.isArray(pattern) 
      ? pattern.map((v, i) => i % 2 === 0 ? Math.round(v * multiplier) : v)
      : Math.round(pattern * multiplier);
    
    if (triggerIOSHaptic(s.intensity === 'light' ? 'light' : s.intensity === 'strong' ? 'heavy' : 'medium')) return;
    
    if (isVibrationSupported) {
      try {
        const result = navigator.vibrate(scaledPattern);
        if (result) return;
      } catch { /* fall through */ }
    }
    
    if (!isVibrationSupported) {
      playTactileClick(s.intensity);
    }
  }, [isVibrationSupported]);

  const trigger = useCallback((pattern: HapticPattern = 'light') => {
    vibrate([...HAPTIC_PATTERNS[pattern]]);
  }, [vibrate]);

  const triggerSuccess = useCallback(() => vibrate([...HAPTIC_PATTERNS.success]), [vibrate]);
  const triggerError = useCallback(() => vibrate([...HAPTIC_PATTERNS.error]), [vibrate]);
  const triggerWarning = useCallback(() => vibrate([...HAPTIC_PATTERNS.warning]), [vibrate]);
  const triggerSwipe = useCallback(() => vibrate([...HAPTIC_PATTERNS.swipe]), [vibrate]);

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

export function hapticFeedback(pattern: HapticPattern = 'light') {
  const settings = loadSettings();
  if (settings.intensity === 'off' || !settings.enabled) return;
  const multiplier = INTENSITY_MULTIPLIERS[settings.intensity];
  const basePattern = HAPTIC_PATTERNS[pattern];
  const scaledPattern = basePattern.map((v, i) => i % 2 === 0 ? Math.round(v * multiplier) : v);
  if (triggerIOSHaptic(settings.intensity === 'light' ? 'light' : settings.intensity === 'strong' ? 'heavy' : 'medium')) return;
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(scaledPattern); return; } catch { /* fall through */ }
  }
  playTactileClick(settings.intensity);
}

export function hapticTap() { hapticFeedback('tap'); }
export function hapticMedium() { hapticFeedback('medium'); }
export function hapticHeavy() { hapticFeedback('heavy'); }
