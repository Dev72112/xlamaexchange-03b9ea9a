/**
 * Hyperliquid Service
 * 
 * Handles perpetual trading via Hyperliquid DEX using direct API calls.
 * Supports EVM (Arbitrum) wallets.
 */

const HYPERLIQUID_API = 'https://api.hyperliquid.xyz';

// ============ TYPE DEFINITIONS ============

export interface HyperliquidPosition {
  coin: string;
  szi: string;
  leverage: number;
  entryPx: string;
  positionValue: string;
  unrealizedPnl: string;
  returnOnEquity: string;
  liquidationPx: string | null;
  marginUsed: string;
}

export interface HyperliquidAccountState {
  marginSummary: {
    accountValue: string;
    totalMarginUsed: string;
    totalNtlPos: string;
    totalRawUsd: string;
  };
  positions: HyperliquidPosition[];
}

export interface HyperliquidAsset {
  coin: string;
  szDecimals: number;
  maxLeverage: number;
}

export interface HyperliquidMarketData {
  coin: string;
  midPx: string;
  markPx: string;
}

// ============ SERVICE CLASS ============

class HyperliquidService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = HYPERLIQUID_API;
    console.log('[Hyperliquid] Service initialized');
  }

  private async post(type: string, payload: any) {
    const response = await fetch(`${this.baseUrl}/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, ...payload }),
    });
    if (!response.ok) throw new Error(`Hyperliquid API error: ${response.status}`);
    return response.json();
  }

  async getAssets(): Promise<HyperliquidAsset[]> {
    try {
      const data = await this.post('meta', {});
      return data?.universe || [];
    } catch (error) {
      console.error('[Hyperliquid] Failed to fetch assets:', error);
      return [];
    }
  }

  async getAllMarkets(): Promise<HyperliquidMarketData[]> {
    try {
      const data = await this.post('allMids', {});
      return Object.entries(data || {}).map(([coin, midPx]) => ({
        coin,
        midPx: String(midPx),
        markPx: String(midPx),
      }));
    } catch (error) {
      console.error('[Hyperliquid] Failed to fetch markets:', error);
      return [];
    }
  }

  async getAccountState(address: string): Promise<HyperliquidAccountState | null> {
    try {
      const data = await this.post('clearinghouseState', { user: address });
      if (!data) return null;
      return {
        marginSummary: {
          accountValue: data.marginSummary?.accountValue || '0',
          totalMarginUsed: data.marginSummary?.totalMarginUsed || '0',
          totalNtlPos: data.marginSummary?.totalNtlPos || '0',
          totalRawUsd: data.marginSummary?.totalRawUsd || '0',
        },
        positions: (data.assetPositions || []).map((pos: any) => ({
          coin: pos.position?.coin || '',
          szi: pos.position?.szi || '0',
          leverage: pos.position?.leverage?.value || 1,
          entryPx: pos.position?.entryPx || '0',
          positionValue: pos.position?.positionValue || '0',
          unrealizedPnl: pos.position?.unrealizedPnl || '0',
          returnOnEquity: pos.position?.returnOnEquity || '0',
          liquidationPx: pos.position?.liquidationPx,
          marginUsed: pos.position?.marginUsed || '0',
        })),
      };
    } catch (error) {
      console.error('[Hyperliquid] Failed to fetch account:', error);
      return null;
    }
  }

  async getOpenOrders(address: string): Promise<any[]> {
    try {
      return await this.post('openOrders', { user: address }) || [];
    } catch (error) {
      console.error('[Hyperliquid] Failed to fetch orders:', error);
      return [];
    }
  }

  async getTradeHistory(address: string): Promise<any[]> {
    try {
      return await this.post('userFills', { user: address }) || [];
    } catch (error) {
      console.error('[Hyperliquid] Failed to fetch trades:', error);
      return [];
    }
  }
}

export const hyperliquidService = new HyperliquidService();
