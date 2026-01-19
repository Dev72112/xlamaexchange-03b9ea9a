/**
 * Hyperliquid Service
 * 
 * Handles perpetual trading via Hyperliquid DEX using direct API calls.
 * Supports EVM (Arbitrum) wallets with testnet toggle.
 */

const MAINNET_API = 'https://api.hyperliquid.xyz';
const TESTNET_API = 'https://api.hyperliquid-testnet.xyz';

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

export interface HyperliquidOrderbookLevel {
  price: string;
  size: string;
  numOrders: number;
}

export interface HyperliquidOrderbook {
  coin: string;
  bids: HyperliquidOrderbookLevel[];
  asks: HyperliquidOrderbookLevel[];
  timestamp: number;
}

export interface HyperliquidSpotBalance {
  coin: string;
  hold: string;
  total: string;
}

export interface HyperliquidFill {
  time: number;
  coin: string;
  side: 'B' | 'S';
  px: string;
  sz: string;
  startPosition: string;
  closedPnl: string;
  hash: string;
  fee: string;
  feeToken: string;
  oid: number;
  crossed: boolean;
  dir: string;
}

// ============ SERVICE CLASS ============

class HyperliquidService {
  private baseUrl: string;
  private isTestnet: boolean;
  private assetIndexCache: Map<string, number> = new Map();

  constructor(isTestnet: boolean = false) {
    this.isTestnet = isTestnet;
    this.baseUrl = isTestnet ? TESTNET_API : MAINNET_API;
    console.log('[Hyperliquid] Service initialized', { isTestnet });
  }

  setTestnet(isTestnet: boolean) {
    this.isTestnet = isTestnet;
    this.baseUrl = isTestnet ? TESTNET_API : MAINNET_API;
    this.assetIndexCache.clear();
  }

  getIsTestnet(): boolean {
    return this.isTestnet;
  }

  private async post(type: string, payload: any) {
    try {
      const response = await fetch(`${this.baseUrl}/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...payload }),
      });
      if (!response.ok) {
        console.warn(`[Hyperliquid] API error: ${response.status}`);
        return null;
      }
      return response.json();
    } catch (error) {
      console.warn('[Hyperliquid] Network error:', error);
      return null;
    }
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

  async getPrice(coin: string): Promise<number> {
    try {
      const data = await this.post('allMids', {});
      const midPx = data?.[coin];
      return midPx ? parseFloat(midPx) : 0;
    } catch (error) {
      console.error('[Hyperliquid] Failed to fetch price:', error);
      return 0;
    }
  }

  async getAssetIndex(coin: string): Promise<number> {
    if (this.assetIndexCache.has(coin)) {
      return this.assetIndexCache.get(coin)!;
    }

    try {
      const assets = await this.getAssets();
      assets.forEach((asset, index) => {
        this.assetIndexCache.set(asset.coin, index);
      });

      const index = this.assetIndexCache.get(coin);
      if (index === undefined) {
        throw new Error(`Asset ${coin} not found`);
      }
      return index;
    } catch (error) {
      console.error('[Hyperliquid] Failed to get asset index:', error);
      throw error;
    }
  }

  async checkMaxBuilderFee(userAddress: string, builderAddress: string): Promise<string | null> {
    try {
      const data = await this.post('maxBuilderFee', { 
        user: userAddress, 
        builder: builderAddress 
      });
      return data?.maxFeeRate ?? null;
    } catch (error) {
      console.error('[Hyperliquid] Failed to check builder fee:', error);
      return null;
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

  async getTradeHistory(address: string, limit: number = 100): Promise<HyperliquidFill[]> {
    try {
      const data = await this.post('userFills', { user: address });
      if (!Array.isArray(data)) return [];
      
      return data.slice(0, limit).map((fill: any) => ({
        time: fill.time || Date.now(),
        coin: fill.coin || '',
        side: fill.side || 'B',
        px: fill.px || '0',
        sz: fill.sz || '0',
        startPosition: fill.startPosition || '0',
        closedPnl: fill.closedPnl || '0',
        hash: fill.hash || fill.tid || '',
        fee: fill.fee || '0',
        feeToken: fill.feeToken || 'USDC',
        oid: fill.oid || 0,
        crossed: fill.crossed || false,
        dir: fill.dir || '',
      }));
    } catch (error) {
      console.error('[Hyperliquid] Failed to fetch trades:', error);
      return [];
    }
  }

  async getSpotBalances(address: string): Promise<HyperliquidSpotBalance[]> {
    try {
      const data = await this.post('spotClearinghouseState', { user: address });
      return (data?.balances || []).map((bal: any) => ({
        coin: bal.coin || '',
        hold: bal.hold || '0',
        total: bal.total || '0',
      }));
    } catch (error) {
      console.error('[Hyperliquid] Failed to fetch spot balances:', error);
      return [];
    }
  }

  async getOrderbook(coin: string, nLevels: number = 10): Promise<HyperliquidOrderbook | null> {
    try {
      const data = await this.post('l2Book', { coin, nSigFigs: 5 });
      if (!data?.levels) return null;
      
      const [bids, asks] = data.levels;
      return {
        coin,
        bids: (bids || []).slice(0, nLevels).map((level: any) => ({
          price: level.px,
          size: level.sz,
          numOrders: level.n || 1,
        })),
        asks: (asks || []).slice(0, nLevels).map((level: any) => ({
          price: level.px,
          size: level.sz,
          numOrders: level.n || 1,
        })),
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('[Hyperliquid] Failed to fetch orderbook:', error);
      return null;
    }
  }

  async getFundingRates(): Promise<Record<string, { fundingRate: string; nextFunding: number }>> {
    try {
      const data = await this.post('meta', {});
      const rates: Record<string, { fundingRate: string; nextFunding: number }> = {};
      
      if (data?.universe) {
        data.universe.forEach((asset: any) => {
          rates[asset.name] = {
            fundingRate: asset.funding || '0',
            nextFunding: Date.now() + 3600000,
          };
        });
      }
      return rates;
    } catch (error) {
      console.error('[Hyperliquid] Failed to fetch funding rates:', error);
      return {};
    }
  }

  async getCandleData(coin: string, interval: string, startTime: number, endTime: number): Promise<any[]> {
    try {
      const data = await this.post('candleSnapshot', {
        coin,
        interval,
        startTime,
        endTime,
      });
      return data || [];
    } catch (error) {
      console.error('[Hyperliquid] Failed to fetch candle data:', error);
      return [];
    }
  }
}

export const hyperliquidService = new HyperliquidService();
