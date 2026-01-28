

# xLama Backend Integration & Zerion Removal Plan

## Overview

This plan addresses three key improvements:
1. **Webhook Integration**: Create a webhook endpoint to notify the xLama backend when swaps complete
2. **Fix Wallet Sync Error**: Improve error handling in `useXlamaWalletSync` to not show "Sync Error" when wallet is already registered
3. **Remove Zerion Integration**: Completely remove Zerion from the codebase (service, edge function, hooks, components)

---

## Part 1: Webhook Integration for Swap Completion

### Current State
When a swap completes in `useDexSwap.ts`, it:
- Updates local transaction context
- Sends notification via `notificationService`
- Tracks analytics via `trackSwapCompleted`

**Missing**: No webhook call to notify the xLama backend for real-time sync.

### Solution
Create a webhook service that POSTs to the xLama backend whenever a swap completes.

### New File: `src/services/xlamaWebhook.ts`

```typescript
// Webhook service for notifying xLama backend of completed swaps
const XLAMA_WEBHOOK_URL = 'https://ciandnwvnweoyoutaysb.supabase.co/functions/v1/webhook';

interface SwapWebhookPayload {
  event: 'swap.completed';
  source: 'xlamaexchange';
  data: {
    tx_hash: string;
    wallet_address: string;
    chain_id: string;
    token_in_symbol: string;
    token_in_amount: string;
    token_in_usd_value: number;
    token_out_symbol: string;
    token_out_amount: string;
    token_out_usd_value: number;
    gas_fee: string;
    gas_fee_usd: number;
    slippage: string;
    status: 'completed';
  };
}

export async function sendSwapWebhook(payload: SwapWebhookPayload): Promise<boolean> {
  try {
    const apiKey = await getApiKey(); // From edge function proxy
    const response = await fetch(XLAMA_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });
    
    return response.ok;
  } catch (error) {
    console.error('[xLama Webhook] Failed to send swap notification:', error);
    return false;
  }
}
```

### Modify: `src/hooks/useDexSwap.ts`

Add webhook call after successful swap completion (line 266-278):

```typescript
// After swap completion tracking
await sendSwapWebhook({
  event: 'swap.completed',
  source: 'xlamaexchange',
  data: {
    tx_hash: hash,
    wallet_address: address,
    chain_id: chain.chainIndex,
    token_in_symbol: fromToken.tokenSymbol,
    token_in_amount: amount,
    token_in_usd_value: swapData.routerResult?.fromTokenUnitPrice * parseFloat(amount) || 0,
    token_out_symbol: toToken.tokenSymbol,
    token_out_amount: toAmount,
    token_out_usd_value: toAmountUsd,
    gas_fee: gasUsed,
    gas_fee_usd: gasUsd,
    slippage,
    status: 'completed',
  },
});
```

### API Key Handling

The webhook call requires the `XLAMA_API_KEY`. Since this secret is already configured and available in edge functions, we have two options:

**Option A: Direct call via Edge Function Proxy** (Recommended)
- Create a new endpoint in `xlama-api` edge function for webhook forwarding
- The frontend calls our edge function, which injects the API key

**Option B: Store API key in app context** 
- Not recommended as it exposes the key to the frontend

### New Endpoint in `supabase/functions/xlama-api/index.ts`

Add a new route for webhook forwarding:

