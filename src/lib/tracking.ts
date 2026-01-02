import { getCookiePreferences, hasConsented } from "@/hooks/useCookieConsent";

// Analytics tracking interface
interface AnalyticsEvent {
  name: string;
  properties?: Record<string, string | number | boolean>;
}

// Declare gtag for TypeScript
declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

// Track page views (only if analytics cookies are enabled)
export function trackPageView(path: string) {
  if (!hasConsented() || !getCookiePreferences().analytics) {
    return;
  }

  // Log for development
  if (import.meta.env.DEV) {
    console.log("[Analytics] Page view:", path);
  }

  // Google Analytics integration (when GA_MEASUREMENT_ID is configured)
  if (window.gtag) {
    window.gtag('config', 'GA_MEASUREMENT_ID', { page_path: path });
  }
}

// Track custom events (only if analytics cookies are enabled)
export function trackEvent(event: AnalyticsEvent) {
  if (!hasConsented() || !getCookiePreferences().analytics) {
    return;
  }

  // Log for development
  if (import.meta.env.DEV) {
    console.log("[Analytics] Event:", event.name, event.properties);
  }

  // Google Analytics integration
  if (window.gtag) {
    window.gtag('event', event.name, event.properties);
  }
}

// Specific tracking functions for common events
export function trackSwapCompleted(mode: 'instant' | 'dex', chain: string, fromToken: string, toToken: string, amount?: number) {
  trackEvent({
    name: 'swap_completed',
    properties: {
      mode,
      chain,
      from_token: fromToken,
      to_token: toToken,
      ...(amount !== undefined && { amount }),
    },
  });
}

export function trackWalletConnected(walletType: string, chain: string) {
  trackEvent({
    name: 'wallet_connected',
    properties: {
      wallet_type: walletType,
      chain,
    },
  });
}

export function trackModeSwitch(mode: 'instant' | 'dex') {
  trackEvent({
    name: 'mode_switch',
    properties: { mode },
  });
}

export function trackPairFavorited(fromTicker: string, toTicker: string) {
  trackEvent({
    name: 'pair_favorited',
    properties: {
      from_ticker: fromTicker,
      to_ticker: toTicker,
    },
  });
}

export function trackPriceAlertCreated(fromTicker: string, toTicker: string, condition: string) {
  trackEvent({
    name: 'price_alert_created',
    properties: {
      from_ticker: fromTicker,
      to_ticker: toTicker,
      condition,
    },
  });
}

// Track marketing/conversion events (only if marketing cookies are enabled)
export function trackConversion(conversionId: string, value?: number) {
  if (!hasConsented() || !getCookiePreferences().marketing) {
    return;
  }

  // Log for development
  if (import.meta.env.DEV) {
    console.log("[Marketing] Conversion:", conversionId, value);
  }

  // Facebook Pixel integration example
  // if (window.fbq) {
  //   window.fbq('track', conversionId, { value });
  // }
}

// Initialize tracking based on user preferences
export function initializeTracking() {
  const preferences = getCookiePreferences();
  const consented = hasConsented();

  if (!consented) {
    return;
  }

  if (preferences.analytics) {
    initializeAnalytics();
  }

  if (preferences.marketing) {
    initializeMarketing();
  }
}

// Initialize analytics scripts
function initializeAnalytics() {
  // Prevent duplicate script loading
  if (document.querySelector('script[src*="googletagmanager"]')) {
    return;
  }

  // Log for development
  if (import.meta.env.DEV) {
    console.log("[Tracking] Analytics initialized");
    return; // Don't load GA in development
  }

  // Uncomment and configure with your GA Measurement ID:
  // const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';
  // const script = document.createElement('script');
  // script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  // script.async = true;
  // document.head.appendChild(script);
  //
  // window.dataLayer = window.dataLayer || [];
  // window.gtag = function() { window.dataLayer.push(arguments); };
  // window.gtag('js', new Date());
  // window.gtag('config', GA_MEASUREMENT_ID);
}

// Initialize marketing scripts
function initializeMarketing() {
  // Log for development
  if (import.meta.env.DEV) {
    console.log("[Tracking] Marketing initialized");
    return;
  }

  // Example: Load Facebook Pixel
  // !function(f,b,e,v,n,t,s){...}(window, document,'script',
  //   'https://connect.facebook.net/en_US/fbevents.js');
  // window.fbq('init', 'PIXEL_ID');
}

// Remove tracking when user declines
export function removeTracking() {
  // Remove analytics cookies
  const cookiesToRemove = ['_ga', '_gid', '_gat', '_fbp', '_fbc'];
  
  cookiesToRemove.forEach(cookieName => {
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname}`;
  });

  if (import.meta.env.DEV) {
    console.log("[Tracking] Tracking cookies removed");
  }
}
