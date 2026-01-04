import { useCallback, useEffect, useState } from 'react';
import { SOUNDS, SoundType, NotificationSoundId, playNotificationSound } from '@/lib/sounds';

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

// Create audio elements lazily with embedded sounds
const audioCache = new Map<SoundType, HTMLAudioElement>();

function getAudio(type: SoundType): HTMLAudioElement {
  if (!audioCache.has(type)) {
    const audio = new Audio(SOUNDS[type]);
    audio.volume = 0.3;
    audioCache.set(type, audio);
  }
  return audioCache.get(type)!;
}

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
  const [settings, setSettings] = useState<FeedbackSettings>(defaultSettings);

  // Load settings on mount
  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  // Play sound effect
  const playSound = useCallback((type: SoundType) => {
    if (!settings.soundEnabled) return;
    
    try {
      const audio = getAudio(type);
      audio.currentTime = 0;
      audio.play().catch(() => {
        // Ignore autoplay restrictions
      });
    } catch {
      // Ignore audio errors
    }
  }, [settings.soundEnabled]);

  // Trigger haptic feedback
  const triggerHaptic = useCallback((style: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!settings.hapticEnabled) return;
    
    // Check for Vibration API support
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30, 10, 30],
      };
      navigator.vibrate(patterns[style]);
    }
  }, [settings.hapticEnabled]);

  // Combined feedback (sound + haptic)
  const triggerFeedback = useCallback((type: SoundType, hapticStyle: 'light' | 'medium' | 'heavy' = 'light') => {
    playSound(type);
    triggerHaptic(hapticStyle);
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

  // Update all settings
  const updateSettings = useCallback((newSettings: Partial<FeedbackSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      saveSettings(updated);
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
export function triggerFeedback(type: SoundType, hapticStyle: 'light' | 'medium' | 'heavy' = 'light') {
  globalFeedbackInstance?.triggerFeedback(type, hapticStyle);
}
