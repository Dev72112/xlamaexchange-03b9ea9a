
# Enhanced Token Pricing with DexScreener + X Layer Token Mappings (v2.8.1)

## Overview

This plan adds a comprehensive multi-source price resolution system with:
1. **DexScreener API integration** as an additional fallback
2. **Direct contract address mappings** for X Layer wrapped tokens (XBTC, XETH, XSOL, XDOG)
3. **Enhanced pricing chain** that ensures USD values are captured for all tokens

## Current Price Resolution Chain

```text
OKX Market API → Router Result Prices → Stablecoin Fallback ($1.00)
```

## New Price Resolution Chain (After Implementation)

```text
1. OKX Market API (primary - fastest)
   ↓ (fails)
2. Aggregator Router Result (from swap quote)
   ↓ (fails)
3. DexScreener API (new - supports many DEX pairs)
   ↓ (fails)
4. DefiLlama/CoinGecko (existing - major tokens)
   ↓ (fails)
5. X Layer Token Price Map (new - hardcoded wrapped tokens)
   ↓ (fails)
6. Stablecoin Fallback ($1.00 for USDT, USDC, USDG, etc.)
```

---

## Phase 1: Create DexScreener Service

### New File: `src/services/dexscreener.ts`

Create a service that calls the free DexScreener API to fetch token prices by contract address.

**Key Features:**
- No API key required (free tier)
- Supports all EVM chains including X Layer (chainId: 196)
- Returns price, 24h change, volume, and liquidity
- Built-in caching (60 second TTL)

**API Endpoint:**
```
GET https://api.dexscreener.com/tokens/v1/{chainId}/{tokenAddress}
```

**Example Response:**
```json
{
  "pairs": [{
    "priceUsd": "0.01234",
    "priceChange": { "h24": 5.5 },
    "volume": { "h24": 50000 },
    "liquidity": { "usd": 100000 }
  }]
}
```

---

## Phase 2: Add X Layer Token Contract Mappings

### Update: `src/lib/tokenPricing.ts`

Add a mapping of X Layer wrapped tokens to their underlying asset prices. This allows us to derive prices for tokens like XBTC by looking up BTC price.

**X Layer Wrapped Token Mappings:**

| Token | Contract Address | Maps To |
|-------|-----------------|---------|
| XBTC | `0xb7c00000bcdeef966b20b3d884b98e64d2b06b4f` | BTC |
| XETH | `0xe7b000003a45145decf8a28fc755ad5ec5ea025a` | ETH |
| XSOL | `0x505000008de8748dbd4422ff4687a4fc9beba15b` | SOL |
| WETH | `0x5a77f1443d16ee5761d310e38b62f77f726bc71c` | ETH |
| WOKB | `0xe538905cf8410324e03a5a23c1c177a474d59b2b` | OKB |
| XDOG | `0x0cc24c51bf89c00c5affbfcf5e856c25ecbdb48e` | (DexScreener) |
| USDG | `0x4ae46a509f6b1d9056937ba4500cb143933d2dc8` | USD (stable) |
| USDT | `0x1e4a5963abfd975d8c9021ce480b42188849d41d` | USD (stable) |
| USDC | `0x74b7f16337b8972027f6196a17a631ac6de26d22` | USD (stable) |

---

## Phase 3: Create Enhanced Price Oracle Hook

### New File: `src/hooks/useEnhancedTokenPrice.ts`

A hook that tries multiple sources in order to get the best available price.

**Fallback Chain:**
```typescript
async function getTokenPrice(chainId: string, tokenAddress: string, symbol: string): Promise<number | null> {
  // 1. Try OKX Market API (via existing okxDexService)
  let price = await tryOkxPrice(chainId, tokenAddress);
  if (price) return price;
  
  // 2. Try DexScreener API (new)
  price = await dexScreenerService.getPrice(chainId, tokenAddress);
  if (price) return price;
  
  // 3. Try DefiLlama (for major tokens)
  price = await defiLlamaService.getPrice(symbol);
  if (price) return price;
  
  // 4. Try X Layer wrapped token mapping
  price = getXLayerWrappedTokenPrice(tokenAddress);
  if (price) return price;
  
  // 5. Stablecoin fallback
  return getStablecoinFallbackPrice(symbol);
}
```

---

## Phase 4: Update ExchangeWidget to Use Enhanced Pricing

### Update: `src/components/exchange/ExchangeWidget.tsx`

Modify the swap completion handler to use the enhanced pricing system:

```typescript
// Before saving transaction, ensure we have USD values
const enhancedFromPrice = await getEnhancedPrice(chainId, fromToken.address, fromToken.symbol);
const enhancedToPrice = await getEnhancedPrice(chainId, toToken.address, toToken.symbol);

// Calculate USD values with fallbacks
const fromUsd = fromAmount * (enhancedFromPrice ?? 0);
const toUsd = toAmount * (enhancedToPrice ?? 0);
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/services/dexscreener.ts` | Create | DexScreener API service with caching |
| `src/lib/tokenPricing.ts` | Update | Add X Layer contract mappings + DexScreener integration |
| `src/hooks/useEnhancedTokenPrice.ts` | Create | Multi-source price resolution hook |
| `src/components/exchange/ExchangeWidget.tsx` | Update | Use enhanced pricing for USD values |
| `src/contexts/PriceOracleContext.tsx` | Update | Add DexScreener as fallback source |
| `src/pages/Changelog.tsx` | Update | Add v2.8.1 entry |

