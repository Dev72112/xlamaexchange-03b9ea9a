/**
 * Token Amount Utilities
 * 
 * Safe BigInt arithmetic for cryptocurrency amounts to prevent precision loss
 * when dealing with token amounts that can have many decimals.
 */

/**
 * Parse a human-readable token amount to its smallest unit (e.g., wei, lamports)
 */
export function parseTokenAmount(amount: string, decimals: number): bigint {
  if (!amount || isNaN(parseFloat(amount))) return 0n;
  
  const [whole, fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  const combined = whole + paddedFraction;
  
  // Remove leading zeros but keep at least "0"
  const cleaned = combined.replace(/^0+/, '') || '0';
  return BigInt(cleaned);
}

/**
 * Format a smallest-unit amount to human-readable string
 */
export function formatTokenAmount(amount: bigint | string, decimals: number): string {
  const amountBig = typeof amount === 'string' ? BigInt(amount) : amount;
  const divisor = 10n ** BigInt(decimals);
  
  const whole = amountBig / divisor;
  const remainder = amountBig % divisor;
  
  if (remainder === 0n) {
    return whole.toString();
  }
  
  // Pad the remainder with leading zeros if needed
  const remainderStr = remainder.toString().padStart(decimals, '0');
  // Remove trailing zeros
  const trimmed = remainderStr.replace(/0+$/, '');
  
  return `${whole}.${trimmed}`;
}

/**
 * Calculate minimum received amount after slippage
 * @param amount Amount in smallest unit as string
 * @param slippageBps Slippage in basis points (e.g., 50 = 0.5%)
 */
export function calculateMinReceived(amount: string, slippageBps: number): string {
  if (!amount || amount === '0') return '0';
  
  const amountBigInt = BigInt(amount);
  const slippageFactor = 10000n - BigInt(Math.floor(slippageBps));
  
  return ((amountBigInt * slippageFactor) / 10000n).toString();
}

/**
 * Calculate slippage amount
 * @param amount Amount in smallest unit as string
 * @param slippageBps Slippage in basis points (e.g., 50 = 0.5%)
 */
export function calculateSlippageAmount(amount: string, slippageBps: number): string {
  if (!amount || amount === '0') return '0';
  
  const amountBigInt = BigInt(amount);
  return ((amountBigInt * BigInt(Math.floor(slippageBps))) / 10000n).toString();
}

/**
 * Safely multiply two amounts and divide by a third (for price calculations)
 * result = (a * b) / c
 */
export function mulDiv(a: string | bigint, b: string | bigint, c: string | bigint): string {
  const aBig = typeof a === 'string' ? BigInt(a) : a;
  const bBig = typeof b === 'string' ? BigInt(b) : b;
  const cBig = typeof c === 'string' ? BigInt(c) : c;
  
  if (cBig === 0n) return '0';
  
  return ((aBig * bBig) / cBig).toString();
}

/**
 * Compare two token amounts
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
export function compareAmounts(a: string, b: string): -1 | 0 | 1 {
  const aBig = BigInt(a || '0');
  const bBig = BigInt(b || '0');
  
  if (aBig < bBig) return -1;
  if (aBig > bBig) return 1;
  return 0;
}

/**
 * Add two token amounts
 */
export function addAmounts(a: string, b: string): string {
  return (BigInt(a || '0') + BigInt(b || '0')).toString();
}

/**
 * Subtract two token amounts
 */
export function subtractAmounts(a: string, b: string): string {
  const result = BigInt(a || '0') - BigInt(b || '0');
  return result < 0n ? '0' : result.toString();
}

/**
 * Check if amount is zero or empty
 */
export function isZeroAmount(amount: string | undefined | null): boolean {
  if (!amount) return true;
  try {
    return BigInt(amount) === 0n;
  } catch {
    return true;
  }
}

/**
 * Safe percentage calculation
 * @param amount Amount in smallest unit
 * @param percentage Percentage as a number (e.g., 0.25 for 0.25%)
 */
export function calculatePercentage(amount: string, percentage: number): string {
  if (!amount || amount === '0' || percentage === 0) return '0';
  
  // Use basis points internally for precision (1% = 100 bps)
  const bps = Math.floor(percentage * 100);
  const amountBigInt = BigInt(amount);
  
  return ((amountBigInt * BigInt(bps)) / 10000n).toString();
}
