

# Mobile Improvements & Desktop Restructuring Plan

## Issue Analysis: Perpetuals Swipe Gestures "Hidden"

After investigation, I found that the swipe gesture implementation is **correct and working**. The "hidden" behavior occurs because:

1. **Swipe gestures only apply when connected** - The `MobileTradingUI` component (lines 401-577 in Perpetuals.tsx) containing the tab content with `swipeHandlers` is only rendered when the wallet is connected
2. **When disconnected**, users see the "Connect Your Wallet" card with feature previews - no tabs exist to swipe between
3. This is **intended behavior** - you can't swipe between trading tabs when you're not in trading mode

**No bug fix needed** - The current behavior is correct. The swipe gesture area is tied to the tab content which only appears when connected.

---

## Phase 1: Mobile UX Enhancements

### 1.1 Visual Swipe Indicator for Perpetuals
Add a subtle hint to show users that tabs are swipeable when connected:
- Add a small "Swipe to navigate" tooltip on first visit
- Store in localStorage after dismissed
- Optional: Add dot indicators between tabs

### 1.2 Extend Swipe Gestures to History Page
The History page has tabs (All, Instant, DEX, Bridge, On-chain) but no swipe support.

**Files to modify:**
- `src/pages/History.tsx`
  - Import `useSwipeGesture` and `useHapticFeedback`
  - Add tab order array: `['all', 'instant', 'dex', 'bridge', 'onchain']`
  - Wrap TabsContent area with swipe handlers
  - Add haptic feedback on swipe

### 1.3 Analytics Page Swipe Gestures
Add swipe navigation to Analytics page sections if it has tabs.

### 1.4 Mobile Navigation Refinements
- Add subtle animation to active tab indicator
- Consider swipe-to-dismiss for bottom sheets on Index page
- Ensure all FABs are consistently positioned

### 1.5 Mobile-Optimized Token Selectors
- Ensure all token search inputs prevent keyboard auto-open
- Add recent tokens quick-select chips
- Improve virtual scrolling for large token lists

---

## Phase 2: Desktop Restructuring

### 2.1 ExchangeWidget Refactoring (1449 lines - Too Large)

**Current Issues:**
- Single file handles Instant, DEX, and limit order modes
- Contains too much business logic alongside UI
- Makes testing and maintenance difficult

**Proposed Structure:**
```
src/components/exchange/
├── ExchangeWidget.tsx          # Main orchestrator (lean ~300 lines)
├── modes/
│   ├── InstantSwapMode.tsx     # ChangeNOW integration
│   ├── DexSwapMode.tsx         # OKX DEX integration
│   └── LimitOrderMode.tsx      # Limit order UI
├── shared/
│   ├── TokenInputPanel.tsx     # From/To token inputs
│   ├── SwapActionButton.tsx    # Main action button
│   ├── RateDisplay.tsx         # Rate and price impact
│   └── SwapProgress.tsx        # Transaction progress
└── hooks/
    ├── useExchangeState.ts     # Centralized state management
    └── useSwapExecution.ts     # Swap logic abstraction
```

### 2.2 Perpetuals.tsx Refactoring (1001 lines)

**Proposed Structure:**
```
src/pages/Perpetuals/
├── index.tsx                   # Main page (lean router)
├── PerpetualsConnected.tsx     # Connected trading UI
├── PerpetualsDisconnected.tsx  # Connect wallet prompts
├── MobilePerpetualsUI.tsx      # Mobile-specific layout
├── DesktopPerpetualsUI.tsx     # Desktop-specific layout
└── hooks/
    └── usePerpetualsState.ts   # Centralized state
```

### 2.3 Analytics.tsx Refactoring (1258 lines)

**Proposed Structure:**
```
src/pages/Analytics/
├── index.tsx                   # Main page
├── sections/
│   ├── VolumeSection.tsx
│   ├── PerformanceSection.tsx
│   ├── ChainDistribution.tsx
│   └── TradingPatterns.tsx
└── hooks/
    └── useAnalyticsData.ts
```

### 2.4 History.tsx Refactoring (1217 lines)

**Proposed Structure:**
```
src/pages/History/
├── index.tsx
├── tabs/
│   ├── AllHistoryTab.tsx
│   ├── InstantHistoryTab.tsx
│   ├── DexHistoryTab.tsx
│   ├── BridgeHistoryTab.tsx
│   └── OnChainHistoryTab.tsx
├── components/
│   ├── TransactionCard.tsx
│   ├── HistoryFilters.tsx
│   └── Pagination.tsx
└── hooks/
    └── useHistoryData.ts
```

---

## Phase 3: Component Library Improvements

### 3.1 Create Reusable Tab Components
```tsx
// SwipeableTabs component
<SwipeableTabs 
  tabs={['Chart', 'Trade', 'Positions']} 
  onSwipe={(direction, newIndex) => ...}
  hapticFeedback
/>
```

### 3.2 Unified Mobile Layout Components
- `MobilePageHeader` - Consistent page titles
- `MobileContentArea` - Swipe-aware content wrapper
- `MobileTabBar` - Swipeable tab navigation

### 3.3 Desktop Layout Components
- `TwoColumnLayout` - For trading pages (chart + sidebar)
- `DashboardGrid` - For analytics/portfolio
- `FullWidthSection` - For data tables

---

## Phase 4: Performance Optimizations

### 4.1 Code Splitting Improvements
- Split large pages into route-level chunks
- Lazy load charts and heavy visualizations
- Preload next likely routes on hover

### 4.2 State Management
- Consider Zustand for complex page state
- Reduce prop drilling in deep component trees
- Implement optimistic updates for orders

### 4.3 Bundle Analysis
- Run rollup-plugin-visualizer
- Identify large dependencies
- Consider lighter chart libraries

---

## Implementation Priority

### Immediate (This Session) ✅ COMPLETED
1. ✅ Add swipe gestures to History page tabs
2. ✅ Add DCA "Execute This Interval" button

### Short Term (Next 2-3 Sessions)
3. ✅ Create SwipeableTabs reusable component
4. Start ExchangeWidget refactoring (split modes)
5. ✅ Add visual swipe indicator for new users

### Medium Term (Code Quality)
6. Refactor Perpetuals page structure
7. Refactor Analytics page structure
8. Refactor History page structure

### Long Term (Architecture)
9. Implement unified state management
10. Create comprehensive component library
11. Add E2E tests for critical flows

---

## Technical Notes

### Files Requiring Attention
| File | Lines | Priority | Reason |
|------|-------|----------|--------|
| ExchangeWidget.tsx | 1449 | High | Core feature, too large |
| Analytics.tsx | 1258 | Medium | Can be split into sections |
| History.tsx | 1217 | Medium | Tab-based, good refactor candidate |
| Perpetuals.tsx | 1001 | Medium | Already well-organized |
| Portfolio.tsx | 659 | Low | Reasonable size |

### Dependencies Between Tasks
- SwipeableTabs component should be created before adding to more pages
- ExchangeWidget refactor should happen before adding new features
- Mobile layout components should be extracted before more pages are created

### Testing Strategy
- Add unit tests for hooks during refactor
- Add integration tests for swap flows
- Use Playwright for E2E mobile testing

