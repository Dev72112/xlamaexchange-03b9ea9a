

# Backend Integration Polish Plan (v2.8.0)

## Problem Summary

Based on API testing and code review, three main issues are causing the "0 -> 0" and "Unknown" token displays:

| Issue | Root Cause | Impact |
|-------|-----------|--------|
| Registration Status Wrong | `/wallets/{address}` returns ALL wallets, not filtered | Shows "Not Registered" incorrectly |
| Transaction History Empty | `fetch-transactions` API times out | Falls back to OKX with broken conversion |
| OKX Fallback Broken | Conversion logic sets only one token (in OR out), not both | "0 -> 0" and "??" symbols |

## Solution Overview

Replace the unreliable external API calls with local Supabase database queries for transaction history, while keeping the working analytics API.

```text
Current Flow (Broken):
  XlamaHistoryTab -> useXlamaTransactions -> xLama API (timeout) -> OKX fallback (broken)

Fixed Flow:
  XlamaHistoryTab -> useLocalDexTransactions -> Local Supabase (fast, accurate)
```

---

## Phase 1: Fix Registration Status Detection

### File: `src/hooks/useXlamaWalletSync.ts`

**Problem**: `getWalletStatus(address)` returns all wallets, not filtered by address.

**Fix**: Filter the response to find the specific wallet.

```tsx
// Current broken implementation
getWalletStatus: async (wallet: string) => {
  const response = await fetchFromProxy(`wallets/${wallet}`);
  return { success: true, wallet: response.wallet };
}

// Fixed implementation
getWalletStatus: async (wallet: string) => {
  const response = await fetchFromProxy('wallets');
  const found = response.wallets?.find(
    w => w.wallet_address.toLowerCase() === wallet.toLowerCase()
  );
  return { 
    success: !!found, 
    wallet: found || null 
  };
}
```

Also handle 409 conflict as successful registration in the mutation error handler.

---

## Phase 2: Use Local Database for Transaction History

### New Hook: `src/hooks/useLocalDexHistory.ts`

Create a new hook that queries the local `dex_transactions` table directly:

```tsx
export function useLocalDexHistory(options: { enabled?: boolean; limit?: number } = {}) {
  const { activeAddress } = useMultiWallet();
  
  return useQuery({
    queryKey: ['local-dex-history', activeAddress],
    queryFn: async () => {
      const client = createWalletClient(activeAddress!);
      const { data } = await client
        .from('dex_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(options.limit ?? 100);
      return data ?? [];
    },
    enabled: !!activeAddress && options.enabled !== false,
  });
}
```

### File: `src/components/history/tabs/XlamaHistoryTab.tsx`

**Change**: Replace `useXlamaTransactions` with `useLocalDexHistory`.

Benefits:
- Instant response (local database)
- Accurate token symbols, amounts, logos
- Already has chain info and explorer URLs
- No external API dependencies

---

## Phase 3: Fix OKX Fallback (For Portfolio/Other Uses)

### File: `src/hooks/useXlamaTransactions.ts`

Fix `convertOkxToXlamaTransaction` to properly handle swap transactions:

```tsx
function convertOkxToXlamaTransaction(tx: TransactionHistoryItem, wallet: string): XlamaTransaction {
  // For contract interactions (swaps), we need both token_in and token_out
  // OKX tx history only gives us one side per record
  // Mark these as incomplete for UI to handle
  
  const isContract = tx.methodId && tx.methodId !== '0x';
  const isOutgoing = tx.from[0]?.address?.toLowerCase() === wallet.toLowerCase();
  
  return {
    tx_hash: tx.txHash,
    wallet_address: wallet,
    chain_id: tx.chainIndex,
    chain_name: getChainName(tx.chainIndex),
    transaction_type: isContract ? 'swap' : 'transfer',
    token_in: {
      address: tx.tokenContractAddress || '',
      symbol: tx.symbol || 'Unknown',
      name: tx.symbol || 'Unknown',
      logo: null,
      decimals: 18,
      amount: isOutgoing ? tx.amount : '0',
      amount_usd: 0,
    },
    token_out: {
      address: '',
      symbol: isContract ? 'Swap' : (isOutgoing ? '' : tx.symbol || ''),
      name: '',
      logo: null,
      decimals: 18,
      amount: isOutgoing ? '0' : tx.amount,
      amount_usd: 0,
    },
    // ... rest
  };
}
```

