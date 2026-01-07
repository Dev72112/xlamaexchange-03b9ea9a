/**
 * Unified Wallet Session Manager
 * Persists connection state across page reloads for all chain types
 */

// Import ChainType locally to avoid circular dependency
type ChainType = 'evm' | 'solana' | 'sui' | 'tron' | 'ton';

export interface WalletSession {
  evmConnected: boolean;
  solanaConnected: boolean;
  suiConnected: boolean;
  tronConnected: boolean;
  tonConnected: boolean;
  lastConnected: number;
  activeChainType: ChainType;
  activeChainIndex?: string;
}

const SESSION_KEY = 'xlama_wallet_session';
const SESSION_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Save wallet session to localStorage
 */
export function saveWalletSession(session: Partial<WalletSession>): void {
  try {
    const existing = getWalletSession();
    const updated: WalletSession = {
      evmConnected: session.evmConnected ?? existing?.evmConnected ?? false,
      solanaConnected: session.solanaConnected ?? existing?.solanaConnected ?? false,
      suiConnected: session.suiConnected ?? existing?.suiConnected ?? false,
      tronConnected: session.tronConnected ?? existing?.tronConnected ?? false,
      tonConnected: session.tonConnected ?? existing?.tonConnected ?? false,
      lastConnected: Date.now(),
      activeChainType: session.activeChainType ?? existing?.activeChainType ?? 'evm',
      activeChainIndex: session.activeChainIndex ?? existing?.activeChainIndex,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('[WalletSession] Failed to save session:', error);
  }
}

/**
 * Get wallet session from localStorage
 */
export function getWalletSession(): WalletSession | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as WalletSession;
  } catch (error) {
    console.warn('[WalletSession] Failed to get session:', error);
    return null;
  }
}

/**
 * Clear wallet session from localStorage
 */
export function clearWalletSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.warn('[WalletSession] Failed to clear session:', error);
  }
}

/**
 * Check if the stored session is still valid (not expired)
 */
export function isSessionValid(): boolean {
  const session = getWalletSession();
  if (!session) return false;
  
  const age = Date.now() - session.lastConnected;
  return age < SESSION_EXPIRY;
}

/**
 * Update active chain in session without affecting connection states
 */
export function updateActiveChain(chainType: ChainType, chainIndex?: string): void {
  saveWalletSession({ activeChainType: chainType, activeChainIndex: chainIndex });
}

/**
 * Mark a specific chain type as connected/disconnected
 */
export function updateChainConnection(chainType: ChainType, connected: boolean): void {
  const update: Partial<WalletSession> = {};
  
  switch (chainType) {
    case 'evm':
      update.evmConnected = connected;
      break;
    case 'solana':
      update.solanaConnected = connected;
      break;
    case 'sui':
      update.suiConnected = connected;
      break;
    case 'tron':
      update.tronConnected = connected;
      break;
    case 'ton':
      update.tonConnected = connected;
      break;
  }
  
  saveWalletSession(update);
}
