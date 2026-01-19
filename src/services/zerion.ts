/**
 * Zerion API Service
 * Provides DeFi positions, PnL tracking, NFT portfolio, and rich transaction history
 */

import { supabase } from '@/integrations/supabase/client';

// Types
export interface ZerionPortfolio {
  totalValue: number;
  absoluteChange1d: number;
  percentChange1d: number;
  absoluteChange30d: number;
  percentChange30d: number;
}

export interface ZerionPosition {
  id: string;
  protocol: string;
  protocolIcon: string | null;
  positionType: 'wallet' | 'deposited' | 'staked' | 'locked' | 'borrowed' | 'claimable';
  name: string;
  value: number;
  quantity: number;
  price: number;
  absoluteChange1d: number;
  percentChange1d: number;
  chainId: string;
  chainName: string;
  tokenAddress: string;
  tokenSymbol: string;
  tokenIcon: string | null;
}

export interface ZerionPnL {
  realizedGain: number;
  unrealizedGain: number;
  totalReturn: number;
  totalFees: number;
  totalInvested: number;
}

export interface ZerionTransaction {
  id: string;
  hash: string;
  chainId: string;
  chainName: string;
  status: 'confirmed' | 'pending' | 'failed';
  type: string;
  operationType: string;
  timestamp: string;
  fee: number;
  nonce: number;
  changes: Array<{
    direction: 'in' | 'out';
    value: number;
    quantity: number;
    tokenSymbol: string;
    tokenIcon: string | null;
  }>;
}

export interface ZerionNFT {
  id: string;
  collection: string;
  collectionIcon: string | null;
  name: string;
  floorPrice: number;
  chainId: string;
  imageUrl: string | null;
  lastSalePrice: number | null;
}

export interface ZerionChartPoint {
  timestamp: number;
  value: number;
}

// Chain ID mapping for Zerion
const ZERION_CHAIN_MAP: Record<string, string> = {
  '1': 'ethereum',
  '137': 'polygon',
  '56': 'binance-smart-chain',
  '42161': 'arbitrum',
  '10': 'optimism',
  '8453': 'base',
  '43114': 'avalanche',
  '324': 'zksync-era',
  '59144': 'linea',
  '534352': 'scroll',
  '250': 'fantom',
  '100': 'gnosis',
};