---

## DexScreener Service Implementation Details

```typescript
// src/services/dexscreener.ts

const DEXSCREENER_API = 'https://api.dexscreener.com';

// Chain ID mapping (EVM chainId to DexScreener chainId)
const chainIdToDexScreener: Record<string, string> = {
  '1': 'ethereum',
  '56': 'bsc',
  '137': 'polygon',
  '42161': 'arbitrum',
  '10': 'optimism',
  '8453': 'base',
  '43114': 'avalanche',
  '250': 'fantom',
  '324': 'zksync',
  '59144': 'linea',
  '534352': 'scroll',
  '196': 'xlayer',  // X Layer
  // ... more chains
};

class DexScreenerService {
  private cache: Map<string, { price: number; timestamp: number }>;
  
  async getPrice(chainId: string, tokenAddress: string): Promise<number | null> {
    const chain = chainIdToDexScreener[chainId];
    if (!chain) return null;
    
    const response = await fetch(
      `${DEXSCREENER_API}/tokens/v1/${chain}/${tokenAddress}`
    );
    const data = await response.json();
    
    // Get price from first pair with highest liquidity
    const pairs = data.pairs || [];
    if (pairs.length === 0) return null;
    
    const bestPair = pairs.sort((a, b) => 
      (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
    )[0];
    
    return parseFloat(bestPair.priceUsd);
  }
}
```

---

## X Layer Token Price Map

```typescript
// In tokenPricing.ts

// X Layer wrapped tokens that map to underlying assets
const XLAYER_WRAPPED_TOKENS: Record<string, { underlying: string; chainId?: string }> = {
  // XBTC maps to BTC price (fetch from DefiLlama)
  '0xb7c00000bcdeef966b20b3d884b98e64d2b06b4f': { underlying: 'btc' },
  // XETH maps to ETH price
  '0xe7b000003a45145decf8a28fc755ad5ec5ea025a': { underlying: 'eth' },
  // XSOL maps to SOL price
  '0x505000008de8748dbd4422ff4687a4fc9beba15b': { underlying: 'sol' },
  // WETH maps to ETH price
  '0x5a77f1443d16ee5761d310e38b62f77f726bc71c': { underlying: 'eth' },
  // WOKB - use DexScreener or OKB price
  '0xe538905cf8410324e03a5a23c1c177a474d59b2b': { underlying: 'okb' },
};

// X Layer stablecoins (address -> $1.00)
const XLAYER_STABLECOINS = new Set([
  '0x4ae46a509f6b1d9056937ba4500cb143933d2dc8', // USDG
  '0x779ded0c9e1022225f8e0630b35a9b54be713736', // USD₮0
  '0x1e4a5963abfd975d8c9021ce480b42188849d41d', // USDT
  '0x74b7f16337b8972027f6196a17a631ac6de26d22', // USDC
]);

export async function getXLayerTokenPrice(tokenAddress: string): Promise<number | null> {
  const addr = tokenAddress.toLowerCase();
  
  // Check if it's a stablecoin
  if (XLAYER_STABLECOINS.has(addr)) {
    return 1.0;
  }
  
  // Check wrapped token mapping
  const mapping = XLAYER_WRAPPED_TOKENS[addr];
  if (mapping) {
    // Get underlying asset price from DefiLlama
    return defiLlamaService.getPrice(mapping.underlying);
  }
  
  return null;
}
```

---

## Expected Outcomes

| Scenario | Before | After |
|----------|--------|-------|
| XBTC swap on X Layer | $0.00 (no price data) | $77,600 (maps to BTC) |
| XETH swap on X Layer | $0.00 (no price data) | $2,277 (maps to ETH) |
| XSOL swap on X Layer | $0.00 (no price data) | $102 (maps to SOL) |
| XDOG swap on X Layer | $0.00 (no price data) | $0.0056 (DexScreener) |
| NIUMA swap on X Layer | $0.00 (no price data) | Price from DexScreener |
| USDG swap | $0.00 (price API fails) | $1.00 (stablecoin) |
| DOG swap on X Layer | $0.00 | Price from DexScreener |

---

## Changelog Entry (v2.8.1)

```typescript
{
  version: "2.8.1",
  date: "2026-02-XX",
  title: "Enhanced Token Pricing",
  description: "Added DexScreener fallback and X Layer token mappings for better USD value tracking.",
  type: "patch",
  changes: [
    { category: "new", text: "Added DexScreener API as price fallback source" },
    { category: "new", text: "Added X Layer wrapped token price mappings (XBTC, XETH, XSOL)" },
    { category: "improvement", text: "Better USD value capture for Analytics volume charts" },
    { category: "fix", text: "Fixed $0 volume display for X Layer token swaps" },
  ],
}
```

---

## Next Steps After This (Future Features)

Based on the roadmap discussion, after completing the pricing enhancements:

| Priority | Feature | Description |
|----------|---------|-------------|
| 1 | **Wire Push Notifications** | Connect order execution events to push notifications |
| 2 | **Social Trading Preview** | Anonymous trade sharing and community features |
| 3 | **Chain Distribution Heatmap** | Visual heatmap of trading activity by chain |
| 4 | **Performance Dashboard** | Detailed PnL breakdown with entry/exit prices |
