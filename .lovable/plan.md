

# xLama Analytics API Integration Plan

## Overview

This plan covers testing and integrating the external **xLama Analytics API** (hosted at `ciandnwvnweoyoutaysb.supabase.co/functions/v1`) into the xLama frontend. The API provides comprehensive endpoints for portfolio holdings, trading analytics, transaction history, and real-time webhooks.

---

## Phase 1: API Key Setup & Initial Testing

### Task 1.1: Store API Key as Secret
- Add `XLAMA_API_KEY` to project secrets for secure storage
- This key will be used by a new edge function proxy to call the external API

### Task 1.2: Create API Proxy Edge Function
Create a new edge function `xlama-api` that:
- Acts as a secure proxy to the external API
- Adds the API key from secrets to requests
- Handles CORS and error responses
- Supports all major endpoints

**File**: `supabase/functions/xlama-api/index.ts`

```text
Supported Routes:
├── /health                    → GET  (no auth)
├── /portfolio/:wallet         → GET  (portfolio:read)
├── /trading-analytics         → GET  (analytics:read)
├── /fetch-transactions        → GET  (transactions:read)
├── /cross-chain-analytics     → GET  (analytics:read)
├── /price-oracle              → GET  (prices:read)
└── /wallets                   → CRUD (wallets:*)
```

### Task 1.3: Manual API Testing
Test each endpoint using the edge function curl tool:
1. Health check (verify connectivity)
2. Portfolio endpoint with test wallet
3. Trading analytics with test wallet
4. Transaction fetch with test wallet

---

## Phase 2: Create Integration Services

### Task 2.1: xLama API Service
Create a new service module to interface with the proxy:

**File**: `src/services/xlamaApi.ts`

```typescript
// Type definitions matching API responses
interface XlamaPortfolio {
  success: boolean;
  wallet: string;
  holdings: TokenHolding[];
  total_value_usd: number;
  chain_breakdown: Record<string, number>;
}

interface XlamaAnalytics {
  success: boolean;
  analytics: {
    total_trades: number;
    total_volume_usd: number;
    realized_pnl: number;
    most_traded_pairs: TradedPair[];
    chain_distribution: Record<string, number>;
  };
}

interface XlamaTransaction {
  tx_hash: string;
  wallet_address: string;
  chain_id: string;
  transaction_type: string;
  token_in: TokenInfo;
  token_out: TokenInfo;
  value_usd: number;
  timestamp: string;
}

// Service functions
export const xlamaApi = {
  getPortfolio: (wallet: string) => Promise<XlamaPortfolio>,
  getAnalytics: (wallet: string, period?: string) => Promise<XlamaAnalytics>,
  getTransactions: (wallet: string, options?: TransactionOptions) => Promise<XlamaTransaction[]>,
  getCrossChainAnalytics: (wallets?: string[]) => Promise<CrossChainData>,
  getPrices: (tokens: string[], chain?: string) => Promise<PriceData>,
};
```

### Task 2.2: React Query Hooks
Create hooks that leverage the service:

**File**: `src/hooks/useXlamaPortfolio.ts`
- Fetches portfolio data from xLama API
- Integrates with `useMultiWallet` for active address
- Respects `DataSourceContext` toggle
- 30s stale time, auto-refresh

**File**: `src/hooks/useXlamaAnalytics.ts`
- Fetches trading analytics by period
- Supports 7d, 30d, 90d, all timeframes
- Aggregates cross-chain data

**File**: `src/hooks/useXlamaTransactions.ts`
- Fetches transaction history
- Supports source filtering (okx, lifi, all)
- Pagination support

---

## Phase 3: Page Integration

### Task 3.1: Portfolio Page
Replace/augment current OKX API calls with xLama API:
- `AccountSummaryCard` uses xLama portfolio total
- `PortfolioHoldingsTable` uses xLama holdings
- Chain breakdown from xLama API

### Task 3.2: Analytics Page
Integrate xLama trading analytics:
- Total trades count
- Total volume USD
- Realized PnL display
- Most traded pairs chart
- Chain distribution pie chart

### Task 3.3: History Page
Connect xLama transactions to history tabs:
- "OnChain" tab uses xLama transaction data
- Unified format mapping to `UnifiedTransactionCard`
- Real-time sync status indicator

---

## Phase 4: Data Source Toggle

### Task 4.1: Update DataSourceContext
Add xLama as a data source option:
```typescript
type DataSource = 'okx' | 'zerion' | 'xlama';
```

### Task 4.2: DataSourceToggle UI
Update the toggle component to include xLama option with proper labeling

---

## Phase 5: Webhook Integration (Future)

### Task 5.1: Webhook Subscription
Configure webhook for real-time updates:
- `transaction.new` → Invalidate transaction cache
- `swap.completed` → Update analytics
- `price.update` → Update PriceOracleContext

---

## Technical Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                     xLama Frontend                          │
├─────────────────────────────────────────────────────────────┤
│  Portfolio Page    Analytics Page    History Page           │
│       │                 │                 │                 │
│       └────────────┬────┴────────────────┘                 │
│                    ▼                                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              React Query Hooks                        │  │
│  │  useXlamaPortfolio │ useXlamaAnalytics │ useXlama... │  │
│  └──────────────────────────────────────────────────────┘  │
│                    │                                        │
│                    ▼                                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              xlamaApi Service                         │  │
│  │          src/services/xlamaApi.ts                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                    │                                        │
└────────────────────│────────────────────────────────────────┘
                     │ HTTP
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Lovable Cloud Edge Function                     │
│              supabase/functions/xlama-api                    │
│                    │                                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  - Adds x-api-key header from secrets                 │  │
│  │  - Proxies to external xLama API                      │  │
│  │  - Handles errors and rate limiting                   │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────│────────────────────────────────────────┘
                     │ HTTP
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         External xLama Analytics API                         │
│     ciandnwvnweoyoutaysb.supabase.co/functions/v1           │
├─────────────────────────────────────────────────────────────┤
│  /portfolio/:wallet     │  Portfolio holdings               │
│  /trading-analytics     │  Trade metrics & PnL              │
│  /fetch-transactions    │  Transaction history              │
│  /cross-chain-analytics │  Multi-chain aggregation          │
│  /price-oracle          │  Token prices                     │
│  /webhook/*             │  Real-time subscriptions          │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Order

| Phase | Task | Effort |
|-------|------|--------|
| 1.1 | Store API key secret | 2 min |
| 1.2 | Create xlama-api edge function | 15 min |
| 1.3 | Manual endpoint testing | 10 min |
| 2.1 | xlamaApi service | 15 min |
| 2.2 | React Query hooks | 20 min |
| 3.1 | Portfolio integration | 20 min |
| 3.2 | Analytics integration | 20 min |
| 3.3 | History integration | 15 min |
| 4.1 | DataSource context update | 10 min |
| 4.2 | Toggle UI update | 5 min |

**Total Estimated Time**: ~2.5 hours

---

## Supported Chains (from API docs)

The xLama API supports 30+ chains including:
- **L1s**: Ethereum, BNB Chain, Avalanche, Fantom
- **L2s**: Arbitrum, Optimism, Base, zkSync, Linea, Scroll, Blast
- **Alt-L1s**: Solana, Tron, Sui, TON
- **Others**: Polygon, Gnosis, Celo, Moonbeam, Cronos

---

## Next Steps After Approval

1. **Add API key to secrets** using the secret input tool
2. **Create the edge function proxy** for secure API access
3. **Test endpoints** to verify connectivity
4. **Build service layer and hooks**
5. **Integrate into pages**

