// DefiLlama API service for price data fallback
const DEFILLAMA_API = 'https://coins.llama.fi';

export interface DefiLlamaPrice {
  price: number;
  symbol: string;
  timestamp: number;
  confidence: number;
}

export interface PriceWithChange {
  price: number;
  change24h: number | null;
}

// Map common tickers to DefiLlama coin IDs (comprehensive mapping)
const tickerToCoingeckoId: Record<string, string> = {
  // Major coins
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
  xmr: 'monero',
  etc: 'ethereum-classic',
  bch: 'bitcoin-cash',
  eos: 'eos',
  xtz: 'tezos',
  algo: 'algorand',
  vet: 'vechain',
  fil: 'filecoin',
  theta: 'theta-token',
  hbar: 'hedera-hashgraph',
  icp: 'internet-computer',
  near: 'near',
  ftm: 'fantom',
  flow: 'flow',
  egld: 'elrond-erd-2',
  xec: 'ecash',
  neo: 'neo',
  zec: 'zcash',
  dash: 'dash',
  waves: 'waves',
  kava: 'kava',
  ksm: 'kusama',
  zil: 'zilliqa',
  enj: 'enjincoin',
  bat: 'basic-attention-token',
  qtum: 'qtum',
  ont: 'ontology',
  icx: 'icon',
  dcr: 'decred',
  sc: 'siacoin',
  zen: 'horizen',
  rvn: 'ravencoin',
  dgb: 'digibyte',
  // Network specific variants
  avaxc: 'avalanche-2',
  avax: 'avalanche-2',
  bnbmainnet: 'binancecoin',
  bnb: 'binancecoin',
  bnbbsc: 'binancecoin',
  maticmainnet: 'polygon',
  maticpolygon: 'polygon',
  // Stablecoins
  usdterc20: 'tether',
  usdttrc20: 'tether',
  usdtbsc: 'tether',
  usdtsol: 'tether',
  usdtpolygon: 'tether',
  usdt: 'tether',
  usdcerc20: 'usd-coin',
  usdcsol: 'usd-coin',
  usdcpolygon: 'usd-coin',
  usdc: 'usd-coin',
  dai: 'dai',
  busd: 'binance-usd',
  tusd: 'true-usd',
  usdp: 'paxos-standard',
  frax: 'frax',
  // DeFi & Layer 2
  uni: 'uniswap',
  aave: 'aave',
  mkr: 'maker',
  snx: 'havven',
  comp: 'compound-governance-token',
  crv: 'curve-dao-token',
  sushi: 'sushi',
  yfi: 'yearn-finance',
  ldo: 'lido-dao',
  arb: 'arbitrum',
  op: 'optimism',
  apt: 'aptos',
  sui: 'sui',
  sei: 'sei-network',
  inj: 'injective-protocol',
  ton: 'the-open-network',
  // Meme coins
  shib: 'shiba-inu',
  pepe: 'pepe',
  floki: 'floki',
  bonk: 'bonk',
  wif: 'dogwifcoin',
  // Gaming & Metaverse
  sand: 'the-sandbox',
  mana: 'decentraland',
  axs: 'axie-infinity',
  gala: 'gala',
  imx: 'immutable-x',
  ape: 'apecoin',
  // AI & Data
  rndr: 'render-token',
  grt: 'the-graph',
  ocean: 'ocean-protocol',
  fet: 'fetch-ai',
  agix: 'singularitynet',
  // Infrastructure
  qnt: 'quant-network',
  stx: 'blockstack',
  rune: 'thorchain',
  rose: 'oasis-network',
  mina: 'mina-protocol',
  kas: 'kaspa',
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

  async getPricesWithChange(tickers: string[]): Promise<Record<string, PriceWithChange>> {
    const coins = tickers
      .map(t => {
        const id = tickerToCoingeckoId[t.toLowerCase()];
        return id ? `coingecko:${id}` : null;
      })
      .filter(Boolean);

    if (coins.length === 0) return {};

    const coinsParam = coins.join(',');
    const timestamp24hAgo = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);

    try {
      // Fetch current and historical prices in parallel
      const [currentRes, historicalRes] = await Promise.all([
        fetch(`${DEFILLAMA_API}/prices/current/${coinsParam}`),
        fetch(`${DEFILLAMA_API}/prices/historical/${timestamp24hAgo}/${coinsParam}`)
      ]);

      const [currentData, historicalData] = await Promise.all([
        currentRes.ok ? currentRes.json() : { coins: {} },
        historicalRes.ok ? historicalRes.json() : { coins: {} }
      ]);

      const result: Record<string, PriceWithChange> = {};

      tickers.forEach(ticker => {
        const id = tickerToCoingeckoId[ticker.toLowerCase()];
        if (id) {
          const coinKey = `coingecko:${id}`;
          const currentPrice = currentData.coins?.[coinKey]?.price;
          const historicalPrice = historicalData.coins?.[coinKey]?.price;
          
          if (currentPrice) {
            let change24h: number | null = null;
            if (historicalPrice && historicalPrice > 0) {
              change24h = ((currentPrice - historicalPrice) / historicalPrice) * 100;
            }
            result[ticker] = { price: currentPrice, change24h };
          }
        }
      });

      return result;
    } catch (error) {
      console.error('DefiLlama price with change fetch failed:', error);
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
