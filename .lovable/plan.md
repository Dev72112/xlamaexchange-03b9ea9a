
# xLama Comprehensive Development Plan

## Current State Analysis

Based on my thorough codebase scan, here's what I found:

### Recent Completions
- App-like layout system implemented (`AppLayout` + `AppHeader`)
- All major pages converted to AppLayout (Swap, Bridge, Orders, Portfolio, Analytics, History, Perpetuals, Tools, TokenCompare)
- Orders FAB added for mobile quick order creation
- Bottom sheets implemented for mobile on Swap page
- Swipe gestures added to Perpetuals mobile tabs
- Portfolio "All EVM" fix in `okxdex.ts` to aggregate multi-chain responses
- TokenCompare added to MobileBottomNav
- Real-time order updates with Supabase subscriptions

### Architecture Overview
- 21 pages, 80+ components, 60+ hooks
- Multi-chain wallet support (EVM, Solana, Tron, Sui, TON)
- OKX DEX API for swaps, market data, and wallet analytics
- Hyperliquid integration for perpetuals trading
- Supabase backend with Lovable Cloud (limit orders, DCA orders, feedback, referrals)
- Li.Fi for cross-chain bridges

---

## Phase 1: Critical Bug Fixes & UX Polish

### 1.1 Home Page Stats Accuracy
**Issue**: `Home.tsx` line 60 shows "0% Platform Fees" which is misleading given the 1.5% commission on DEX swaps.

**Fix**: Update to "Low Fees" or "1.5% Commission" for transparency.

### 1.2 Security Warnings (RLS)
**Issue**: Linter found "RLS Policy Always True" warning indicating overly permissive policies.

**Action**: Review and tighten RLS policies for:
- `anonymous_feedback` table (likely intentional for public feedback)
- Any other tables with `USING (true)` on UPDATE/DELETE/INSERT

### 1.3 TODO Items in Code
Found 3 active TODOs:
1. **TON Transaction Status** (`useDexSwapMulti.ts:769`): Integrate TON Center API for swap status checks
2. **Referral Commission** (`ExchangeWidget.tsx:660`): Re-enable when Li.Fi fee collection resumes
3. **Candlestick Chart Colors** (`CandlestickChart.tsx:73`): Minor styling constant

### 1.4 Keyboard Auto-Open Prevention
**Completed**: Fixed in `DexTokenSelector.tsx`
**Need to Check**: Other search inputs across the app (GlobalSearch, token selectors in orders)

---

## Phase 2: Backend Service Integration Prep

### 2.1 Order Execution Architecture
**Current State**: 
- `execute-orders` edge function checks prices and marks orders as "triggered"
- DCA orders update `next_execution` but can't auto-execute (needs wallet signature)

**User's Note**: User mentioned they'll provide a document for backend service integration.

**Prep Work**:
- Document current order flow
- Identify required API endpoints
- Prepare webhook handlers for order execution callbacks

### 2.2 Database Schema Ready
Current tables support the feature set:
- `limit_orders` with status tracking, trigger expiration
- `dca_orders` with frequency, intervals, execution tracking
- `bridge_intents` for bridge transaction tracking
- `trade_commissions` for referral system
- Real-time subscriptions enabled

---

## Phase 3: Feature Completions

### 3.1 Limit Order Execution Flow
**Current**: Orders get marked as "triggered" but require user to manually execute
**Enhancement**: 
- Add prominent "Execute Now" button for triggered orders
- Show countdown timer for trigger expiration (24 hours)
- Push notification when order triggers (already implemented)

### 3.2 DCA Execution Improvements
**Current**: DCA orders show "Manual execution required"
**Enhancement**:
- Add "Execute This Interval" button for due DCA orders
- Show next execution countdown
- Track execution history per interval

### 3.3 Portfolio All EVM Verification
**Recent Fix**: Updated `okxdex.ts` to aggregate multi-chain balance responses
**Testing Needed**: Verify with connected wallet that All EVM shows balances from all chains

