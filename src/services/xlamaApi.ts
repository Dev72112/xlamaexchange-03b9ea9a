/**
 * xLama Analytics API Service
 * Interfaces with the xlama-api edge function proxy
 */

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/xlama-api`;

// ============ Type Definitions ============

export interface TokenHolding {
  token_address: string;
  token_symbol: string;
  token_name: string;
  token_logo: string | null;
  chain_id: string;
  chain_name: string;
  balance: string;
  balance_raw: string;
  decimals: number;
  price_usd: number;
  value_usd: number;
  price_change_24h: number;
}

export interface XlamaPortfolio {
  success: boolean;
  wallet: string;
  holdings: TokenHolding[];
  total_value_usd: number;
  chain_breakdown: Array<{ chain: string; value_usd: number }>;
  updated_at: string;
}

export interface TradedPair {
  pair: string;
  from_symbol: string;
  to_symbol: string;
  trade_count: number;
  volume_usd: number;
}

export interface XlamaAnalytics {
  success: boolean;
  wallet: string;
  cached: boolean;
  calculated_at: string;
  analytics: {
    total_trades: number;
    total_swaps: number;
    total_bridges: number;
    total_volume_usd: number;
    total_fees_usd: number;
    realized_pnl_usd: number;
    unrealized_pnl_usd: number;
    total_pnl_usd: number;
    success_rate: number;
    most_traded_pairs: TradedPair[];
    most_used_chains: Array<{ chain: string; count: number }>;
    holdings: TokenHolding[];
    trade_frequency: {
      daily_avg: number;
      weekly_avg: number;
      monthly_avg: number;
    };
    period: string;
  };
}

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  logo: string | null;
  decimals: number;
  amount: string;
  amount_usd: number;
}

export interface XlamaTransaction {
  tx_hash: string;
  wallet_address: string;
  chain_id: string;
  chain_name: string;
  transaction_type: 'swap' | 'bridge' | 'transfer' | 'approval';
  token_in: TokenInfo;
  token_out: TokenInfo;
  value_usd: number;
  gas_used: string;
  gas_price: string;
  gas_usd: number;
  timestamp: string;
  source: 'okx' | 'lifi' | 'jupiter' | 'other';
  status: 'success' | 'pending' | 'failed';
}

export interface TransactionOptions {
  page?: number;
  limit?: number;
  source?: 'okx' | 'lifi' | 'all';
  chain?: string;
  type?: 'swap' | 'bridge' | 'all';
  from_date?: string;
  to_date?: string;
}

export interface CrossChainAnalytics {
  success: boolean;
  total_value_usd: number;
  chain_balances: Record<string, number>;
  cross_chain_volume: number;
  bridge_count: number;
  most_used_chains: Array<{ chain: string; count: number }>;
}

export interface PriceData {
  success: boolean;
  prices: Record<string, {
    price_usd: number;
    price_change_24h: number;
    volume_24h: number;
    market_cap: number;
  }>;
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'down';
  version: string;
  timestamp: string;
}

export interface WalletInfo {
  wallet_address: string;
  label: string;
  sync_enabled: boolean;
  created_at: string;
  updated_at: string;
  last_synced_at: string | null;
  transaction_count: number;
}

export interface WalletStatusResponse {
  success: boolean;
  wallet: WalletInfo | null;
}

export interface SyncResponse {
  success: boolean;
  synced: number;
  new_transactions: number;
}

// ============ API Functions ============

async function fetchFromProxy<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${EDGE_FUNCTION_URL}/${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `API Error: ${response.status}`);
  }

  return response.json();
}

export const xlamaApi = {
  /**
   * Health check endpoint
   */
  health: async (): Promise<HealthCheck> => {
    return fetchFromProxy<HealthCheck>('health');
  },

  /**
   * Get portfolio holdings for a wallet
   */
  getPortfolio: async (wallet: string): Promise<XlamaPortfolio> => {
    return fetchFromProxy<XlamaPortfolio>(`portfolio?wallet=${wallet}`);
  },

  /**
   * Get trading analytics for a wallet
   */
  getAnalytics: async (wallet: string, period: '7d' | '30d' | '90d' | 'all' = '30d'): Promise<XlamaAnalytics> => {
    return fetchFromProxy<XlamaAnalytics>(`trading-analytics?wallet=${wallet}&period=${period}`);
  },

  /**
   * Fetch transaction history
   */
  getTransactions: async (wallet: string, options: TransactionOptions = {}): Promise<{
    success: boolean;
    transactions: XlamaTransaction[];
    total: number;
    page: number;
    limit: number;
  }> => {
    const params = new URLSearchParams();
    params.set('wallet', wallet);
    if (options.page) params.set('page', String(options.page));
    if (options.limit) params.set('limit', String(options.limit));
    if (options.source && options.source !== 'all') params.set('source', options.source);
    if (options.chain) params.set('chain', options.chain);
    if (options.type && options.type !== 'all') params.set('type', options.type);
    if (options.from_date) params.set('from_date', options.from_date);
    if (options.to_date) params.set('to_date', options.to_date);
    
    return fetchFromProxy(`fetch-transactions?${params.toString()}`);
  },

  /**
   * Get cross-chain analytics
   */
  getCrossChainAnalytics: async (wallets?: string[]): Promise<CrossChainAnalytics> => {
    const params = wallets?.length ? `?wallets=${wallets.join(',')}` : '';
    return fetchFromProxy<CrossChainAnalytics>(`cross-chain-analytics${params}`);
  },

  /**
   * Get token prices
   */
  getPrices: async (tokens: string[], chain?: string): Promise<PriceData> => {
    const params = new URLSearchParams();
    params.set('tokens', tokens.join(','));
    if (chain) params.set('chain', chain);
    return fetchFromProxy<PriceData>(`price-oracle?${params.toString()}`);
  },

  /**
   * Register a wallet for tracking
   */
  registerWallet: async (wallet: string, label?: string): Promise<{
    success: boolean;
    wallet: WalletInfo;
  }> => {
    return fetchFromProxy('wallets', {
      method: 'POST',
      body: JSON.stringify({
        wallet_address: wallet,
        label: label || 'xLama Exchange',
        sync_enabled: true,
      }),
    });
  },

  /**
   * Sync transactions for a wallet
   */
  syncTransactions: async (wallet: string, source?: 'okx' | 'lifi' | 'all'): Promise<SyncResponse> => {
    return fetchFromProxy<SyncResponse>('sync-transactions', {
      method: 'POST',
      body: JSON.stringify({
        wallet,
        source: source || 'all',
      }),
    });
  },

  /**
   * List all tracked wallets
   */
  listWallets: async (): Promise<{
    success: boolean;
    wallets: WalletInfo[];
    total: number;
  }> => {
    return fetchFromProxy('wallets');
  },

  /**
   * Get wallet registration status
   */
  getWalletStatus: async (wallet: string): Promise<WalletStatusResponse> => {
    try {
      const response = await fetchFromProxy<{ success: boolean; wallet: WalletInfo }>(`wallets/${wallet}`);
      return { success: true, wallet: response.wallet };
    } catch (error) {
      // Wallet not found is expected for unregistered wallets
      return { success: false, wallet: null };
    }
  },
};

export default xlamaApi;
