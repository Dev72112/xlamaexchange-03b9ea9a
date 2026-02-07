

# Feedback Toggle Fix, Theme/Display Refinement & Tools Subpage Evolution

## Overview

Three categories of work:
1. **Sound/Haptic toggles require page refresh** - State updates correctly in React but callbacks use stale closure values
2. **Theme display settings broken** - Font size CSS overridden by competing rules, compact mode needs broader coverage, defaults should be compact + small font + OLED + Matrix
3. **Tools subpages too basic** - Currently just a card wrapping a component; need full-page layouts with tips, stats, and education

---

## Part 1: Fix Sound/Haptic Toggles (No Refresh Needed)

### Root Cause

The `useFeedback` hook's `playSound` and `triggerHaptic` callbacks use `useCallback` with `settings.soundEnabled` and `settings.hapticEnabled` as dependencies. However, the `useHapticFeedback` hook maintains its own independent `settings.enabled` state. When `updateSettings` syncs via `window.dispatchEvent(new StorageEvent(...))`, programmatically dispatched StorageEvents behave inconsistently across browsers.

### Solution

Use a `useRef` to always hold the latest settings, so callbacks never read stale values:

**File: `src/hooks/useFeedback.ts`**
- Add `const settingsRef = useRef(settings)` and sync it with `useEffect(() => { settingsRef.current = settings }, [settings])`
- Change `playSound` and `triggerHaptic` to read from `settingsRef.current` instead of closure-captured `settings`
- Remove `settings.soundEnabled` and `settings.hapticEnabled` from useCallback dependency arrays

**File: `src/hooks/useHapticFeedback.ts`**
- Same pattern: add `settingsRef` to avoid stale closures in `vibrate` callback
- Ensure `updateSettings` in useFeedback also directly calls haptic hook's state setter (not just localStorage sync)

---

## Part 2: Fix Theme Display Settings

### 2a: Font Size Not Working

**Problem**: The `html { font-size: var(--base-font-size, 16px); }` rule at line 356 is inside the first `@layer base` block. But there's a COMPETING `html` rule at line 172 (outside any layer, higher specificity):
```css
html {
  transition: background-color 0.2s ease-out, color 0.2s ease-out;
}
```
And ultra-wide media queries at lines 93-108 override `html { font-size: 17px/18px }`.

More critically, the font-size rule is inside `@layer base` which Tailwind resets. The `html { font-size }` needs to be OUTSIDE `@layer base` to have higher priority.

**Fix in `src/index.css`**:
- Move the `html { font-size: var(--base-font-size, 16px); }` OUTSIDE of `@layer base` and place it near line 172 where the other global `html` rule lives
- Update the ultra-wide media queries to use `max()` with the variable so user preference isn't overridden

### 2b: Compact Mode Needs Better Coverage

The current `.ui-compact` overrides only target specific Tailwind classes (`.p-4`, `.gap-4`, etc.) which is fragile. A more robust approach:

**Fix in `src/index.css`**:
- Add card-specific compact overrides:
  ```css
  .ui-compact [class*="CardContent"] { padding: 0.75rem !important; }
  .ui-compact .rounded-lg { border-radius: 0.5rem !important; }
  ```
- Add text scaling for compact:
  ```css
  .ui-compact .text-sm { font-size: 0.75rem !important; }
  .ui-compact .text-xs { font-size: 0.625rem !important; }
  .ui-compact h1 { font-size: 1.5rem !important; }
  .ui-compact h2 { font-size: 1.25rem !important; }
  ```
- Target additional padding patterns: `.p-3`, `.pt-4`, `.pb-4`, `.pt-6`, `.pb-8`

### 2c: Change Defaults to Compact + Small Font

**File: `src/hooks/useThemeCustomization.ts`**:
- Change default `uiDensity` from `'comfortable'` to `'compact'`
- Change default `fontSize` from `'medium'` to `'small'`
- In the mount effect, apply compact + small font for new users (no saved preference):
  ```typescript
  if (!savedDensity) {
    setUiDensity('compact');
    document.documentElement.classList.add('ui-compact');
  }
  if (!savedFontSize) {
    setFontSize('small');
    applyFontSize('small');
  }
  ```
- `resetToDefault` should also reset to compact + small

---

## Part 3: Evolve Tools Subpages to Full Layouts

### Current State
All 6 tool subpages follow the same minimal pattern:
- Back button
- Centered header with icon badge + title + subtitle
- Single Card wrapping the component

### Evolved Layout
Transform each into a full-featured page with:
1. **Stats row** - 2-3 quick stats relevant to the tool
2. **Main content** - The tool component (no longer wrapped in a single card)
3. **Tips/Education** - Inline tips or an EducationCollapsible
4. **Related tools** - Quick links to related tools

