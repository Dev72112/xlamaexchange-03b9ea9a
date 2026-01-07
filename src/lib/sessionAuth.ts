/**
 * Session-Based Authentication
 * Sign once per session, cache authorization for subsequent operations
 * Reduces signing prompts from every action to once per hour
 */

import { ChainType } from '@/contexts/MultiWalletContext';
import { 
  signEvmMessage, 
  signSolanaMessage, 
  signTronMessage, 
  signSuiMessage,
  signTonMessage,
  generateNonce 
} from './requestSigning';

export interface SessionAuth {
  walletAddress: string;
  signature: string;
  signedAt: number;
  expiresAt: number;
  chainType: ChainType;
  nonce: string;
}

export interface SigningProviders {
  solanaProvider?: any;
  tronWeb?: any;
  signPersonalMessage?: (input: { message: Uint8Array }) => Promise<{ signature: string }>;
  tonConnectUI?: any;
  walletAddress?: string;
}

// Session validity duration - 1 hour
const AUTH_EXPIRY = 60 * 60 * 1000;

// In-memory cache for session auth (persists across component remounts but not page reloads)
const authCache = new Map<string, SessionAuth>();

// LocalStorage key for persistent session auth
const SESSION_AUTH_KEY = 'xlama_session_auth';

/**
 * Generate a session authorization message
 */
function generateSessionMessage(walletAddress: string, chainType: ChainType, nonce: string, timestamp: number): string {
  return `Sign this message to authorize your xLama session.

Wallet: ${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}
Chain: ${chainType.toUpperCase()}
Session valid for: 1 hour

Timestamp: ${timestamp}
Nonce: ${nonce}

This is a one-time signature for this session. You won't need to sign again for subsequent operations.`;
}

/**
 * Get cached session auth from memory or localStorage
 */
function getCachedAuth(walletAddress: string, chainType: ChainType): SessionAuth | null {
  const key = `${walletAddress.toLowerCase()}_${chainType}`;
  
  // Check in-memory cache first
  const memCached = authCache.get(key);
  if (memCached && Date.now() < memCached.expiresAt) {
    return memCached;
  }
  
  // Check localStorage
  try {
    const stored = localStorage.getItem(SESSION_AUTH_KEY);
    if (stored) {
      const allAuth: Record<string, SessionAuth> = JSON.parse(stored);
      const auth = allAuth[key];
      if (auth && Date.now() < auth.expiresAt) {
        // Restore to memory cache
        authCache.set(key, auth);
        return auth;
      }
    }
  } catch (error) {
    console.warn('[SessionAuth] Failed to read from localStorage:', error);
  }
  
  return null;
}

/**
 * Save session auth to memory and localStorage
 */
function saveAuth(auth: SessionAuth): void {
  const key = `${auth.walletAddress.toLowerCase()}_${auth.chainType}`;
  
  // Save to memory
  authCache.set(key, auth);
  
  // Save to localStorage for persistence across page reloads
  try {
    const stored = localStorage.getItem(SESSION_AUTH_KEY);
    const allAuth: Record<string, SessionAuth> = stored ? JSON.parse(stored) : {};
    allAuth[key] = auth;
    localStorage.setItem(SESSION_AUTH_KEY, JSON.stringify(allAuth));
  } catch (error) {
    console.warn('[SessionAuth] Failed to save to localStorage:', error);
  }
}

/**
 * Clear session auth for a specific wallet/chain
 */
export function clearSessionAuth(walletAddress: string, chainType: ChainType): void {
  const key = `${walletAddress.toLowerCase()}_${chainType}`;
  authCache.delete(key);
  
  try {
    const stored = localStorage.getItem(SESSION_AUTH_KEY);
    if (stored) {
      const allAuth: Record<string, SessionAuth> = JSON.parse(stored);
      delete allAuth[key];
      localStorage.setItem(SESSION_AUTH_KEY, JSON.stringify(allAuth));
    }
  } catch (error) {
    console.warn('[SessionAuth] Failed to clear from localStorage:', error);
  }
}

/**
 * Clear all session auth (on full disconnect)
 */
export function clearAllSessionAuth(): void {
  authCache.clear();
  try {
    localStorage.removeItem(SESSION_AUTH_KEY);
  } catch (error) {
    console.warn('[SessionAuth] Failed to clear all from localStorage:', error);
  }
}

/**
 * Check if we have a valid session auth without triggering signing
 */
export function hasValidSessionAuth(walletAddress: string, chainType: ChainType): boolean {
  const auth = getCachedAuth(walletAddress, chainType);
  return auth !== null;
}

/**
 * Get session auth - returns cached if valid, otherwise requests signature
 */
export async function getOrCreateSessionAuth(
  walletAddress: string,
  chainType: ChainType,
  providers: SigningProviders
): Promise<SessionAuth | null> {
  // Check for valid cached auth
  const cached = getCachedAuth(walletAddress, chainType);
  if (cached) {
    console.log('[SessionAuth] Using cached session auth');
    return cached;
  }
  
  // Need to request a new signature
  console.log('[SessionAuth] Requesting new session signature');
  
  const timestamp = Date.now();
  const nonce = generateNonce();
  const message = generateSessionMessage(walletAddress, chainType, nonce, timestamp);
  
  let signature: string | null = null;
  
  try {
    switch (chainType) {
      case 'solana':
        if (providers.solanaProvider) {
          signature = await signSolanaMessage(message, providers.solanaProvider);
        }
        break;
      case 'tron':
        if (providers.tronWeb) {
          signature = await signTronMessage(message, providers.tronWeb);
        }
        break;
      case 'sui':
        if (providers.signPersonalMessage) {
          signature = await signSuiMessage(message, providers.signPersonalMessage);
        }
        break;
      case 'ton':
        // TON uses proof-based auth, which is already cached
        if (providers.tonConnectUI && providers.walletAddress) {
          const result = await signTonMessage(message, timestamp, providers.tonConnectUI, providers.walletAddress);
          signature = result?.signature || null;
        }
        break;
      default:
        signature = await signEvmMessage(message);
    }
  } catch (error) {
    console.error('[SessionAuth] Signing failed:', error);
    return null;
  }
  
  if (!signature) {
    return null;
  }
  
  const auth: SessionAuth = {
    walletAddress,
    signature,
    signedAt: timestamp,
    expiresAt: timestamp + AUTH_EXPIRY,
    chainType,
    nonce,
  };
  
  saveAuth(auth);
  console.log('[SessionAuth] Session auth created, valid for 1 hour');
  
  return auth;
}

/**
 * Get remaining session time in milliseconds
 */
export function getSessionTimeRemaining(walletAddress: string, chainType: ChainType): number {
  const auth = getCachedAuth(walletAddress, chainType);
  if (!auth) return 0;
  return Math.max(0, auth.expiresAt - Date.now());
}
