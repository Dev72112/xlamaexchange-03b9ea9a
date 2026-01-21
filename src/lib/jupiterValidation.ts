/**
 * Jupiter API Payload Validation
 * 
 * Client-side Zod schemas to validate payloads BEFORE sending to Jupiter APIs.
 * This prevents "invalid_type: expected string, received undefined" errors.
 */

import { z } from 'zod';

// Base58 Solana address validation
const solanaAddressSchema = z.string()
  .min(32, 'Address too short')
  .max(44, 'Address too long')
  .regex(/^[1-9A-HJ-NP-Za-km-z]+$/, 'Invalid Solana address format');

// String amount that represents a positive integer (in smallest units)
const amountStringSchema = z.string()
  .regex(/^\d+$/, 'Amount must be a numeric string')
  .refine(val => BigInt(val) > 0n, 'Amount must be greater than zero');

// Optional amount that can be empty/zero
const optionalAmountSchema = z.string()
  .regex(/^\d*$/, 'Amount must be numeric')
  .optional();

/**
 * Jupiter Limit Order creation payload schema
 */
export const createLimitOrderSchema = z.object({
  inputMint: solanaAddressSchema,
  outputMint: solanaAddressSchema,
  maker: solanaAddressSchema,
  makingAmount: amountStringSchema,
  takingAmount: amountStringSchema,
  expiredAt: z.number().int().positive().optional(),
  feeAccount: solanaAddressSchema.optional(),
  computeUnitPrice: z.union([z.string(), z.literal('auto')]).optional(),
});

export type CreateLimitOrderPayload = z.infer<typeof createLimitOrderSchema>;

/**
 * Jupiter DCA order creation payload schema
 */
export const createDCAOrderSchema = z.object({
  user: solanaAddressSchema,
  inputMint: solanaAddressSchema,
  outputMint: solanaAddressSchema,
  inAmount: amountStringSchema,
  numberOfOrders: z.number().int().positive().min(2, 'Need at least 2 orders for DCA'),
  interval: z.number().int().positive().min(60, 'Minimum 60 seconds between orders'),
  minPrice: z.number().positive().optional().nullable(),
  maxPrice: z.number().positive().optional().nullable(),
  startAt: z.number().int().positive().optional().nullable(),
});

export type CreateDCAOrderPayload = z.infer<typeof createDCAOrderSchema>;

/**
 * Jupiter swap order schema
 */
export const createSwapOrderSchema = z.object({
  inputMint: solanaAddressSchema,
  outputMint: solanaAddressSchema,
  amount: amountStringSchema,
  taker: solanaAddressSchema,
  slippageBps: z.number().int().min(0).max(10000).optional(),
});

export type CreateSwapOrderPayload = z.infer<typeof createSwapOrderSchema>;

/**
 * Validate limit order payload and return detailed errors
 */
export function validateLimitOrderPayload(payload: unknown): {
  success: boolean;
  data?: CreateLimitOrderPayload;
  errors?: string[];
} {
  const result = createLimitOrderSchema.safeParse(payload);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors = result.error.issues.map(issue => {
    const path = issue.path.join('.');
    return `${path}: ${issue.message} (received ${typeof (payload as any)?.[issue.path[0]]})`;
  });
  
  return { success: false, errors };
}

/**
 * Validate DCA order payload and return detailed errors
 */
export function validateDCAOrderPayload(payload: unknown): {
  success: boolean;
  data?: CreateDCAOrderPayload;
  errors?: string[];
} {
  const result = createDCAOrderSchema.safeParse(payload);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors = result.error.issues.map(issue => {
    const path = issue.path.join('.');
    return `${path}: ${issue.message} (received ${typeof (payload as any)?.[issue.path[0]]})`;
  });
  
  return { success: false, errors };
}

/**
 * Build a validated limit order payload with explicit type coercion
 * This ensures all fields are strings/numbers as expected by Jupiter API
 */
export function buildLimitOrderPayload(params: {
  inputMint: unknown;
  outputMint: unknown;
  maker: unknown;
  makingAmount: unknown;
  takingAmount: unknown;
  expiredAt?: unknown;
}): CreateLimitOrderPayload {
  // Explicit coercion to prevent undefined
  const payload = {
    inputMint: String(params.inputMint ?? ''),
    outputMint: String(params.outputMint ?? ''),
    maker: String(params.maker ?? ''),
    makingAmount: String(params.makingAmount ?? '0'),
    takingAmount: String(params.takingAmount ?? '0'),
    expiredAt: params.expiredAt ? Number(params.expiredAt) : undefined,
  };
  
  // Validate and throw if invalid
  const result = createLimitOrderSchema.safeParse(payload);
  if (!result.success) {
    const errorDetails = result.error.issues
      .map(i => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid limit order payload: ${errorDetails}`);
  }
  
  return result.data;
}

/**
 * Build a validated DCA order payload with explicit type coercion
 */
export function buildDCAOrderPayload(params: {
  user: unknown;
  inputMint: unknown;
  outputMint: unknown;
  inAmount: unknown;
  numberOfOrders: unknown;
  interval: unknown;
  minPrice?: unknown;
  maxPrice?: unknown;
  startAt?: unknown;
}): CreateDCAOrderPayload {
  // Explicit coercion to prevent undefined
  const payload = {
    user: String(params.user ?? ''),
    inputMint: String(params.inputMint ?? ''),
    outputMint: String(params.outputMint ?? ''),
    inAmount: String(params.inAmount ?? '0'),
    numberOfOrders: Number(params.numberOfOrders ?? 0),
    interval: Number(params.interval ?? 0),
    minPrice: params.minPrice ? Number(params.minPrice) : null,
    maxPrice: params.maxPrice ? Number(params.maxPrice) : null,
    startAt: params.startAt ? Number(params.startAt) : null,
  };
  
  // Validate and throw if invalid
  const result = createDCAOrderSchema.safeParse(payload);
  if (!result.success) {
    const errorDetails = result.error.issues
      .map(i => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid DCA order payload: ${errorDetails}`);
  }
  
  return result.data;
}

/**
 * Safe JSON serialization for logging (handles circular refs, BigInt, etc.)
 */
export function safeJsonStringify(obj: unknown, maxLength = 2000): string {
  try {
    const seen = new WeakSet();
    const result = JSON.stringify(obj, (key, value) => {
      // Handle BigInt
      if (typeof value === 'bigint') {
        return value.toString();
      }
      // Handle circular references
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      // Handle Error objects
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack?.split('\n').slice(0, 3).join('\n'),
        };
      }
      return value;
    }, 2);
    
    // Truncate if too long
    if (result.length > maxLength) {
      return result.slice(0, maxLength) + '... [truncated]';
    }
    return result;
  } catch (e) {
    return `[Serialization failed: ${e instanceof Error ? e.message : 'unknown'}]`;
  }
}
