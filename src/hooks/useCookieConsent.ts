import { useState, useEffect, useCallback } from "react";

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
}

const COOKIE_PREFERENCES_KEY = "xlama-cookie-preferences";
const COOKIE_CONSENT_KEY = "xlama-cookie-consent";

export function getCookiePreferences(): CookiePreferences {
  const stored = localStorage.getItem(COOKIE_PREFERENCES_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return { essential: true, analytics: false, marketing: false };
    }
  }
  return { essential: true, analytics: false, marketing: false };
}

export function hasConsented(): boolean {
  return localStorage.getItem(COOKIE_CONSENT_KEY) !== null;
}

export function useCookieConsent() {
  const [preferences, setPreferences] = useState<CookiePreferences>(getCookiePreferences);
  const [consented, setConsented] = useState<boolean>(hasConsented);

  useEffect(() => {
    const handleStorageChange = () => {
      setPreferences(getCookiePreferences());
      setConsented(hasConsented());
    };

    // Listen for preference changes
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("cookie-preferences-updated", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("cookie-preferences-updated", handleStorageChange);
    };
  }, []);

  const isAnalyticsEnabled = useCallback(() => {
    return consented && preferences.analytics;
  }, [consented, preferences.analytics]);

  const isMarketingEnabled = useCallback(() => {
    return consented && preferences.marketing;
  }, [consented, preferences.marketing]);

  return {
    preferences,
    consented,
    isAnalyticsEnabled,
    isMarketingEnabled,
  };
}
