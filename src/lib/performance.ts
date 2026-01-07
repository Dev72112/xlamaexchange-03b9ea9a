/**
 * Performance Monitoring Utilities
 * Tracks Core Web Vitals and custom metrics
 */

// Web Vitals types
interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
}

// Thresholds for Core Web Vitals (based on Google's recommendations)
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint
  FID: { good: 100, poor: 300 },   // First Input Delay
  CLS: { good: 0.1, poor: 0.25 },  // Cumulative Layout Shift
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte
  INP: { good: 200, poor: 500 },   // Interaction to Next Paint
};

function getRating(name: keyof typeof THRESHOLDS, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name];
  if (!threshold) return 'good';
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

// Track metrics in memory (for debugging)
const metricsLog: PerformanceMetric[] = [];

/**
 * Log a performance metric
 */
export function logMetric(name: string, value: number, delta = 0): void {
  const rating = getRating(name as keyof typeof THRESHOLDS, value);
  const metric: PerformanceMetric = { name, value, rating, delta };
  metricsLog.push(metric);
  
  // Log to console in development
  if (import.meta.env.DEV) {
    const color = rating === 'good' ? '🟢' : rating === 'needs-improvement' ? '🟡' : '🔴';
    console.log(`${color} [Perf] ${name}: ${value.toFixed(2)}ms (${rating})`);
  }
}

/**
 * Measure a performance operation
 */
export function measurePerformance<T>(
  name: string,
  operation: () => T
): T {
  const start = performance.now();
  const result = operation();
  const duration = performance.now() - start;
  logMetric(name, duration);
  return result;
}

/**
 * Measure an async operation
 */
export async function measureAsync<T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  const result = await operation();
  const duration = performance.now() - start;
  logMetric(name, duration);
  return result;
}

/**
 * Get all logged metrics
 */
export function getMetrics(): PerformanceMetric[] {
  return [...metricsLog];
}

/**
 * Initialize Web Vitals tracking
 */
export function initWebVitals(): void {
  if (typeof window === 'undefined') return;
  
  // Track LCP (Largest Contentful Paint)
  const lcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
    if (lastEntry) {
      logMetric('LCP', lastEntry.startTime);
    }
  });
  
  try {
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    // Browser doesn't support LCP observation
  }
  
  // Track FCP (First Contentful Paint)
  const fcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const fcpEntry = entries.find((e) => e.name === 'first-contentful-paint');
    if (fcpEntry) {
      logMetric('FCP', fcpEntry.startTime);
    }
  });
  
  try {
    fcpObserver.observe({ type: 'paint', buffered: true });
  } catch {
    // Browser doesn't support paint observation
  }
  
  // Track CLS (Cumulative Layout Shift)
  let clsValue = 0;
  const clsObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const layoutShift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
      if (!layoutShift.hadRecentInput) {
        clsValue += layoutShift.value;
      }
    }
    logMetric('CLS', clsValue * 1000); // Convert to ms-like scale for consistency
  });
  
  try {
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch {
    // Browser doesn't support layout-shift observation
  }
  
  // Track navigation timing
  window.addEventListener('load', () => {
    setTimeout(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        logMetric('TTFB', navigation.responseStart);
        logMetric('DOMContentLoaded', navigation.domContentLoadedEventEnd);
        logMetric('Load', navigation.loadEventEnd);
      }
    }, 0);
  });
}

/**
 * Create a performance marker
 */
export function mark(name: string): void {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(name);
  }
}

/**
 * Measure between two markers
 */
export function measureMark(name: string, startMark: string, endMark: string): void {
  if (typeof performance !== 'undefined' && performance.measure) {
    try {
      performance.measure(name, startMark, endMark);
      const entries = performance.getEntriesByName(name, 'measure');
      if (entries.length > 0) {
        logMetric(name, entries[0].duration);
      }
    } catch {
      // Marks may not exist
    }
  }
}
