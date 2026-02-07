import { useCallback, useEffect, useRef, useState } from 'react';
import { SOUNDS, SoundType, NotificationSoundId, playNotificationSound, playUISound } from '@/lib/sounds';
import { useHapticFeedback, HapticPattern } from './useHapticFeedback';

// Storage key for feedback settings
const FEEDBACK_SETTINGS_KEY = 'xlama-feedback-settings';

interface FeedbackSettings {
  soundEnabled: boolean;
  hapticEnabled: boolean;
  notificationSound: NotificationSoundId;
  notificationVolume: number;
}

const defaultSettings: FeedbackSettings = {
  soundEnabled: true,
  hapticEnabled: true,
  notificationSound: 'chime',
  notificationVolume: 0.5,
};

function loadSettings(): FeedbackSettings {
  try {
    const stored = localStorage.getItem(FEEDBACK_SETTINGS_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return defaultSettings;
}

function saveSettings(settings: FeedbackSettings): void {
  try {
    localStorage.setItem(FEEDBACK_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

export function useFeedback() {
  const [settings, setSettings] = useState<FeedbackSettings>(() => loadSettings());
  const settingsRef = useRef(settings);
  const haptic = useHapticFeedback();

  // Keep ref in sync so callbacks never read stale values
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Sync with localStorage changes (e.g., from other tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === FEEDBACK_SETTINGS_KEY) {
        setSettings(loadSettings());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Play UI sound effect - reads from ref to avoid stale closure
  const playSound = useCallback((type: SoundType) => {
    if (!settingsRef.current.soundEnabled) return;
    playUISound(type, 0.15);
  }, []);

  // Trigger haptic feedback - reads from ref
  const triggerHaptic = useCallback((pattern: HapticPattern = 'light') => {
    if (!settingsRef.current.hapticEnabled) return;
    haptic.trigger(pattern);
  }, [haptic]);

  // Combined feedback (sound + haptic)
  const triggerFeedback = useCallback((type: SoundType, hapticPattern: HapticPattern = 'light') => {
    playSound(type);
    triggerHaptic(hapticPattern);
  }, [playSound, triggerHaptic]);

  // Toggle sound
  const toggleSound = useCallback(() => {
    setSettings(prev => {
      const newSettings = { ...prev, soundEnabled: !prev.soundEnabled };
      saveSettings(newSettings);
      return newSettings;
    });
  }, []);

  // Toggle haptic
  const toggleHaptic = useCallback(() => {
    setSettings(prev => {
      const newSettings = { ...prev, hapticEnabled: !prev.hapticEnabled };
      saveSettings(newSettings);
      return newSettings;
    });
  }, []);

  // Update all settings and sync haptic enabled state
  const updateSettings = useCallback((newSettings: Partial<FeedbackSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      saveSettings(updated);
      
      // Sync haptic enabled state with the haptic hook's storage
      if ('hapticEnabled' in newSettings) {
        try {
          const hapticSettingsKey = 'xlama-haptic-settings';
          const storedHaptic = localStorage.getItem(hapticSettingsKey);
          const hapticSettings = storedHaptic ? JSON.parse(storedHaptic) : { intensity: 'medium', enabled: true };
          hapticSettings.enabled = newSettings.hapticEnabled;
          localStorage.setItem(hapticSettingsKey, JSON.stringify(hapticSettings));
        } catch {
          // Ignore errors
        }
      }
      
      return updated;
    });
  }, []);

  // Play notification alert sound - reads from ref
  const playAlert = useCallback(() => {
    if (!settingsRef.current.soundEnabled) return;
    playNotificationSound(settingsRef.current.notificationSound, settingsRef.current.notificationVolume);
  }, []);

  // Preview a notification sound
  const previewSound = useCallback((soundId: NotificationSoundId) => {
    playNotificationSound(soundId, settingsRef.current.notificationVolume);
  }, []);

  return {
    settings,
    playSound,
    triggerHaptic,
    triggerFeedback,
    toggleSound,
    toggleHaptic,
    updateSettings,
    playAlert,
    previewSound,
    // Expose haptic controls
    hapticSettings: haptic.settings,
    setHapticIntensity: haptic.setIntensity,
  };
}

// Re-export SoundType and NotificationSoundId for use in other components
export type { SoundType };
export type { NotificationSoundId };

// Singleton for global feedback access
let globalFeedbackInstance: ReturnType<typeof useFeedback> | null = null;

export function useGlobalFeedback() {
  const feedback = useFeedback();
  
  // Store reference for non-hook access
  useEffect(() => {
    globalFeedbackInstance = feedback;
  }, [feedback]);
  
  return feedback;
}

// Non-hook access for imperative calls
export function triggerFeedback(type: SoundType, hapticPattern: HapticPattern = 'light') {
  globalFeedbackInstance?.triggerFeedback(type, hapticPattern);
}

// Export types
export type { HapticPattern };
