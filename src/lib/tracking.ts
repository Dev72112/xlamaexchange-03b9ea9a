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

  // Google Analytics integration
  const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (window.gtag && gaId) {
    window.gtag('config', gaId, { page_path: path });
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
export function trackSwapInitiated(mode: 'instant' | 'dex' | 'bridge', chain: string, fromToken: string, toToken: string, amountUsd?: number) {
  trackEvent({
    name: 'swap_initiated',
    properties: {
      mode,
      chain,
      from_token: fromToken,
      to_token: toToken,
      ...(amountUsd !== undefined && { value: amountUsd }),
    },
  });
}

export function trackSwapCompleted(mode: 'instant' | 'dex' | 'bridge', chain: string, fromToken: string, toToken: string, amountUsd?: number) {
  trackEvent({
    name: 'swap_completed',
    properties: {
      mode,
      chain,
      from_token: fromToken,
      to_token: toToken,
      ...(amountUsd !== undefined && { value: amountUsd }),
    },
  });
  
  // Track as conversion for revenue attribution
  if (amountUsd !== undefined) {
    trackConversion('swap_revenue', amountUsd * 0.015); // 1.5% commission
  }
}

export function trackBridgeInitiated(fromChain: string, toChain: string, fromToken: string, toToken: string, amountUsd?: number) {
  trackEvent({
    name: 'bridge_initiated',
    properties: {
      from_chain: fromChain,
      to_chain: toChain,
      from_token: fromToken,
      to_token: toToken,
      ...(amountUsd !== undefined && { value: amountUsd }),
    },
  });
}

export function trackBridgeCompleted(fromChain: string, toChain: string, fromToken: string, toToken: string, amountUsd?: number) {
  trackEvent({
    name: 'bridge_completed',
    properties: {
      from_chain: fromChain,
      to_chain: toChain,
      from_token: fromToken,
      to_token: toToken,
      ...(amountUsd !== undefined && { value: amountUsd }),
    },
  });
  
  // Track as conversion for revenue attribution
  if (amountUsd !== undefined) {
    trackConversion('bridge_revenue', amountUsd * 0.015); // 1.5% commission
  }
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

export function trackChainSwitched(fromChain: string, toChain: string) {
  trackEvent({
    name: 'chain_switched',
    properties: {
      from_chain: fromChain,
      to_chain: toChain,
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

export function trackOrderCreated(orderType: 'limit' | 'dca', chain: string, fromToken: string, toToken: string) {
  trackEvent({
    name: 'order_created',
    properties: {
      order_type: orderType,
      chain,
      from_token: fromToken,
      to_token: toToken,
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
  const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
  
  // Skip if no GA ID configured
  if (!GA_MEASUREMENT_ID) {
    if (import.meta.env.DEV) {
      console.log("[Tracking] No GA Measurement ID configured");
    }
    return;
  }

  // Prevent duplicate script loading
  if (document.querySelector('script[src*="googletagmanager"]')) {
    return;
  }

  // Log for development
  if (import.meta.env.DEV) {
    console.log("[Tracking] Analytics initialized with ID:", GA_MEASUREMENT_ID);
  }

  // Load Google Analytics
  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  script.async = true;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function(...args: unknown[]) { window.dataLayer.push(args); };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    anonymize_ip: true,
    cookie_flags: 'SameSite=None;Secure'
  });
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
