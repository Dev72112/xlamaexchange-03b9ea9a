

# Data Source Separation Architecture Plan

## Problem Statement

The current implementation tries to handle **4 different data sources** (Zerion, OKX, Hybrid, xLama) within single components across Portfolio, Analytics, and History pages. This creates:

1. **Complex conditional rendering** - Large `useMemo` blocks converting between different data formats
2. **Mixed data structures** - Each source has different response shapes that get force-converted
3. **Feature gaps** - Some features only exist in certain sources (e.g., DeFi positions in Zerion, Realized PnL in xLama)
4. **Difficult debugging** - Hard to trace which data source is causing issues
5. **Poor separation of concerns** - UI logic mixed with data transformation logic

## Proposed Architecture

Replace the single-component-multi-source pattern with a **tabbed interface** where each tab renders source-specific components.

```text
Portfolio Page
├── Tab: "OKX" (default for multi-chain balances)
│   └── OkxPortfolioTab component
├── Tab: "Zerion" (DeFi + NFTs + advanced PnL)
│   └── ZerionPortfolioTab component
└── Tab: "xLama" (unified analytics backend - replaces "Hybrid")
    └── XlamaPortfolioTab component

Analytics Page
├── Tab: "OKX" (trading volume, basic stats)
│   └── OkxAnalyticsTab component
├── Tab: "Zerion" (protocol breakdown, fee analysis)
│   └── ZerionAnalyticsTab component
└── Tab: "xLama" (unified metrics: Realized PnL, Success Rate)
    └── XlamaAnalyticsTab component

History Page
├── Tab: "App History" (local: DEX + Bridge + Instant)
│   └── AppHistoryTab component (current tabs for instant/dex/bridge)
├── Tab: "On-Chain" (OKX transaction history API)
│   └── OnchainHistoryTab component
└── Tab: "xLama" (xLama unified transaction feed)
    └── XlamaHistoryTab component
```

## Implementation Details

### Phase 1: Create Source-Specific Portfolio Tab Components

**New Files:**
- `src/components/portfolio/tabs/OkxPortfolioTab.tsx`
- `src/components/portfolio/tabs/ZerionPortfolioTab.tsx`
- `src/components/portfolio/tabs/XlamaPortfolioTab.tsx`
- `src/components/portfolio/tabs/index.ts`

Each tab component will:
- Use its dedicated hook directly (no conditional switching)
- Render source-specific UI features
- Handle its own loading/error states

**OkxPortfolioTab** features:
- Multi-chain token balances
- Chain selector
- Holdings table with swap actions
- Allocation chart

**ZerionPortfolioTab** features:
- Wallet positions
- DeFi positions (staking, lending, liquidity)
- NFT gallery
- Advanced PnL chart
- Protocol breakdown

**XlamaPortfolioTab** features:
- Unified holdings from xLama API
- Sync status indicator
- Chain breakdown
- Automatic OKX fallback when xLama data unavailable

### Phase 2: Create Source-Specific Analytics Tab Components

**New Files:**
- `src/components/analytics/tabs/OkxAnalyticsTab.tsx`
- `src/components/analytics/tabs/ZerionAnalyticsTab.tsx`
- `src/components/analytics/tabs/XlamaAnalyticsTab.tsx`
- `src/components/analytics/tabs/index.ts`

**OkxAnalyticsTab** features:
- Trading volume from local transaction context
- Gas analytics
- Trade patterns

**ZerionAnalyticsTab** features:
- Protocol breakdown
- Fee analysis
- DeFi position value tracking

**XlamaAnalyticsTab** features:
- Unified metrics: Total Trades, Volume, Realized PnL, Success Rate
- Most traded pairs
- Most used chains
- Sync status

### Phase 3: Restructure History Page with Source Tabs

**New Files:**
- `src/components/history/tabs/AppHistoryTab.tsx`
- `src/components/history/tabs/OnchainHistoryTab.tsx`
- `src/components/history/tabs/XlamaHistoryTab.tsx`
- `src/components/history/tabs/index.ts`

