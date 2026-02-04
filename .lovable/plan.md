
# Mobile UI Fixes & Educational Collapsibles Plan

## Overview

This plan addresses three key issues:
1. **Perpetuals "Swipe to trade" gesture** - The floating trade panel with swipe hint flashes during page load
2. **Landing page mascot image** - The image appears broken/poorly positioned on mobile
3. **Educational collapsibles** - Add "How It Works" or feature education to ALL wallet-gated pages for BOTH connected and disconnected states

---

## Part 1: Fix "Swipe to trade" Gesture Flash

### Problem Analysis

The `MobileTradePanel` component renders via `createPortal` directly to `document.body`. It appears immediately when the Perpetuals page loads (when connected + EVM). The "← Swipe to trade →" text at line 195-199 is static and always visible.

The "flash" issue happens because:
1. Page loads, MobileTradePanel renders immediately
2. Other data (markets, account) is still loading
3. The panel might briefly render then re-render when `safeMode` state changes

### Solution

Add a **delayed render** similar to the SwipeHint component to prevent the panel from appearing until the page has stabilized:

**File: `src/components/perpetuals/MobileTradePanel.tsx`**

1. Add initialization delay (1.5-2 seconds after mount)
2. Only render the portal after the delay completes
3. Optionally add a fade-in animation for smoother appearance

```typescript
// Add state for delayed render
const [isReady, setIsReady] = useState(false);
const mountedRef = useRef(false);

useEffect(() => {
  if (mountedRef.current) return;
  mountedRef.current = true;
  
  const timer = setTimeout(() => {
    setIsReady(true);
  }, 1500); // 1.5s delay to let page stabilize
  
  return () => clearTimeout(timer);
}, []);

// Early return if not ready
if (!canUseDOM || !isReady) return null;
```

---

## Part 2: Fix Landing Page Mascot Image

### Problem Analysis

Looking at the user's screenshot, the mascot image on the landing page appears broken - likely showing as a small/cropped circle with just the glow rings visible.

Current implementation in `HeroSection.tsx` (lines 102-110):
- Image has `w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16` sizing
- Has `ring-2 ring-primary/40` border
- Image src is correctly imported from `@/assets/xlama-mascot.png`

The image file exists and is a full llama mascot PNG. The issue is likely:
1. The small sizing (48-64px) crops most of the mascot
2. The outer glow divs may be interfering
3. `object-fit` may not be applied properly

### Solution

**File: `src/components/HeroSection.tsx`**

1. Increase the mascot image size on mobile for better visibility
2. Add `object-contain` or `object-cover` to prevent cropping
3. Ensure the glow container doesn't clip the image
4. Add error handling for failed image loads

```tsx
// Increase sizes and add object-cover
<img 
  src={xlamaMascot} 
  alt="xLama mascot" 
  width={80}
  height={80}
  fetchPriority="high"
  decoding="async"
  className="relative w-16 h-16 sm:w-18 sm:h-18 lg:w-20 lg:h-20 rounded-full ring-2 ring-primary/40 shrink-0 hover-lift transition-transform duration-300 object-cover bg-background"
  onError={(e) => {
    // Fallback if image fails
    (e.target as HTMLImageElement).src = '/xlama-mascot.png';
  }}
/>
```

Also check:
- If the `public/xlama-mascot.png` matches `src/assets/xlama-mascot.png`
- Add a background color fallback in case of transparency issues

---

## Part 3: Educational Collapsibles for All Wallet-Gated Pages

### Current State

| Page | Disconnected Education | Connected Education |
|------|----------------------|---------------------|
| Analytics | Yes (feature grid) | No |
| Portfolio | Yes (feature grid) | No |
| History | Yes (feature grid) | No |
| Orders | Yes (feature grid) | No |
| Perpetuals | Yes (collapsible) | No |
| Bridge | N/A (no wallet required) | Has "How It Works" |

### Goal

Add collapsible educational content to ALL pages for BOTH connected and disconnected states. The collapsible should:
- Explain what the feature does
- Show step-by-step how to use it
- Include tips and best practices

### Implementation

#### 3.1 Create Reusable Education Component

**File: `src/components/EducationCollapsible.tsx` (NEW)**

A reusable collapsible component for feature education:

```tsx
interface EducationCollapsibleProps {
  title: string;
  icon?: React.ElementType;
  steps: { icon: React.ElementType; title: string; description: string }[];
  tips?: string[];
  defaultOpen?: boolean;
}

export function EducationCollapsible({
  title,
  icon: Icon = HelpCircle,
  steps,
  tips,
  defaultOpen = false,
}: EducationCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between h-11 glass-subtle">
          <span className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-primary" />
            {title}
          </span>
          <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <div className="grid gap-3 sm:grid-cols-2">
          {steps.map((step, index) => (
            <Card key={step.title} className="relative glass border-border/50">
              <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-foreground text-background font-bold flex items-center justify-center text-xs">
                {index + 1}
              </div>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <step.icon className="w-4 h-4 text-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{step.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {tips && tips.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-xs font-medium text-primary mb-2">Tips</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
```

#### 3.2 Add Education to Analytics (Connected State)

**File: `src/pages/Analytics.tsx`**

Add below the SwipeableTabs when connected:

