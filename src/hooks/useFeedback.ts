import { useCallback, useEffect, useState } from 'react';
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
  const haptic = useHapticFeedback();

  // Load settings on mount and sync with localStorage changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === FEEDBACK_SETTINGS_KEY) {
        setSettings(loadSettings());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Play UI sound effect using Web Audio API
  const playSound = useCallback((type: SoundType) => {
    if (!settings.soundEnabled) return;
    playUISound(type, 0.15);
  }, [settings.soundEnabled]);

  // Trigger haptic feedback using the enhanced hook
  const triggerHaptic = useCallback((pattern: HapticPattern = 'light') => {
    if (!settings.hapticEnabled) return;
    haptic.trigger(pattern);
  }, [settings.hapticEnabled, haptic]);

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
          // Trigger storage event for cross-component sync
          window.dispatchEvent(new StorageEvent('storage', { key: hapticSettingsKey }));
        } catch {
          // Ignore errors
        }
      }
      
      return updated;
    });
  }, []);

  // Play notification alert sound
  const playAlert = useCallback(() => {
    if (!settings.soundEnabled) return;
    playNotificationSound(settings.notificationSound, settings.notificationVolume);
  }, [settings.soundEnabled, settings.notificationSound, settings.notificationVolume]);

  // Preview a notification sound
  const previewSound = useCallback((soundId: NotificationSoundId) => {
    playNotificationSound(soundId, settings.notificationVolume);
  }, [settings.notificationVolume]);

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
