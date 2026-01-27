# xLama Analytics API Integration Plan

## Overview

This plan covers testing and integrating the external **xLama Analytics API** (hosted at `ciandnwvnweoyoutaysb.supabase.co/functions/v1`) into the xLama frontend. The API provides comprehensive endpoints for portfolio holdings, trading analytics, transaction history, and real-time webhooks.

---

## ✅ Phase 1: API Key Setup & Initial Testing (COMPLETE)

### ✅ Task 1.1: Store API Key as Secret
- Added `XLAMA_API_KEY` to project secrets

### ✅ Task 1.2: Create API Proxy Edge Function
Created `supabase/functions/xlama-api/index.ts`:
- Acts as a secure proxy to the external API
- Adds the API key from secrets to requests
- Handles CORS and error responses

### ✅ Task 1.3: Manual API Testing
Tested all endpoints successfully:
- ✅ Health check: Returns healthy status
- ✅ Portfolio: `GET /portfolio?wallet=...`
- ✅ Analytics: `GET /trading-analytics?wallet=...&period=30d`
- ✅ Transactions: `GET /fetch-transactions?wallet=...&limit=5`

---

## ✅ Phase 2: Create Integration Services (COMPLETE)

### ✅ Task 2.1: xLama API Service
Created `src/services/xlamaApi.ts`:
- Type definitions matching actual API responses
- Service functions for all endpoints

### ✅ Task 2.2: React Query Hooks
Created hooks:
- `src/hooks/useXlamaPortfolio.ts` - Portfolio data with 30s stale time
- `src/hooks/useXlamaAnalytics.ts` - Trading analytics with period selection
- `src/hooks/useXlamaTransactions.ts` - Transaction history with infinite scroll

---

## ✅ Phase 3: Page Integration (COMPLETE)

### ✅ Task 3.1: Portfolio Page
- `AccountSummaryCard` uses xLama portfolio total when xLama source selected
- `PortfolioHoldingsTable` uses xLama holdings
- Badge indicator shows "xLama" when active
- Seamless fallback to OKX data when not using xLama

### ✅ Task 3.2: Analytics Page
- Added `useXlamaAnalytics` hook integration
- `displayAnalytics` computed object selects between xLama and local data
- Supports all time periods (7d, 30d, 90d, all)
- Refresh includes xLama query invalidation

### ✅ Task 3.3: History Page
- Added `useXlamaTransactions` hook integration
- Unified transaction feed includes xLama transactions when enabled
- Proper mapping to `UnifiedTransaction` format
- Maintains existing DEX/Bridge/Instant transaction display when not using xLama

---

## ✅ Phase 4: Data Source Toggle (COMPLETE)

### ✅ Task 4.1: Update DataSourceContext
Added `xlama` to DataSource type:
```typescript
type DataSource = 'okx' | 'zerion' | 'hybrid' | 'xlama';
```

### ✅ Task 4.2: DataSourceToggle UI
Updated toggle component with xLama option (LineChart icon)

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
│  /portfolio?wallet=     │  Portfolio holdings               │
│  /trading-analytics     │  Trade metrics & PnL              │
│  /fetch-transactions    │  Transaction history              │
│  /cross-chain-analytics │  Multi-chain aggregation          │
│  /price-oracle          │  Token prices                     │
│  /webhook/*             │  Real-time subscriptions          │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Progress

| Phase | Task | Status |
|-------|------|--------|
| 1.1 | Store API key secret | ✅ Done |
| 1.2 | Create xlama-api edge function | ✅ Done |
| 1.3 | Manual endpoint testing | ✅ Done |
| 2.1 | xlamaApi service | ✅ Done |
| 2.2 | React Query hooks | ✅ Done |
| 4.1 | DataSource context update | ✅ Done |
| 4.2 | Toggle UI update | ✅ Done |
| 3.1 | Portfolio integration | ✅ Done |
| 3.2 | Analytics integration | ✅ Done |
| 3.3 | History integration | ✅ Done |

---

## Files Created

- `supabase/functions/xlama-api/index.ts` - Edge function proxy
- `src/services/xlamaApi.ts` - API service with types
- `src/hooks/useXlamaPortfolio.ts` - Portfolio hook
- `src/hooks/useXlamaAnalytics.ts` - Analytics hook
- `src/hooks/useXlamaTransactions.ts` - Transactions hook

## Files Modified

- `supabase/config.toml` - Added xlama-api function config
- `src/contexts/DataSourceContext.tsx` - Added 'xlama' data source
- `src/components/ui/DataSourceToggle.tsx` - Added xLama option
- `src/hooks/useHybridPortfolio.ts` - Updated type for xlama
- `src/features/analytics/hooks/index.ts` - Exported new hooks
- `src/features/analytics/index.ts` - Exported new hooks
- `src/pages/Portfolio.tsx` - Integrated xLama portfolio data
- `src/pages/Analytics.tsx` - Integrated xLama analytics data
- `src/pages/History.tsx` - Integrated xLama transaction data

---

## How to Test

1. **Switch data source**: Use the Data Source Toggle dropdown (in Portfolio page header or settings) and select "xLama API"
2. **Connect wallet**: Connect an EVM wallet with transaction history
3. **View Portfolio**: Should display holdings from xLama API
4. **View Analytics**: Should show trading analytics from xLama API
5. **View History**: Should display transactions from xLama API

The integration is designed to be seamless - when xLama is selected, data flows from the xLama API; when other sources are selected, existing OKX/Zerion data is used.
