
# xLama API Testing & Data Migration Plan

## Issues Identified

### 1. DataSourceToggle Not Visible
The `DataSourceToggle` component exists but is **not being rendered** on Portfolio, Analytics, or History pages. Users cannot switch to xLama data source.

### 2. Wallet Not Registered
The xLama API requires wallets to be registered via `POST /wallets` before transactions can be synced. Your wallet (ending in 662) hasn't been registered.

### 3. No Transaction Sync
The `POST /sync-transactions` endpoint hasn't been called to pull existing transaction history from OKX/LiFi APIs.

### 4. No Real-time Webhook
Swaps performed on xlamaexchange.com aren't being pushed to the xLama backend. Need to configure webhook subscription.

---

## Implementation Plan

### Phase 1: Add DataSourceToggle to Pages

Add the toggle component to all three pages so users can switch data sources.

**Files to modify:**
- `src/pages/Portfolio.tsx` - Add toggle in top controls section
- `src/pages/Analytics.tsx` - Add toggle near refresh button
- `src/pages/History.tsx` - Add toggle in header area

**Location:** Next to refresh/filter controls in each page's header

---

### Phase 2: Add Wallet Management to xlamaApi Service

Extend the service to support wallet registration and transaction sync.

**New methods in `src/services/xlamaApi.ts`:**
```text
├── registerWallet(wallet, label?)     → POST /wallets
├── syncTransactions(wallet, source?)  → POST /sync-transactions  
├── listWallets()                      → GET /wallets
└── getWalletStatus(wallet)            → GET /wallets/:address
```

---

### Phase 3: Create Wallet Sync Hook

Create a new hook for managing wallet sync state.

**New file: `src/hooks/useXlamaWalletSync.ts`**
- Auto-register wallet when xLama source is enabled
- Trigger transaction sync on first use
- Show sync status (pending/syncing/synced)
- Support manual re-sync button

---

### Phase 4: Add Wallet Sync UI

Add sync status indicator and manual sync button to pages.

**UI Elements:**
- Sync status badge (syncing/synced/error)
- "Sync Transactions" button
- Last synced timestamp
- Progress indicator during sync

---

### Phase 5: Configure Webhook for Real-time Swaps

Set up webhook subscription to receive swap events in real-time.

**Webhook Configuration:**
- Subscribe to `transaction.new`, `swap.completed`, `bridge.completed` events
- Target URL: Backend edge function that invalidates React Query cache
- Signature verification for security

---

## Technical Details

### DataSourceToggle Placement

**Portfolio Page (line ~484):**
```typescript
// In the flex controls row, after refresh button
import { DataSourceToggle } from '@/components/ui/DataSourceToggle';

<div className="flex items-center gap-1.5">
  <Button variant="ghost" size="icon" onClick={() => setHideBalances(!hideBalances)}>
    ...
  </Button>
  <Button variant="ghost" size="icon" onClick={handleRefresh}>
    ...
  </Button>
  <DataSourceToggle compact />  {/* ADD THIS */}
</div>
```

**Analytics Page (line ~415):**
```typescript
// Near the refresh button in header
<div className="flex items-center justify-center gap-3 mb-4">
  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass...">
    ...
  </div>
  <Button variant="outline" size="sm" onClick={handlePullRefresh}>
    ...
  </Button>
  <DataSourceToggle compact />  {/* ADD THIS */}
</div>
```

**History Page (line ~391):**
```typescript
// In header controls area
<div className="mb-10 flex items-start justify-between flex-wrap gap-4">
  <div className="relative">
    ...
  </div>
  <div className="flex items-center gap-2">
    <DataSourceToggle compact />  {/* ADD THIS */}
    {/* Existing chain toggle */}
    <div className="inline-flex items-center gap-1 p-1 rounded-lg glass...">
      ...
    </div>
  </div>
</div>
```

### xlamaApi Service Extensions