---

## Phase 4: Mobile Experience Refinement

### 4.1 Swipe Gestures
- Perpetuals: Implemented (Chart, Trade, Positions, Orders tabs)
- Consider adding to: History page tabs, Analytics sections

### 4.2 FAB Improvements
- Orders FAB: Implemented (scrolls to quick actions)
- Consider: Portfolio FAB for quick swap/bridge
- Consider: Analytics FAB for export

### 4.3 Pull-to-Refresh Alternative
Current implementation may conflict with scrolling. Consider:
- Header refresh button (already added to most pages)
- Manual refresh indicator in content area

---

## Phase 5: Performance & Code Quality

### 5.1 Bundle Optimization
- Already using lazy loading for heavy components
- Route-level code splitting in place
- Consider: Analyze bundle with `rollup-plugin-visualizer`

### 5.2 Query Optimization
- UnifiedDataContext provides centralized cache invalidation
- React Query for data fetching
- Consider: Implement stale-while-revalidate for portfolio data

### 5.3 Error Boundaries
- ErrorBoundary component exists
- Verify coverage across all major features

---

## Phase 6: Content & SEO

### 6.1 Page Review Status
| Page | Layout | Status |
|------|--------|--------|
| Home | Layout | Good (landing page) |
| Swap (Index) | AppLayout | Good |
| Bridge | AppLayout | Good |
| Orders | AppLayout | Good |
| Portfolio | AppLayout | Needs All EVM testing |
| Analytics | AppLayout | Good |
| History | AppLayout | Good |
| Perpetuals | AppLayout | Good |
| Tools | AppLayout | Good |
| TokenCompare | AppLayout | Good |
| FAQ | Layout | Could convert to AppLayout |
| Docs | Layout | Good (info page) |
| About | Layout | Good (info page) |

### 6.2 Content Accuracy Verified
- FAQ content is accurate (25+ chains, 400+ DEXs, fee info)
- Docs has comprehensive chain list
- All partner logos and links current

---

## Implementation Priority Order

### Immediate (This Session)
1. Fix Home page "0% Platform Fees" stat
2. Review RLS policies for security warnings
3. Add keyboard prevention to remaining search inputs

### Short-Term (Next 1-2 Sessions)
4. Complete limit order execution UX (Execute Now button)
5. Test Portfolio All EVM with connected wallet
6. Add haptic feedback to swipe gestures

### Medium-Term (Backend Integration)
7. Await user's backend service documentation
8. Implement order execution webhooks
9. Add push notification triggers for order events

### Polish (Ongoing)
10. Bundle analysis and optimization
11. Analytics page data accuracy
12. Edge case handling for multi-chain swaps

---

## Technical Debt Notes

### Code Quality
- Some files are large (ExchangeWidget.tsx ~1400 lines) - consider splitting
- Good use of memoization and lazy loading
- Consistent patterns across hooks

### Security
- Signature verification in place for orders (multi-chain support)
- Wallet-authenticated Supabase clients
- Rate limiting on edge functions
- Review needed: RLS policies flagged by linter

### Testing
- No test files detected in hooks/components
- Consider: Adding tests for critical paths (order creation, swap execution)

---

## Questions for Clarification

Before proceeding, I'd like to confirm:

1. **Backend Integration**: Should I prepare any specific webhook handlers or API endpoint structures while waiting for your backend service documentation?

2. **Order Execution**: For the "Execute Now" functionality on triggered orders, should this open the swap flow with pre-filled values, or do you want a different UX?

3. **Analytics Data Source**: The Analytics page currently shows trade analytics from local transaction history. Do you want this to pull from OKX Wallet API transaction history instead for more accuracy?

4. **Home Page Stats**: Should I change "0% Platform Fees" to:
   - "1.5% Commission" (transparent)
   - "Low Trading Fees" (vague but accurate)
   - "No Hidden Fees" (emphasizes transparency)