**AppHistoryTab** - Moves existing local transaction UI:
- Instant exchanges (ChangeNOW)
- DEX swaps (from context)
- Bridge transactions (from context)
- Sub-tabs for filtering by type

**OnchainHistoryTab** - OKX on-chain history:
- Transaction history from OKX API
- Chain filtering

**XlamaHistoryTab** - xLama unified feed:
- Unified transaction list from xLama API
- Infinite scroll pagination
- Sync status

### Phase 4: Refactor Page Components

Simplify `Portfolio.tsx`, `Analytics.tsx`, and `History.tsx` to:
1. Remove all data source conditional logic
2. Render a tabbed interface using Radix Tabs
3. Each tab lazy-loads its component

**Example Portfolio.tsx structure:**
```typescript
<Tabs defaultValue="okx">
  <TabsList>
    <TabsTrigger value="okx">OKX</TabsTrigger>
    <TabsTrigger value="zerion">Zerion</TabsTrigger>
    <TabsTrigger value="xlama">xLama</TabsTrigger>
  </TabsList>
  <TabsContent value="okx">
    <Suspense fallback={<PortfolioSkeleton />}>
      <OkxPortfolioTab />
    </Suspense>
  </TabsContent>
  <TabsContent value="zerion">
    <Suspense fallback={<PortfolioSkeleton />}>
      <ZerionPortfolioTab />
    </Suspense>
  </TabsContent>
  <TabsContent value="xlama">
    <Suspense fallback={<PortfolioSkeleton />}>
      <XlamaPortfolioTab />
    </Suspense>
  </TabsContent>
</Tabs>
```

### Phase 5: Remove DataSourceToggle Global Approach

- **Remove** the global `DataSourceToggle` dropdown
- **Keep** `DataSourceContext` for backward compatibility but deprecate for future removal
- Tab selection naturally replaces data source switching
- Each tab remembers user's last-used tab via localStorage

### Phase 6: Cleanup and Migration

- Move shared components (charts, tables) to be data-agnostic
- Create adapter interfaces for consistent data shapes within each source
- Update feature barrel exports
- Remove unused hybrid/conversion logic

## Technical Details

### OkxPortfolioTab Component Structure

```typescript
// src/components/portfolio/tabs/OkxPortfolioTab.tsx
export function OkxPortfolioTab() {
  const { activeAddress, isConnected } = useMultiWallet();
  const [chainFilter, setChainFilter] = useState<'all-evm' | string>('all-evm');
  
  // Direct OKX hook - no source switching
  const { data: balances, isLoading } = useQuery({
    queryKey: ['okx-balances', activeAddress, chainFilter],
    queryFn: () => okxDexService.getWalletBalances(activeAddress, chainFilter),
    enabled: isConnected && !!activeAddress,
  });
  
  return (
    <div className="space-y-4">
      <ChainFilterRow value={chainFilter} onChange={setChainFilter} />
      <AccountSummaryCard balances={balances} isLoading={isLoading} />
      <PortfolioHoldingsTable balances={balances} isLoading={isLoading} />
      <PortfolioAllocationChart balances={balances} />
    </div>
  );
}
```

### XlamaAnalyticsTab Component Structure

```typescript
// src/components/analytics/tabs/XlamaAnalyticsTab.tsx
export function XlamaAnalyticsTab() {
  const { activeAddress } = useMultiWallet();
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  
  // Direct xLama hook
  const analytics = useXlamaAnalytics({ period, enabled: true });
  
  return (
    <div className="space-y-6">
      <XlamaSyncStatus />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Trades" value={analytics.totalTrades} />
        <StatCard label="Volume" value={formatUsd(analytics.totalVolume)} />
        <StatCard label="Realized PnL" value={formatUsd(analytics.realizedPnl)} variant="pnl" />
        <StatCard label="Success Rate" value={`${analytics.successRate}%`} />
      </div>
      <MostTradedPairsChart pairs={analytics.mostTradedPairs} />
      <ChainDistributionChart chains={analytics.mostUsedChains} />
    </div>
  );
}
```