```typescript
// Add to xlamaApi object in src/services/xlamaApi.ts

/**
 * Register a wallet for tracking
 */
registerWallet: async (wallet: string, label?: string): Promise<{
  success: boolean;
  wallet: WalletInfo;
}> => {
  return fetchFromProxy('wallets', {
    method: 'POST',
    body: JSON.stringify({
      wallet_address: wallet,
      label: label || 'xLama Exchange',
      sync_enabled: true,
    }),
  });
},

/**
 * Sync transactions for a wallet
 */
syncTransactions: async (wallet: string, source?: 'okx' | 'lifi' | 'all'): Promise<{
  success: boolean;
  synced: number;
  new_transactions: number;
}> => {
  return fetchFromProxy('sync-transactions', {
    method: 'POST',
    body: JSON.stringify({
      wallet,
      source: source || 'all',
    }),
  });
},

/**
 * List all tracked wallets
 */
listWallets: async (): Promise<{
  success: boolean;
  wallets: WalletInfo[];
  total: number;
}> => {
  return fetchFromProxy('wallets');
},
```

### useXlamaWalletSync Hook

```typescript
// New file: src/hooks/useXlamaWalletSync.ts

export function useXlamaWalletSync() {
  const { activeAddress } = useMultiWallet();
  const { isXlamaEnabled } = useDataSource();
  
  // Query wallet registration status
  const { data: walletStatus } = useQuery({
    queryKey: ['xlama-wallet-status', activeAddress],
    queryFn: () => xlamaApi.getWalletStatus(activeAddress!),
    enabled: !!activeAddress && isXlamaEnabled,
  });
  
  // Mutation for registering wallet
  const registerMutation = useMutation({
    mutationFn: (wallet: string) => xlamaApi.registerWallet(wallet),
  });
  
  // Mutation for syncing transactions  
  const syncMutation = useMutation({
    mutationFn: (wallet: string) => xlamaApi.syncTransactions(wallet, 'all'),
  });
  
  // Auto-register on first xLama enable
  useEffect(() => {
    if (isXlamaEnabled && activeAddress && !walletStatus?.isRegistered) {
      registerMutation.mutate(activeAddress);
    }
  }, [isXlamaEnabled, activeAddress]);
  
  return {
    isRegistered: walletStatus?.isRegistered ?? false,
    isSyncing: syncMutation.isPending,
    lastSyncedAt: walletStatus?.lastSyncedAt,
    syncTransactions: () => syncMutation.mutate(activeAddress!),
    registerWallet: () => registerMutation.mutate(activeAddress!),
  };
}
```

---

## Implementation Order

| Step | Task | Files |
|------|------|-------|
| 1 | Add DataSourceToggle to Portfolio | `src/pages/Portfolio.tsx` |
| 2 | Add DataSourceToggle to Analytics | `src/pages/Analytics.tsx` |
| 3 | Add DataSourceToggle to History | `src/pages/History.tsx` |
| 4 | Extend xlamaApi with wallet methods | `src/services/xlamaApi.ts` |
| 5 | Create useXlamaWalletSync hook | `src/hooks/useXlamaWalletSync.ts` |
| 6 | Add sync status UI to pages | All three pages |
| 7 | Test wallet registration | Manual test |
| 8 | Test transaction sync | Manual test |

---

## Testing Checklist

After implementation:

1. **Toggle Visibility**
   - [ ] DataSourceToggle appears on Portfolio page
   - [ ] DataSourceToggle appears on Analytics page
   - [ ] DataSourceToggle appears on History page
   - [ ] Can switch between Hybrid/OKX/Zerion/xLama sources

2. **Wallet Sync**
   - [ ] Wallet auto-registers when xLama enabled
   - [ ] Manual sync button works
   - [ ] Sync status displays correctly
   - [ ] Error states handled gracefully

3. **Data Display**
   - [ ] xLama portfolio data displays when enabled
   - [ ] xLama analytics data displays when enabled
   - [ ] xLama transactions display in History

4. **Your Wallet (ending 662)**
   - [ ] Register wallet via API
   - [ ] Sync historical transactions
   - [ ] Verify data appears in pages
