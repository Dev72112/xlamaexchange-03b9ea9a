import { getCookiePreferences, hasConsented } from "@/hooks/useCookieConsent";

// Analytics tracking interface
interface AnalyticsEvent {
  name: string;
  properties?: Record<string, string | number | boolean>;
}

// Track page views (only if analytics cookies are enabled)
export function trackPageView(path: string) {
  if (!hasConsented() || !getCookiePreferences().analytics) {
    return;
  }

  // Log for development - replace with actual analytics provider
  if (import.meta.env.DEV) {
    console.log("[Analytics] Page view:", path);
  }

  // Example: Google Analytics integration
  // if (window.gtag) {
  //   window.gtag('config', 'GA_MEASUREMENT_ID', { page_path: path });
  // }
}

// Track custom events (only if analytics cookies are enabled)
export function trackEvent(event: AnalyticsEvent) {
  if (!hasConsented() || !getCookiePreferences().analytics) {
    return;
  }

  // Log for development - replace with actual analytics provider
  if (import.meta.env.DEV) {
    console.log("[Analytics] Event:", event.name, event.properties);
  }

  // Example: Google Analytics integration
  // if (window.gtag) {
  //   window.gtag('event', event.name, event.properties);
  // }
}

// Track marketing/conversion events (only if marketing cookies are enabled)
export function trackConversion(conversionId: string, value?: number) {
  if (!hasConsented() || !getCookiePreferences().marketing) {
    return;
  }

  // Log for development - replace with actual marketing pixel
  if (import.meta.env.DEV) {
    console.log("[Marketing] Conversion:", conversionId, value);
  }

  // Example: Facebook Pixel integration
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
  // Log for development
  if (import.meta.env.DEV) {
    console.log("[Tracking] Analytics initialized");
  }

  // Example: Load Google Analytics script
  // const script = document.createElement('script');
  // script.src = `https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID`;
  // script.async = true;
  // document.head.appendChild(script);
  //
  // window.dataLayer = window.dataLayer || [];
  // window.gtag = function() { dataLayer.push(arguments); };
  // window.gtag('js', new Date());
  // window.gtag('config', 'GA_MEASUREMENT_ID');
}

// Initialize marketing scripts
function initializeMarketing() {
  // Log for development
  if (import.meta.env.DEV) {
    console.log("[Tracking] Marketing initialized");
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
