import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { initializeTracking, trackPageView, removeTracking } from "@/lib/tracking";

export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { preferences, consented } = useCookieConsent();
  const previousPreferencesRef = useRef(preferences);

  // Initialize tracking when consent is given
  useEffect(() => {
    if (consented) {
      initializeTracking();
    }
  }, [consented]);

  // Handle preference changes
  useEffect(() => {
    const prev = previousPreferencesRef.current;
    
    // If analytics was enabled and now disabled, or marketing was enabled and now disabled
    if ((prev.analytics && !preferences.analytics) || (prev.marketing && !preferences.marketing)) {
      removeTracking();
    }
    
    // If analytics or marketing was just enabled
    if ((!prev.analytics && preferences.analytics) || (!prev.marketing && preferences.marketing)) {
      initializeTracking();
    }

    previousPreferencesRef.current = preferences;
  }, [preferences]);

  // Track page views
  useEffect(() => {
    if (consented && preferences.analytics) {
      trackPageView(location.pathname);
    }
  }, [location.pathname, consented, preferences.analytics]);

  return <>{children}</>;
}