### Tab Persistence

```typescript
// Store last active tab per page
const TAB_STORAGE_KEY = 'xlama-active-tabs';

function useTabPersistence(page: 'portfolio' | 'analytics' | 'history', defaultTab: string) {
  const [activeTab, setActiveTab] = useState(() => {
    const stored = localStorage.getItem(TAB_STORAGE_KEY);
    if (stored) {
      const tabs = JSON.parse(stored);
      return tabs[page] || defaultTab;
    }
    return defaultTab;
  });
  
  const setTab = (tab: string) => {
    setActiveTab(tab);
    const stored = JSON.parse(localStorage.getItem(TAB_STORAGE_KEY) || '{}');
    stored[page] = tab;
    localStorage.setItem(TAB_STORAGE_KEY, JSON.stringify(stored));
  };
  
  return [activeTab, setTab] as const;
}
```

## File Changes Summary

### New Files (12 files)
| Path | Description |
|------|-------------|
| `src/components/portfolio/tabs/OkxPortfolioTab.tsx` | OKX-specific portfolio view |
| `src/components/portfolio/tabs/ZerionPortfolioTab.tsx` | Zerion DeFi/NFT portfolio view |
| `src/components/portfolio/tabs/XlamaPortfolioTab.tsx` | xLama unified portfolio view |
| `src/components/portfolio/tabs/index.ts` | Barrel export |
| `src/components/analytics/tabs/OkxAnalyticsTab.tsx` | OKX trading analytics |
| `src/components/analytics/tabs/ZerionAnalyticsTab.tsx` | Zerion protocol analytics |
| `src/components/analytics/tabs/XlamaAnalyticsTab.tsx` | xLama unified analytics |
| `src/components/analytics/tabs/index.ts` | Barrel export |
| `src/components/history/tabs/AppHistoryTab.tsx` | Local app transaction history |
| `src/components/history/tabs/OnchainHistoryTab.tsx` | OKX on-chain history |
| `src/components/history/tabs/XlamaHistoryTab.tsx` | xLama unified history |
| `src/components/history/tabs/index.ts` | Barrel export |

### Modified Files (5 files)
| Path | Changes |
|------|---------|
| `src/pages/Portfolio.tsx` | Replace monolithic component with tabbed interface |
| `src/pages/Analytics.tsx` | Replace monolithic component with tabbed interface |
| `src/pages/History.tsx` | Replace monolithic component with tabbed interface |
| `src/features/portfolio/components/index.ts` | Export new tab components |
| `src/features/analytics/components/index.ts` | Export new tab components |

### Deprecated (to remove in future)
| Path | Reason |
|------|--------|
| `src/components/ui/DataSourceToggle.tsx` | Replaced by tab selection |
| `src/contexts/DataSourceContext.tsx` | Can be simplified or removed |

## Benefits

1. **Clear separation** - Each data source has its own component tree
2. **Easier debugging** - Issues are isolated to specific sources
3. **Feature parity visibility** - Easy to see what each source offers
4. **Simpler components** - No more complex conditional rendering
5. **Better UX** - Users explicitly choose their data view
6. **Maintainability** - Can update one source without affecting others
7. **Type safety** - Each tab uses native types from its source

## Implementation Order

| Step | Task | Files | Estimate |
|------|------|-------|----------|
| 1 | Create Portfolio tab components | 4 new files | Core |
| 2 | Refactor Portfolio.tsx | 1 file | Core |
| 3 | Create Analytics tab components | 4 new files | Core |
| 4 | Refactor Analytics.tsx | 1 file | Core |
| 5 | Create History tab components | 4 new files | Core |
| 6 | Refactor History.tsx | 1 file | Core |
| 7 | Update feature barrel exports | 2 files | Polish |
| 8 | Add tab persistence hook | 1 new file | Polish |
| 9 | Remove DataSourceToggle usage | Multiple | Cleanup |

