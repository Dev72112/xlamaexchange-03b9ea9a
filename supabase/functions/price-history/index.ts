import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { corsHeaders, securityHeaders } from "../_shared/security-headers.ts";

// Combined response headers
const responseHeaders = {
  ...corsHeaders,
  ...securityHeaders,
  'Content-Type': 'application/json',
};

// --- Input Validation Helpers ---

// Validate ticker format (alphanumeric, 2-20 chars)
function isValidTicker(ticker: unknown): ticker is string {
  return typeof ticker === 'string' && /^[a-z0-9]{2,20}$/i.test(ticker);
}

// Sanitize ticker for safe usage
function sanitizeTicker(ticker: string): string {
  return ticker.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Map common tickers to CoinGecko IDs
const tickerToCoingeckoId: Record<string, string> = {
  'btc': 'bitcoin',
  'eth': 'ethereum',
  'usdt': 'tether',
  'usdterc20': 'tether',
  'usdttrc20': 'tether',
  'usdtbsc': 'tether',
  'usdc': 'usd-coin',
  'usdcerc20': 'usd-coin',
  'bnb': 'binancecoin',
  'bnbbsc': 'binancecoin',
  'xrp': 'ripple',
  'sol': 'solana',
  'ada': 'cardano',
  'doge': 'dogecoin',
  'trx': 'tron',
  'dot': 'polkadot',
  'matic': 'matic-network',
  'ltc': 'litecoin',
  'shib': 'shiba-inu',
  'avax': 'avalanche-2',
  'link': 'chainlink',
  'atom': 'cosmos',
  'xlm': 'stellar',
  'xmr': 'monero',
  'etc': 'ethereum-classic',
  'bch': 'bitcoin-cash',
  'apt': 'aptos',
  'near': 'near',
  'fil': 'filecoin',
  'algo': 'algorand',
  'vet': 'vechain',
  'icp': 'internet-computer',
  'ftm': 'fantom',
  'sand': 'the-sandbox',
  'mana': 'decentraland',
  'axs': 'axie-infinity',
  'aave': 'aave',
  'uni': 'uniswap',
  'mkr': 'maker',
  'crv': 'curve-dao-token',
  'ldo': 'lido-dao',
  'arb': 'arbitrum',
  'op': 'optimism',
  'ton': 'the-open-network',
  'sui': 'sui',
  'sei': 'sei-network',
  'inj': 'injective-protocol',
  'pepe': 'pepe',
  'wbtc': 'wrapped-bitcoin',
  'steth': 'staked-ether',
};

function getCoingeckoId(ticker: string): string | null {
  const normalizedTicker = sanitizeTicker(ticker);
  
  // Direct match
  if (tickerToCoingeckoId[normalizedTicker]) {
    return tickerToCoingeckoId[normalizedTicker];
  }
  
  // Try base ticker (remove network suffix)
  const baseTicker = normalizedTicker
    .replace(/erc20|trc20|bsc|sol|matic|arb|op|base|ton|apt/gi, '')
    .trim();
  
  if (tickerToCoingeckoId[baseTicker]) {
    return tickerToCoingeckoId[baseTicker];
  }
  
  // Return ticker as-is (might work for some coins)
  return normalizedTicker;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIp = getClientIp(req);

  // Check persistent rate limit
  const rateCheck = await checkRateLimit('price-history', clientIp);
  if (!rateCheck.allowed) {
    console.warn(`Rate limit exceeded for price-history from ${clientIp}`);
    return rateLimitResponse(corsHeaders);
  }

  try {
    const body = await req.json();
    const { fromTicker, toTicker } = body;

    // Validate input presence
    if (!fromTicker || !toTicker) {
      return new Response(
        JSON.stringify({ error: 'Missing fromTicker or toTicker', prices: [] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate ticker format
    if (!isValidTicker(fromTicker) || !isValidTicker(toTicker)) {
      return new Response(
        JSON.stringify({ error: 'Invalid ticker format. Tickers must be 2-20 alphanumeric characters.', prices: [] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fromId = getCoingeckoId(fromTicker);
    const toId = getCoingeckoId(toTicker);

    if (!fromId || !toId) {
      return new Response(
        JSON.stringify({ error: 'Unknown ticker', fromId, toId, prices: [] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Price history request: ${fromTicker} -> ${toTicker} (${fromId} -> ${toId}) from ${clientIp}`);

    // Fetch 24h price data for both currencies in USD
    const [fromResponse, toResponse] = await Promise.all([
      fetch(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(fromId)}/market_chart?vs_currency=usd&days=1`),
      fetch(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(toId)}/market_chart?vs_currency=usd&days=1`),
    ]);

    if (!fromResponse.ok || !toResponse.ok) {
      // If CoinGecko fails, return empty data (chart will show simulated)
      console.error('CoinGecko API error:', fromResponse.status, toResponse.status);
      return new Response(
        JSON.stringify({ prices: [], error: 'Price data unavailable' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fromData = await fromResponse.json();
    const toData = await toResponse.json();

    // Calculate exchange rates
    const fromPrices = fromData.prices as [number, number][];
    const toPrices = toData.prices as [number, number][];

    // Align timestamps and calculate rate
    const rates: { timestamp: number; rate: number }[] = [];
    
    for (let i = 0; i < Math.min(fromPrices.length, toPrices.length); i++) {
      const fromPrice = fromPrices[i][1];
      const toPrice = toPrices[i][1];
      
      if (fromPrice > 0 && toPrice > 0) {
        rates.push({
          timestamp: fromPrices[i][0],
          rate: toPrice > 0 ? fromPrice / toPrice : 0,
        });
      }
    }

    // Sample to ~24 data points for cleaner chart
    const sampledRates = rates.filter((_, i) => i % Math.ceil(rates.length / 24) === 0);

    return new Response(
      JSON.stringify({ prices: sampledRates }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Price history error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, prices: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