### Implementation per Page

**WatchlistPage** (`src/pages/tools/WatchlistPage.tsx`):
- Stats: "Tracked Tokens", "Supported Chains", "Price Updates"
- Tips: "Pin your most-traded tokens", "Prices refresh every 30s"
- Related: Gas Estimator, Price Alerts

**GasPage** (`src/pages/tools/GasPage.tsx`):
- Stats: "Networks Monitored", "Update Frequency", "Avg Gas"
- Tips: "Trade during off-peak hours", "L2s offer 10-100x cheaper gas"
- Related: Token Compare, Rebalancer

**PredictionPage** (`src/pages/tools/PredictionPage.tsx`):
- Stats: "AI Models", "Prediction Window", "Accuracy"
- Tips: "Predictions are educational, not financial advice", "Combine with your own research"
- Related: Price Alerts, Token Compare

**RebalancerPage** (`src/pages/tools/RebalancerPage.tsx`):
- Stats: "Supported Tokens", "Strategy Types", "Chains"
- Tips: "Rebalance monthly for best results", "Consider gas costs"
- Related: Portfolio, Watchlist

**AlertsPage** (`src/pages/tools/AlertsPage.tsx`):
- Stats: "Alert Types", "Delivery", "Response Time"
- Tips: "Set alerts for key support/resistance levels"
- Related: Watchlist, Prediction

**NewsPage** (`src/pages/tools/NewsPage.tsx`):
- Stats: "Sources", "Categories", "Update Frequency"
- Tips: "Filter by topic for relevant news"
- Related: Price Prediction, Token Compare

### Page Template Structure

```tsx
<AppLayout>
  <main className="container px-4 pb-8 max-w-4xl mx-auto">
    {/* Back + Title */}
    <Link to="/tools">...</Link>
    <header className="text-center mb-8">...</header>

    {/* Stats Row */}
    <div className="grid grid-cols-3 gap-3 mb-6">
      <Card className="glass-subtle text-center p-3">
        <p className="text-lg font-bold text-primary">25+</p>
        <p className="text-[10px] text-muted-foreground">Chains</p>
      </Card>
      ...
    </div>

    {/* Main Content - full width, no wrapping card */}
    <Card className="glass border-border/50 overflow-hidden">
      <GlowBar />
      <CardContent className="pt-4">
        <ToolComponent />
      </CardContent>
    </Card>

    {/* Tips */}
    <div className="mt-6 p-4 rounded-lg glass-subtle border border-primary/10">
      <p className="text-xs font-medium text-primary mb-2">Pro Tips</p>
      <ul className="text-xs text-muted-foreground space-y-1.5">
        <li>Tip 1...</li>
      </ul>
    </div>

    {/* Related Tools */}
    <div className="mt-6">
      <p className="text-xs text-muted-foreground mb-3">Related Tools</p>
      <div className="flex gap-2">
        <Link to="/tools/alerts">
          <Badge variant="secondary" className="hover:bg-primary/10">
            Price Alerts
          </Badge>
        </Link>
      </div>
    </div>
  </main>
</AppLayout>
```

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/useFeedback.ts` | Update | Add settingsRef for stale-closure fix |
| `src/hooks/useHapticFeedback.ts` | Update | Add settingsRef for stale-closure fix |
| `src/index.css` | Update | Move font-size rule outside @layer, expand compact mode |
| `src/hooks/useThemeCustomization.ts` | Update | Default to compact + small font |
| `src/pages/tools/WatchlistPage.tsx` | Update | Full page layout with stats, tips, related |
| `src/pages/tools/GasPage.tsx` | Update | Full page layout |
| `src/pages/tools/PredictionPage.tsx` | Update | Full page layout |
| `src/pages/tools/RebalancerPage.tsx` | Update | Full page layout |
| `src/pages/tools/AlertsPage.tsx` | Update | Full page layout |
| `src/pages/tools/NewsPage.tsx` | Update | Full page layout |

---

## Implementation Order

1. Fix feedback toggle stale closures (useFeedback + useHapticFeedback)
2. Fix CSS font-size rule placement and compact mode
3. Update defaults to compact + small in useThemeCustomization
4. Evolve all 6 tools subpages to full layouts

---

## Expected Outcomes

| Issue | Before | After |
|-------|--------|-------|
| Sound toggle | Needs refresh to take effect | Instant on/off |
| Haptic toggle | Needs refresh to take effect | Instant on/off |
| Font size (small/medium/large) | No visible change | Text scales across app |
| Compact mode | Barely noticeable | Tighter spacing, smaller text |
| New user defaults | Comfortable + medium font | Compact + small font + OLED + Matrix |
| Tools subpages | Plain card wrapper | Stats row, tips, related tools |

