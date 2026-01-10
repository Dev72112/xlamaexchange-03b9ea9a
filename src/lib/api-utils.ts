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
  if (message.includes("rate limit") || message.includes("too many requests") || message.includes("50011")) {
    return "Too many requests. Please wait a moment and try again.";
  }

  // Wallet/transaction errors
  if (message.includes("rejected") || message.includes("4001") || message.includes("user denied")) {
    return "Transaction was rejected. Please try again when ready.";
  }

  if (message.includes("insufficient funds") || message.includes("insufficient balance")) {
    return "Insufficient funds for this transaction. Please check your balance.";
  }
  
  // Solana-specific errors (check FIRST before generic ones to prevent mislabeling)
  if (message.includes("solana") || message.includes("spl") || message.includes("sol ") || 
      message.includes("versioned") || message.includes("legacy transaction")) {
    if (message.includes("insufficient")) {
      return "Insufficient SOL or token balance for this transaction.";
    }
    if (message.includes("sign") || message.includes("signature")) {
      return "Failed to sign Solana transaction. Please try again.";
    }
    if (message.includes("provider") || message.includes("wallet")) {
      return "No Solana wallet provider available. Please connect OKX Wallet or Phantom.";
    }
    if (message.includes("rejected") || message.includes("denied") || message.includes("4001")) {
      return "Transaction rejected. Please try again when ready.";
    }
    // Generic Solana error
    return "Solana transaction failed. Please try again.";
  }

  if (message.includes("gas") && message.includes("estimate")) {
    return "Unable to estimate gas. Try increasing slippage or reducing amount.";
  }

  if (message.includes("execution reverted")) {
    return "Transaction would fail on-chain. Try increasing slippage.";
  }

  if (message.includes("slippage") || message.includes("price impact")) {
    return "Price moved too much. Increase slippage tolerance or try a smaller amount.";
  }

  // EVM-specific allowance errors (exclude non-EVM context entirely)
  // This check comes AFTER Solana checks to prevent mislabeling
  if ((message.includes("allowance") || message.includes("approve")) && 
      !message.includes("solana") && !message.includes("spl") && 
      !message.includes("tron") && !message.includes("sui") && !message.includes("ton")) {
    return "Token approval required. Please approve the token first.";
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

  if (message.includes("no route") || message.includes("no path")) {
    return "No swap route found. Try a different token pair or amount.";
  }

  if (message.includes("liquidity")) {
    return "Insufficient liquidity for this swap. Try a smaller amount.";
  }

  // Bridge-specific errors
  if (message.includes("bridge") && message.includes("not supported")) {
    return "This bridge route is not available. Try a different chain pair.";
  }

  // Default: return original message if it's reasonably user-friendly
  if (error.message.length < 100 && !message.includes("error")) {
    return error.message;
  }

  return "Something went wrong. Please try again later.";
};