class ZerionService {
  private async callEdgeFunction(action: string, address?: string, params?: Record<string, string>) {
    const { data, error } = await supabase.functions.invoke('zerion', {
      body: { action, address, params },
    });

    if (error) {
      console.error('[Zerion] Edge function error:', error);
      throw new Error(error.message || 'Failed to call Zerion API');
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data;
  }

  /**
   * Get total portfolio value and changes
   */
  async getPortfolio(address: string): Promise<ZerionPortfolio> {
    const data = await this.callEdgeFunction('wallet-portfolio', address, { currency: 'usd' });
    
    const attributes = data?.data?.attributes || {};
    
    return {
      totalValue: attributes.total?.value || 0,
      absoluteChange1d: attributes.changes?.absolute_1d || 0,
      percentChange1d: attributes.changes?.percent_1d || 0,
      absoluteChange30d: attributes.changes?.absolute_30d || 0,
      percentChange30d: attributes.changes?.percent_30d || 0,
    };
  }

  /**
   * Get all positions (wallet tokens + DeFi positions)
   */
  async getPositions(address: string, options?: { 
    positionType?: 'wallet' | 'deposited' | 'staked' | 'locked' | 'borrowed' | 'claimable';
    hideTrash?: boolean;
  }): Promise<ZerionPosition[]> {
    const params: Record<string, string> = { 
      currency: 'usd',
      sort: '-value',
    };
    
    if (options?.positionType) {
      params.filter_positions = options.positionType;
    }
    if (options?.hideTrash !== false) {
      params.filter_trash = 'only_non_trash';
    }

    const data = await this.callEdgeFunction('wallet-positions', address, params);
    
    return (data?.data || []).map((item: any) => {
      const attrs = item.attributes || {};
      const fungible = attrs.fungible_info || {};
      const implementation = fungible.implementations?.[0] || {};
      
      return {
        id: item.id,
        protocol: attrs.protocol || 'Wallet',
        protocolIcon: attrs.protocol_info?.icon?.url || null,
        positionType: attrs.position_type || 'wallet',
        name: attrs.name || fungible.name || 'Unknown',
        value: attrs.value || 0,
        quantity: attrs.quantity?.float || 0,
        price: attrs.price || 0,
        absoluteChange1d: attrs.changes?.absolute_1d || 0,
        percentChange1d: attrs.changes?.percent_1d || 0,
        chainId: implementation.chain_id || '',
        chainName: ZERION_CHAIN_MAP[implementation.chain_id] || implementation.chain_id,
        tokenAddress: implementation.address || '',
        tokenSymbol: fungible.symbol || '',
        tokenIcon: fungible.icon?.url || null,
      };
    });
  }

  /**
   * Get DeFi-only positions (excluding wallet holdings)
   */
  async getDeFiPositions(address: string): Promise<ZerionPosition[]> {
    const allPositions = await this.getPositions(address);
    return allPositions.filter(p => p.positionType !== 'wallet');
  }

  /**
   * Get P&L data
   */
  async getPnL(address: string): Promise<ZerionPnL> {
    const data = await this.callEdgeFunction('wallet-pnl', address, { currency: 'usd' });
    
    const attrs = data?.data?.attributes || {};
    
    return {
      realizedGain: attrs.realized_gain || 0,
      unrealizedGain: attrs.unrealized_gain || 0,
      totalReturn: attrs.total_return || 0,
      totalFees: attrs.total_fees_paid || 0,
      totalInvested: attrs.total_invested || 0,
    };
  }

  /**
   * Get transaction history
   */
  async getTransactions(address: string, options?: {
    pageSize?: number;
    pageAfter?: string;
    operationTypes?: string[];
    chainIds?: string[];
  }): Promise<{ transactions: ZerionTransaction[]; nextPageCursor?: string }> {
    const params: Record<string, string> = { currency: 'usd' };
    
    if (options?.pageSize) params.page_size = String(options.pageSize);
    if (options?.pageAfter) params.page_after = options.pageAfter;
    if (options?.operationTypes?.length) params.filter_operation_types = options.operationTypes.join(',');
    if (options?.chainIds?.length) params.filter_chain_ids = options.chainIds.join(',');

    const data = await this.callEdgeFunction('wallet-transactions', address, params);
    
    const transactions = (data?.data || []).map((item: any) => {
      const attrs = item.attributes || {};
      
      return {
        id: item.id,
        hash: attrs.hash || '',
        chainId: attrs.chain_id || '',
        chainName: ZERION_CHAIN_MAP[attrs.chain_id] || attrs.chain_id,
        status: attrs.status || 'confirmed',
        type: attrs.operation_type || 'unknown',
        operationType: attrs.operation_type || 'unknown',
        timestamp: attrs.mined_at || '',
        fee: attrs.fee?.value || 0,
        nonce: attrs.nonce || 0,
        changes: (attrs.transfers || []).map((t: any) => ({
          direction: t.direction,
          value: t.value || 0,
          quantity: t.quantity?.float || 0,
          tokenSymbol: t.fungible_info?.symbol || '',
          tokenIcon: t.fungible_info?.icon?.url || null,
        })),
      };
    });

    return {
      transactions,
      nextPageCursor: data?.links?.next ? data.links.next.split('page[after]=')[1]?.split('&')[0] : undefined,
    };
  }

  /**
   * Get NFT portfolio
   */
  async getNFTPortfolio(address: string, options?: { pageSize?: number }): Promise<ZerionNFT[]> {
    const params: Record<string, string> = { currency: 'usd' };
    if (options?.pageSize) params.page_size = String(options.pageSize);

    const data = await this.callEdgeFunction('wallet-nfts', address, params);
    
    return (data?.data || []).map((item: any) => {
      const attrs = item.attributes || {};
      const nft = attrs.nft_info || {};
      const collection = nft.collection || {};
      
      return {
        id: item.id,
        collection: collection.name || 'Unknown Collection',
        collectionIcon: collection.icon?.url || null,
        name: nft.name || 'Unnamed NFT',
        floorPrice: attrs.floor_price || 0,
        chainId: nft.chain_id || '',
        imageUrl: nft.content?.preview?.url || nft.content?.detail?.url || null,
        lastSalePrice: attrs.last_sale_price || null,
      };
    });
  }

  /**
   * Get portfolio value chart
   */
  async getPortfolioChart(address: string, period: 'day' | 'week' | 'month' | 'year' | 'all' = 'month'): Promise<ZerionChartPoint[]> {
    const data = await this.callEdgeFunction('wallet-charts', address, {
      currency: 'usd',
      charts_type: 'portfolio',
      charts_period: period,
    });
    
    const points = data?.data?.attributes?.points || [];
    
    return points.map((point: [number, number]) => ({
      timestamp: point[0] * 1000, // Convert to milliseconds
      value: point[1],
    }));
  }

  /**
   * Get supported chains
   */
  getSupportedChains(): string[] {
    return Object.values(ZERION_CHAIN_MAP);
  }

  /**
   * Check if a chain is supported
   */
  isChainSupported(chainId: string): boolean {
    return chainId in ZERION_CHAIN_MAP;
  }
}

export const zerionService = new ZerionService();
