
# xLama API Testing & Data Migration Plan

## Status: Phases 1-4 Complete ✅

---

## Issues Identified

### 1. ~~DataSourceToggle Not Visible~~ ✅ FIXED
The `DataSourceToggle` component now renders on Portfolio, Analytics, and History pages.

### 2. ~~Wallet Not Registered~~ ✅ FIXED
Added `registerWallet`, `syncTransactions`, and `getWalletStatus` methods to xlamaApi service. Auto-registration triggers when xLama source is enabled.

### 3. ~~No Transaction Sync~~ ✅ FIXED
The `syncTransactions` endpoint is now called automatically after wallet registration and can be triggered manually via the XlamaSyncStatus component.

### 4. No Real-time Webhook (Phase 5 - TODO)
Swaps performed on xlamaexchange.com need to be pushed to the xLama backend via webhook subscription.

---

## Completed Implementation

### Phase 1: DataSourceToggle Added to Pages ✅
- `src/pages/Portfolio.tsx` - Toggle in controls row after refresh button
- `src/pages/Analytics.tsx` - Toggle near refresh button in header
- `src/pages/History.tsx` - Toggle in header controls area

### Phase 2: xlamaApi Service Extended ✅
**New methods in `src/services/xlamaApi.ts`:**
- `registerWallet(wallet, label?)` → POST /wallets
- `syncTransactions(wallet, source?)` → POST /sync-transactions
- `listWallets()` → GET /wallets
- `getWalletStatus(wallet)` → GET /wallets/:address

**New types:**
- `WalletInfo` - Wallet registration info including last_synced_at
- `WalletStatusResponse` - Response from getWalletStatus
- `SyncResponse` - Response from syncTransactions

### Phase 3: Wallet Sync Hook Created ✅
**New file: `src/hooks/useXlamaWalletSync.ts`**
- Auto-register wallet when xLama source is enabled (first time only)
- Trigger transaction sync after registration
- Track sync status (pending/syncing/synced/error)
- Support manual re-sync via mutation

### Phase 4: Sync Status UI Added ✅
**New component: `src/components/XlamaSyncStatus.tsx`**
- Shows sync status badge when xLama is enabled
- Compact mode for toolbar display
- Full mode with "Sync" button
- Handles error states gracefully

---

## Phase 5: Webhook Configuration (TODO)

To receive real-time swap events from xlamaexchange.com:

**Webhook Subscription:**
```json
POST /subscribe-webhook
{
  "url": "https://your-edge-function/xlama-webhook",
  "events": ["transaction.new", "swap.completed", "bridge.completed"],
  "secret": "your-webhook-secret"
}
```

**Edge Function Handler:**
```typescript
// supabase/functions/xlama-webhook/index.ts
// 1. Verify webhook signature
// 2. Insert transaction into cache
// 3. Invalidate React Query cache via realtime
```

---

## Testing Checklist

### Toggle Visibility ✅
- [x] DataSourceToggle appears on Portfolio page
- [x] DataSourceToggle appears on Analytics page
- [x] DataSourceToggle appears on History page
- [x] Can switch between Hybrid/OKX/Zerion/xLama sources

### Wallet Sync
- [ ] Wallet auto-registers when xLama enabled
- [ ] Manual sync button works
- [ ] Sync status displays correctly
- [ ] Error states handled gracefully

### Data Display
- [ ] xLama portfolio data displays when enabled
- [ ] xLama analytics data displays when enabled
- [ ] xLama transactions display in History

### User Wallet Testing
- [ ] Register wallet via API
- [ ] Sync historical transactions
- [ ] Verify data appears in pages
