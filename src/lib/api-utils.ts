/**
 * Utility functions for API calls with retry logic and error handling
 */

export interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  backoffMultiplier?: number;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
};

/**
 * Sleep for a specified duration
 */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Check if an error is a transient network error that should be retried
 */
export const isTransientError = (error: unknown): boolean => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("failed to send") ||
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("fetch") ||
      message.includes("connection") ||
      message.includes("econnreset") ||
      message.includes("socket")
    );
  }
  return false;
};

/**
 * Execute a function with retry logic for transient errors
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries, delayMs, backoffMultiplier } = {
    ...DEFAULT_RETRY_OPTIONS,
    ...options,
  };

  let lastError: Error | undefined;
  let currentDelay = delayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Only retry transient errors
      if (!isTransientError(error) || attempt === maxRetries) {
        throw lastError;
      }

      // Wait before retrying with exponential backoff
      await sleep(currentDelay);
      currentDelay *= backoffMultiplier;
    }
  }

  throw lastError;
}

/**
 * Convert technical error messages to user-friendly messages
 */
export const getUserFriendlyErrorMessage = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return "An unexpected error occurred. Please try again.";
  }

  const message = error.message.toLowerCase();

  // Network errors
  if (
    message.includes("failed to send") ||
    message.includes("network") ||
    message.includes("fetch")
  ) {
    return "Unable to connect to the server. Please check your internet connection and try again.";
  }

  // Timeout errors
  if (message.includes("timeout")) {
    return "The request took too long. Please try again.";
  }

  // Rate limiting
  if (message.includes("rate limit") || message.includes("too many requests")) {
    return "Too many requests. Please wait a moment and try again.";
  }

  // Specific exchange errors
  if (message.includes("pair_is_inactive")) {
    return "This trading pair is currently unavailable. Please try a different pair.";
  }

  if (message.includes("deposit_too_small")) {
    return "The amount is too small for this exchange. Please enter a larger amount.";
  }

  if (message.includes("fixed_rate_not_enabled")) {
    return "Fixed rate is not available for this pair. Please use floating rate.";
  }

  // Default: return original message if it's reasonably user-friendly
  if (error.message.length < 100 && !message.includes("error")) {
    return error.message;
  }

  return "Something went wrong. Please try again later.";
};