```tsx
const analyticsSteps = [
  { icon: BarChart3, title: "View Metrics", description: "See your trading volume, P&L, and success rate." },
  { icon: TrendingUp, title: "Track Patterns", description: "Discover when you trade most and which chains." },
  { icon: Zap, title: "Gas Analytics", description: "Monitor gas spending across different chains." },
  { icon: LineChart, title: "Performance", description: "Compare your performance over time." },
];

// Add after tabs
<EducationCollapsible
  title="How Analytics Work"
  icon={HelpCircle}
  steps={analyticsSteps}
  tips={[
    "Data updates automatically as you trade",
    "OKX tab shows local transaction data, xLama shows server-synced data",
    "Use chain filters to focus on specific networks"
  ]}
/>
```

#### 3.3 Add Education to Portfolio (Connected State)

**File: `src/pages/Portfolio.tsx`**

```tsx
const portfolioSteps = [
  { icon: Wallet, title: "View Holdings", description: "See all tokens across 25+ chains in one place." },
  { icon: TrendingUp, title: "Track Value", description: "Real-time USD values and 24h changes." },
  { icon: Search, title: "Search & Filter", description: "Find specific tokens or hide dust (<$1)." },
  { icon: ArrowRightLeft, title: "Quick Actions", description: "Swap or bridge directly from your holdings." },
];
```

#### 3.4 Add Education to History (Connected State)

**File: `src/pages/History.tsx`**

```tsx
const historySteps = [
  { icon: LayoutList, title: "App History", description: "Swaps, bridges, and exchanges from this app." },
  { icon: Link2, title: "On-Chain", description: "All wallet transactions from the blockchain." },
  { icon: Filter, title: "Filter & Search", description: "Filter by chain, token, date, or status." },
  { icon: Download, title: "Export Data", description: "Download your history as CSV for records." },
];
```

#### 3.5 Add Education to Orders (Connected State)

**File: `src/pages/Orders.tsx`**

Already has collapsibles for order sections. Add a "How Orders Work" collapsible:

```tsx
const ordersSteps = [
  { icon: Target, title: "Limit Orders", description: "Set a target price and we'll execute when reached." },
  { icon: CalendarClock, title: "DCA Strategies", description: "Automated recurring buys at set intervals." },
  { icon: Bell, title: "Price Alerts", description: "Get notified when your orders trigger." },
  { icon: Shield, title: "Stop Loss / Take Profit", description: "Protect positions with automatic exits." },
];
```

#### 3.6 Add Education to Perpetuals (Connected State)

**File: `src/pages/Perpetuals.tsx` or components**

The connected state should also have education available. Add to `DesktopTradingUI` and `MobileTradingUI`:

```tsx
const perpsSteps = [
  { icon: Activity, title: "Open Position", description: "Choose Long or Short with your desired leverage." },
  { icon: Layers, title: "Manage", description: "Set stop loss, take profit, or add margin." },
  { icon: TrendingUp, title: "Monitor PnL", description: "Real-time profit tracking with live prices." },
  { icon: Wallet, title: "Deposit/Withdraw", description: "Manage your trading collateral on Hyperliquid." },
];
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/EducationCollapsible.tsx` | Create | Reusable education collapsible component |
| `src/components/perpetuals/MobileTradePanel.tsx` | Update | Add delayed render to prevent flash |
| `src/components/HeroSection.tsx` | Update | Fix mascot image sizing and styling |
| `src/pages/Analytics.tsx` | Update | Add education collapsible for connected state |
| `src/pages/Portfolio.tsx` | Update | Add education collapsible for connected state |
| `src/pages/History.tsx` | Update | Add education collapsible for connected state |
| `src/pages/Orders.tsx` | Update | Add "How Orders Work" collapsible |
| `src/pages/Perpetuals/components/MobileTradingUI.tsx` | Update | Add education collapsible |
| `src/pages/Perpetuals/components/DesktopTradingUI.tsx` | Update | Add education collapsible |

---

## Implementation Order

1. **Create EducationCollapsible component** - Reusable base
2. **Fix MobileTradePanel flash** - Add delayed render
3. **Fix HeroSection mascot image** - Increase size, add object-cover
4. **Add education to connected states** - Analytics, Portfolio, History, Orders
5. **Add education to Perpetuals connected state** - Both mobile and desktop

---

## Expected Outcomes

| Issue | Before | After |
|-------|--------|-------|
| Swipe to trade flash | Appears then disappears during load | Smooth fade-in after 1.5s |
| Mascot image | Broken/cropped appearance | Full visible mascot with glow |
| Analytics (connected) | Just tabs | Tabs + "How Analytics Work" collapsible |
| Portfolio (connected) | Just tabs | Tabs + "How Portfolio Work" collapsible |
| History (connected) | Just tabs | Tabs + "How History Work" collapsible |
| Orders (connected) | Order sections only | + "How Orders Work" collapsible |
| Perpetuals (connected) | Trading UI only | + "How Perps Work" collapsible |

---

## Technical Notes

### Delayed Render Pattern
```typescript
const [isReady, setIsReady] = useState(false);
const mountedRef = useRef(false);

useEffect(() => {
  if (mountedRef.current) return;
  mountedRef.current = true;
  const timer = setTimeout(() => setIsReady(true), 1500);
  return () => clearTimeout(timer);
}, []);

if (!isReady) return null;
```

This pattern prevents components from flashing during initial page load by:
1. Using `useRef` to ensure effect runs only once
2. Setting a delay before rendering
3. Returning null until ready

### Education Collapsible Consistency
All education collapsibles should:
- Use `glass-subtle` background
- Have numbered steps (1, 2, 3, 4)
- Include icons for visual clarity
- Optionally include tips section
- Default to closed (not open)