```typescript
// Handle webhook forwarding for swap.completed events
if (endpointPath === 'webhook' && req.method === 'POST') {
  const body = await req.json();
  
  // Validate payload
  if (body.event !== 'swap.completed') {
    return new Response(
      JSON.stringify({ error: 'Invalid event type' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  // Forward to xLama webhook endpoint
  const webhookUrl = 'https://ciandnwvnweoyoutaysb.supabase.co/functions/v1/webhook';
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });
  
  const data = await response.text();
  return new Response(data, {
    status: response.status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

---

## Part 2: Fix Wallet Sync Error Display

### Current Problem
The `XlamaSyncStatus` component shows "Sync Error" even when the wallet is already registered. This happens because:

1. `statusError` from the query is set when API returns an error (even 404)
2. The `getWalletStatus` in `xlamaApi.ts` catches the error but still may return error state
3. The status check logic doesn't differentiate between "not registered" vs "sync failed"

### Root Cause in `useXlamaWalletSync.ts`

```typescript
// Line 48-55 in XlamaSyncStatus.tsx
if (syncError || registerError) {
  return {
    icon: AlertCircle,
    label: 'Sync Error',
    variant: 'destructive' as const,
    animate: false,
  };
}
```

The issue: `syncError` is checked before `isRegistered`, so even a registered wallet with a temporary sync failure shows "Sync Error".

### Solution

Update `XlamaSyncStatus.tsx` to:
1. Prioritize showing registered status over transient errors
2. Only show sync error if wallet IS registered but sync actually failed
3. Add detailed error message in tooltip

```typescript
const getSyncStatus = () => {
  if (isSyncing || isRegistering) {
    return {
      icon: Loader2,
      label: isRegistering ? 'Registering...' : 'Syncing...',
      variant: 'default' as const,
      animate: true,
    };
  }
  
  // Registered wallet with last sync time - show success even if sync mutation had error
  if (isRegistered && lastSyncedAt) {
    return {
      icon: Check,
      label: `Synced ${formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })}`,
      variant: 'secondary' as const,
      animate: false,
    };
  }
  
  // Registered but never synced - show pending, not error
  if (isRegistered && !lastSyncedAt) {
    return {
      icon: Clock,
      label: 'Pending Sync',
      variant: 'secondary' as const,
      animate: false,
    };
  }
  
  // Registration error - this is a real error
  if (registerError) {
    return {
      icon: AlertCircle,
      label: 'Registration Failed',
      variant: 'destructive' as const,
      animate: false,
    };
  }
  
  // Not registered yet
  if (!isRegistered) {
    return {
      icon: Clock,
      label: 'Not Registered',
      variant: 'secondary' as const,
      animate: false,
    };
  }
  
  // Fallback
  return {
    icon: Clock,
    label: 'Pending',
    variant: 'secondary' as const,
    animate: false,
  };
};
```

Also update `useXlamaWalletSync.ts` to not show toast errors for already-registered wallets:

```typescript
// In registerMutation.onError
onError: (error: Error) => {
  // Don't show error if wallet already exists - this is expected
  if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
    // Wallet exists, just refresh status
    queryClient.invalidateQueries({ queryKey: ['xlama-wallet-status', activeAddress] });
    return;
  }
  toast.error(`Failed to register wallet: ${error.message}`);
},
```

---

## Part 3: Remove Zerion Integration Completely

### Files to Delete

| File | Description |
|------|-------------|
| `supabase/functions/zerion/index.ts` | Zerion edge function |
| `src/services/zerion.ts` | Zerion API service |
| `src/hooks/useZerionPortfolio.ts` | Zerion portfolio hook |
| `src/hooks/useZerionNFTs.ts` | Zerion NFT hook |
| `src/hooks/useZerionTransactions.ts` | Zerion transactions hook |
| `src/components/portfolio/tabs/ZerionPortfolioTab.tsx` | Zerion portfolio tab |
| `src/components/analytics/tabs/ZerionAnalyticsTab.tsx` | Zerion analytics tab |

### Files to Modify

#### 1. `src/pages/Portfolio.tsx`
Remove Zerion tab from tabs array (lines 51-64):

```typescript
// Remove this entire tab object
{
  value: 'zerion',
  label: 'Zerion',
  icon: <Layers className="w-3.5 h-3.5" />,
  content: (/* ZerionPortfolioTab */),
},
```

Change grid from 3 to 2 columns:
```typescript
listClassName="grid grid-cols-2 h-10 mb-4"
```

Update `portfolioFeatures` to remove Zerion entry.

#### 2. `src/pages/Analytics.tsx`
Remove Zerion tab from tabs array (lines 51-64).
Change grid from 3 to 2 columns.
Update `analyticsFeatures` to remove Zerion entry.

#### 3. `src/contexts/DataSourceContext.tsx`
Remove Zerion from DataSource type and toggle logic:

```typescript
export type DataSource = 'okx' | 'xlama';  // Remove 'zerion' | 'hybrid'

const value: DataSourceContextValue = {
  dataSource,
  setDataSource,
  isZerionEnabled: false,  // Always false now
  isOKXEnabled: dataSource === 'okx' || dataSource === 'xlama',
  isXlamaEnabled: dataSource === 'xlama',
  preferredSource: dataSource,
  toggleDataSource,
};
```

#### 4. `src/components/portfolio/tabs/index.ts`
Remove ZerionPortfolioTab export:

```typescript
export { OkxPortfolioTab } from './OkxPortfolioTab';
// export { ZerionPortfolioTab } from './ZerionPortfolioTab'; // REMOVE
export { XlamaPortfolioTab } from './XlamaPortfolioTab';
```

#### 5. `src/components/analytics/tabs/index.ts`
Remove ZerionAnalyticsTab export.

#### 6. `src/features/portfolio/hooks/index.ts`
Remove Zerion hook exports (lines 14-17).

#### 7. `src/features/portfolio/components/index.ts`
Remove ZerionPortfolioTab from tab exports.

#### 8. `src/features/analytics/components/index.ts`
Remove ZerionAnalyticsTab from tab exports.

#### 9. `src/hooks/useHybridPortfolio.ts`
Remove Zerion imports and usage - this hook may no longer be needed.

#### 10. `src/components/portfolio/DeFiPositions.tsx`
Remove ZerionPosition type import - use a local type or keep for other DeFi integrations.

#### 11. `src/components/portfolio/NFTGallery.tsx`
Remove UseZerionNFTsResult import - define local types.

#### 12. `src/components/ui/DataSourceToggle.tsx`
Remove Zerion option from sourceConfig.

### Delete Edge Function
Run `supabase--delete_edge_functions` for the `zerion` function.

---

## Implementation Order

| Step | Task | Files |
|------|------|-------|
| 1 | Fix sync error display logic | `XlamaSyncStatus.tsx`, `useXlamaWalletSync.ts` |
| 2 | Add webhook endpoint to edge function | `xlama-api/index.ts` |
| 3 | Create webhook service | `src/services/xlamaWebhook.ts` |
| 4 | Integrate webhook in swap flow | `useDexSwap.ts`, `useLiFiSwapExecution.ts` |
| 5 | Remove Zerion from pages | `Portfolio.tsx`, `Analytics.tsx` |
| 6 | Remove Zerion hooks & service | 5 hook files, 1 service file |
| 7 | Remove Zerion tab components | 2 tab component files |
| 8 | Update barrel exports | 4 index.ts files |
| 9 | Update DataSourceContext | `DataSourceContext.tsx` |
| 10 | Delete Zerion edge function | `supabase/functions/zerion/` |
| 11 | Cleanup dependent components | `DeFiPositions.tsx`, `NFTGallery.tsx`, `useHybridPortfolio.ts` |

---

## Benefits

1. **Real-time sync**: Swaps immediately sync to xLama backend via webhook
2. **Better UX**: No false "Sync Error" messages for registered wallets
3. **Cleaner codebase**: Removal of Zerion reduces complexity and maintenance burden
4. **Focused integration**: xLama backend now serves as the unified data layer (replacing hybrid mode)
5. **Reduced dependencies**: One less external API to manage (Zerion)