---

## Phase 4: Improve XlamaSyncStatus Display

### File: `src/components/XlamaSyncStatus.tsx`

Update to properly detect registration from the wallet list:

```tsx
// The hook already handles this, but improve the loading state
if (isStatusLoading) {
  return {
    icon: Loader2,
    label: 'Checking...',
    variant: 'secondary',
    animate: true,
  };
}
```

---

## Phase 5: Add Missing Analytics Features

### File: `src/components/analytics/tabs/XlamaAnalyticsTab.tsx`

The admin dashboard shows metrics that aren't displayed in the frontend. Add:

1. **Unrealized PnL Card** (currently shows $0)
2. **Total Fees Card** (already in data, add dedicated card)
3. **Data Quality Indicator** (show confidence percentage)

```tsx
<StatCard
  icon={Info}
  label="Data Quality"
  value={`${analytics.dataQuality?.confidence_pct ?? 100}%`}
  subValue={`${analytics.dataQuality?.priced_trades ?? 0} priced trades`}
  variant="default"
/>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/services/xlamaApi.ts` | Fix `getWalletStatus` to filter wallet list |
| `src/hooks/useXlamaWalletSync.ts` | Handle 409 as success, improve status detection |
| `src/hooks/useLocalDexHistory.ts` | New - query local dex_transactions table |
| `src/components/history/tabs/XlamaHistoryTab.tsx` | Use local DB instead of xLama API |
| `src/hooks/useXlamaTransactions.ts` | Fix OKX fallback conversion logic |
| `src/components/analytics/tabs/XlamaAnalyticsTab.tsx` | Add data quality indicator |
| `src/pages/Changelog.tsx` | Add v2.8.0 entry |

---

## Data Flow After Fix

```text
Analytics Tab (Working):
  XlamaAnalyticsTab 
    -> useXlamaAnalytics 
    -> xlama-api/trading-analytics (works great!)
    -> Display rich metrics

History Tab (Fixed):
  XlamaHistoryTab 
    -> useLocalDexHistory 
    -> Supabase dex_transactions table
    -> Display with proper symbols, amounts, logos

Sync Status (Fixed):
  XlamaSyncStatus
    -> useXlamaWalletSync
    -> xlama-api/wallets (filter by address)
    -> Show correct registration status
```

---

## Expected Outcomes

| Issue | Before | After |
|-------|--------|-------|
| Registration badge | "Registration Failed" | "Synced 2 hours ago" |
| Transaction amounts | "0 -> 0" | "0.000666 OKB -> 100.55 NIUMA" |
| Token symbols | "Unknown" | Correct symbols (OKB, NIUMA, USDG) |
| Token logos | "??" fallback | Proper logos from local DB |
| History load time | Timeout/slow | Instant (local query) |

---

## Changelog Entry

```tsx
{
  version: "2.8.0",
  date: "2026-02-XX",
  title: "Backend Integration Polish",
  description: "Fixed xLama History tab data display and registration status detection.",
  type: "minor",
  changes: [
    { category: "fix", text: "Fixed wallet registration status showing 'Registration Failed'" },
    { category: "fix", text: "Fixed transaction history showing '0 -> 0' amounts" },
    { category: "fix", text: "Fixed 'Unknown' token symbols in history" },
    { category: "improvement", text: "History now loads from local database (instant)" },
    { category: "improvement", text: "Added data quality indicator to Analytics" },
    { category: "improvement", text: "Improved sync status detection for registered wallets" },
  ],
}
```

---

## Technical Notes

### Why Use Local DB for History?

1. **Reliability**: External API times out frequently
2. **Speed**: Local query is instant vs 5+ second timeout
3. **Data Quality**: Local DB has correct symbols, logos, amounts
4. **Already Available**: We're already saving swaps to `dex_transactions`

### Why Keep xLama API for Analytics?

1. **Works Perfectly**: `trading-analytics` endpoint is fast and reliable
2. **Rich Data**: Provides PnL, pair analysis, chain distribution
3. **Aggregated Metrics**: Backend does the heavy computation

