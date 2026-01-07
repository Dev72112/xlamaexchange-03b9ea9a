/**
 * Error Tracking Utility
 * Captures and logs client-side errors with context
 */

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  walletAddress?: string;
  chainId?: string;
  extra?: Record<string, unknown>;
}

interface TrackedError {
  message: string;
  stack?: string;
  context: ErrorContext;
  timestamp: string;
  url: string;
  userAgent: string;
}

// In-memory error log (last 50 errors)
const errorLog: TrackedError[] = [];
const MAX_ERRORS = 50;

/**
 * Track an error with context
 */
export function trackError(
  error: Error | string,
  context: ErrorContext = {}
): void {
  const errorObj = typeof error === 'string' ? new Error(error) : error;
  
  const trackedError: TrackedError = {
    message: errorObj.message,
    stack: errorObj.stack,
    context,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  };
  
  // Add to log
  errorLog.push(trackedError);
  if (errorLog.length > MAX_ERRORS) {
    errorLog.shift();
  }
  
  // Log to console in development
  if (import.meta.env.DEV) {
    console.error('[ErrorTracker]', trackedError);
  }
}

/**
 * Track a failed API call
 */
export function trackApiError(
  endpoint: string,
  status: number,
  message: string,
  context: ErrorContext = {}
): void {
  trackError(`API Error: ${endpoint} returned ${status} - ${message}`, {
    ...context,
    action: 'api_call',
    extra: { endpoint, status, ...context.extra },
  });
}

/**
 * Track a wallet error
 */
export function trackWalletError(
  action: string,
  error: Error | string,
  walletAddress?: string
): void {
  trackError(error, {
    action,
    walletAddress,
    component: 'wallet',
  });
}

/**
 * Track a transaction error
 */
export function trackTxError(
  txType: 'swap' | 'bridge' | 'approve',
  error: Error | string,
  context: { chainId?: string; walletAddress?: string; txHash?: string } = {}
): void {
  trackError(error, {
    action: `${txType}_failed`,
    chainId: context.chainId,
    walletAddress: context.walletAddress,
    extra: { txHash: context.txHash },
  });
}

/**
 * Get all tracked errors
 */
export function getErrors(): TrackedError[] {
  return [...errorLog];
}

/**
 * Clear error log
 */
export function clearErrors(): void {
  errorLog.length = 0;
}

/**
 * Setup global error handlers
 */
export function initErrorTracking(): void {
  if (typeof window === 'undefined') return;
  
  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    trackError(event.reason instanceof Error ? event.reason : String(event.reason), {
      action: 'unhandled_promise_rejection',
    });
  });
  
  // Global errors
  window.addEventListener('error', (event) => {
    trackError(event.error || event.message, {
      action: 'global_error',
      extra: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });
  
  console.log('[ErrorTracker] Initialized');
}
