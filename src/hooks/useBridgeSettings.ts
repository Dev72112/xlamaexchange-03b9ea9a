import { useState, useEffect, useCallback } from 'react';

const BRIDGE_SETTINGS_KEY = 'xlama-bridge-settings';

export interface BridgeSettings {
  requireSignature: boolean;
  signatureThresholdUsd: number; // Sign for amounts above this threshold
  pushNotificationsEnabled: boolean;
}

const defaultSettings: BridgeSettings = {
  requireSignature: true,
  signatureThresholdUsd: 100, // Default: sign for bridges over $100
  pushNotificationsEnabled: true,
};

function loadSettings(): BridgeSettings {
  try {
    const stored = localStorage.getItem(BRIDGE_SETTINGS_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return defaultSettings;
}

function saveSettings(settings: BridgeSettings): void {
  try {
    localStorage.setItem(BRIDGE_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

export function useBridgeSettings() {
  const [settings, setSettings] = useState<BridgeSettings>(defaultSettings);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const updateSettings = useCallback((newSettings: Partial<BridgeSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const toggleSignature = useCallback(() => {
    setSettings(prev => {
      const updated = { ...prev, requireSignature: !prev.requireSignature };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const togglePushNotifications = useCallback(() => {
    setSettings(prev => {
      const updated = { ...prev, pushNotificationsEnabled: !prev.pushNotificationsEnabled };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const setSignatureThreshold = useCallback((threshold: number) => {
    setSettings(prev => {
      const updated = { ...prev, signatureThresholdUsd: threshold };
      saveSettings(updated);
      return updated;
    });
  }, []);

  // Check if signature is required for a given amount
  const shouldRequireSignature = useCallback((amountUsd: number) => {
    return settings.requireSignature && amountUsd >= settings.signatureThresholdUsd;
  }, [settings.requireSignature, settings.signatureThresholdUsd]);

  return {
    settings,
    updateSettings,
    toggleSignature,
    togglePushNotifications,
    setSignatureThreshold,
    shouldRequireSignature,
  };
}
