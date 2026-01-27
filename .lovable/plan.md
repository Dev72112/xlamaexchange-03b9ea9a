
# Next Phase Implementation Plan

## Overview
This plan covers the next batch of refactoring and improvement tasks, building on the progress already made. The focus is on:
1. **Integrating** the new `UnifiedTransactionCard` component into History.tsx
2. **Extracting** mode-specific components from ExchangeWidget
3. **Refactoring** Perpetuals page structure

---

## Task 1: Integrate UnifiedTransactionCard into History.tsx

**Goal**: Replace the inline transaction card rendering in the "All" tab with the new `UnifiedTransactionCard` component to reduce code duplication (~100 lines saved).

**Changes**:
- Import `UnifiedTransactionCard` from `@/components/history`
- Replace lines 594-694 (the inline card rendering in the "All" tab) with the component
- The component already matches the expected interface (`UnifiedTransaction` type)

**Files to modify**:
- `src/pages/History.tsx`

---

## Task 2: Extract InstantSwapMode Component

**Goal**: Extract the instant swap logic from ExchangeWidget into a dedicated component.

**New file structure**:
```
src/components/exchange/modes/
├── InstantSwapMode.tsx    # ChangeNOW integration UI
└── index.ts               # Barrel export
```

**What InstantSwapMode will contain**:
- Currency selectors for from/to
- Amount inputs
- Rate type toggle (fixed/floating)
- Exchange rate display
- Min amount validation
- "Convert" button logic
- Calls back to parent for form submission

**Props interface**:
```typescript
interface InstantSwapModeProps {
  currencies: Currency[];
  currenciesLoading: boolean;
  fromCurrency: Currency;
  toCurrency: Currency;
  onFromCurrencyChange: (c: Currency) => void;
  onToCurrencyChange: (c: Currency) => void;
  fromAmount: string;
  toAmount: string;
  onFromAmountChange: (amount: string) => void;
  exchangeRate: number | null;
  rateType: 'standard' | 'fixed';
  onRateTypeChange: (type: 'standard' | 'fixed') => void;
  minAmount: number;
  isLoading: boolean;
  pairError: string | null;
  pairUnavailable: boolean;
  isPairFavorite: boolean;
  onToggleFavorite: () => void;
  onSwapCurrencies: () => void;
  onSubmit: () => void;
  lastUpdated: Date | null;
  autoRefreshCountdown: number;
  onRefresh: () => void;
}
```

---

## Task 3: Extract DexSwapMode Component

**Goal**: Extract the DEX swap logic from ExchangeWidget into a dedicated component.

**New file**:
- `src/components/exchange/modes/DexSwapMode.tsx`

**What DexSwapMode will contain**:
- DEX token selectors
- Chain selector integration
- Slippage settings display
- Quote info display
- Balance display with MAX button
- USD value display
- Price impact warnings
- "Swap" button with wallet state logic
- Review modal trigger

**Props interface**:
```typescript
interface DexSwapModeProps {
  selectedChain: Chain;
  tokens: OkxToken[];
  nativeToken: OkxToken | null;
  tokensLoading: boolean;
  fromToken: OkxToken | null;
  toToken: OkxToken | null;
  onFromTokenChange: (token: OkxToken | null) => void;
  onToTokenChange: (token: OkxToken | null) => void;
  fromAmount: string;
  onFromAmountChange: (amount: string) => void;
  outputAmount: string;
  fromTokenBalance: string | null;
  balanceLoading: boolean;
  hasInsufficientBalance: boolean;
  slippage: string;
  quote: DexQuote | null;
  quoteLoading: boolean;
  quoteError: string | null;
  fromUsdValue: string | null;
  toUsdValue: string | null;
  exchangeRate: number | null;
  isConnected: boolean;
  isOnCorrectChain: boolean;
  swapLoading: boolean;
  onMaxClick: () => void;
  onSwapTokens: () => void;
  onSubmit: () => void;
  onRefresh: () => void;
  lastUpdated: Date | null;
}
```

---

## Task 4: Refactor Perpetuals Page Structure

**Goal**: Split the 1005-line Perpetuals.tsx into smaller, focused components.

**New file structure**:
```
src/pages/Perpetuals/
├── index.tsx                    # Main page (~150 lines)
├── components/
│   ├── MobileTradingUI.tsx      # Mobile layout with tabs
│   ├── DesktopTradingUI.tsx     # Desktop two-column layout
│   ├── DisconnectedState.tsx    # Connect wallet prompt
│   ├── AccountStatsRow.tsx      # Equity, margin, PnL display
│   └── index.ts
└── hooks/
    ├── usePerpetualsState.ts    # Centralized state management
    └── index.ts
```

**MobileTradingUI** (~200 lines):
- Market selector
- Account stats horizontal scroll
- Tabs with swipe gestures (Chart, Trade, Positions, Orders)
- Tab content rendering

**DesktopTradingUI** (~150 lines):
- Two-column layout (chart + sidebar)
- Orderbook panel
- Position manager

**DisconnectedState** (~80 lines):
- Connect wallet card
- Feature preview list
- How it works collapsible

**usePerpetualsState hook**:
- Selected pair state
- Active tab state
- Modal visibility states
- Pending order state
- Price calculations
- Trade handlers

---

## Task 5: Update Plan Tracking

Update `.lovable/plan.md` to reflect completed tasks and next priorities.

---

## Implementation Order

1. **Task 1** - Quick win, integrates existing component
2. **Task 2 & 3** - Can be done in parallel, extract mode components
3. **Task 4** - Larger refactor, depends on mode extraction patterns
4. **Task 5** - Update tracking document

---

## Expected Outcomes

| File | Current Lines | After Refactor |
|------|---------------|----------------|
| History.tsx | 1250 | ~1150 |
| ExchangeWidget.tsx | 1449 | ~800 |
| Perpetuals.tsx | 1005 | ~200 |

---

## Technical Notes

- All new components use React.memo for performance
- Barrel exports for clean imports
- Props interfaces follow existing patterns
- Error boundaries preserved where needed
- Swipe gestures and haptic feedback maintained in mobile components
