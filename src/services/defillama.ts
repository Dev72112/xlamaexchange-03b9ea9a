// DefiLlama API service for price data fallback
const DEFILLAMA_API = 'https://coins.llama.fi';

export interface DefiLlamaPrice {
  price: number;
  symbol: string;
  timestamp: number;
  confidence: number;
}

// Map common tickers to DefiLlama coin IDs
const tickerToCoingeckoId: Record<string, string> = {
  btc: 'bitcoin',
  eth: 'ethereum',
  sol: 'solana',
  xrp: 'ripple',
  ada: 'cardano',
  doge: 'dogecoin',
  dot: 'polkadot',
  matic: 'polygon',
  ltc: 'litecoin',
  link: 'chainlink',
  atom: 'cosmos',
  xlm: 'stellar',
  trx: 'tron',
  avaxc: 'avalanche-2',
  bnbmainnet: 'binancecoin',
  usdterc20: 'tether',
  usdttrc20: 'tether',
  usdcerc20: 'usd-coin',
  xmr: 'monero',
  etc: 'ethereum-classic',
  bch: 'bitcoin-cash',
};

class DefiLlamaService {
  private cache: Map<string, { price: number; timestamp: number }> = new Map();
  private cacheTimeout = 60000; // 1 minute cache

  async getPrice(ticker: string): Promise<number | null> {
    const coingeckoId = tickerToCoingeckoId[ticker.toLowerCase()];
    if (!coingeckoId) return null;

    // Check cache
    const cached = this.cache.get(coingeckoId);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.price;
    }

    try {
      const response = await fetch(
        `${DEFILLAMA_API}/prices/current/coingecko:${coingeckoId}`
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      const coinKey = `coingecko:${coingeckoId}`;
      
      if (data.coins && data.coins[coinKey]) {
        const price = data.coins[coinKey].price;
        this.cache.set(coingeckoId, { price, timestamp: Date.now() });
        return price;
      }
      
      return null;
    } catch (error) {
      console.error(`DefiLlama price fetch failed for ${ticker}:`, error);
      return null;
    }
  }

  async getPrices(tickers: string[]): Promise<Record<string, number | null>> {
    const coins = tickers
      .map(t => {
        const id = tickerToCoingeckoId[t.toLowerCase()];
        return id ? `coingecko:${id}` : null;
      })
      .filter(Boolean)
      .join(',');

    if (!coins) return {};

    try {
      const response = await fetch(`${DEFILLAMA_API}/prices/current/${coins}`);
      if (!response.ok) return {};

      const data = await response.json();
      const result: Record<string, number | null> = {};

      tickers.forEach(ticker => {
        const id = tickerToCoingeckoId[ticker.toLowerCase()];
        if (id) {
          const coinKey = `coingecko:${id}`;
          result[ticker] = data.coins?.[coinKey]?.price ?? null;
        }
      });

      return result;
    } catch (error) {
      console.error('DefiLlama bulk price fetch failed:', error);
      return {};
    }
  }

  async getHistoricalPrice(ticker: string, timestamp: number): Promise<number | null> {
    const coingeckoId = tickerToCoingeckoId[ticker.toLowerCase()];
    if (!coingeckoId) return null;

    try {
      const response = await fetch(
        `${DEFILLAMA_API}/prices/historical/${timestamp}/coingecko:${coingeckoId}`
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      const coinKey = `coingecko:${coingeckoId}`;
      
      return data.coins?.[coinKey]?.price ?? null;
    } catch (error) {
      console.error(`DefiLlama historical price fetch failed for ${ticker}:`, error);
      return null;
    }
  }
}

export const defiLlamaService = new DefiLlamaService();
