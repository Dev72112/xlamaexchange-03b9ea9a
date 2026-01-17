/**
 * PnL Calculator Component
 * 
 * Calculate potential profit/loss based on entry, exit, leverage, and position size.
 */

import { memo, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Target,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PnLCalculatorProps {
  coin?: string;
  currentPrice?: number;
  className?: string;
}

const LEVERAGE_PRESETS = [1, 2, 5, 10, 20, 50];

export const PnLCalculator = memo(function PnLCalculator({
  coin = 'BTC',
  currentPrice = 0,
  className,
}: PnLCalculatorProps) {
  const [side, setSide] = useState<'long' | 'short'>('long');
  const [entryPrice, setEntryPrice] = useState(currentPrice > 0 ? currentPrice.toString() : '');
  const [exitPrice, setExitPrice] = useState('');
  const [positionSize, setPositionSize] = useState('');
  const [leverage, setLeverage] = useState(10);

  // Update entry price when current price changes
  useMemo(() => {
    if (currentPrice > 0 && !entryPrice) {
      setEntryPrice(currentPrice.toString());
    }
  }, [currentPrice]);

  const calculations = useMemo(() => {
    const entry = parseFloat(entryPrice) || 0;
    const exit = parseFloat(exitPrice) || 0;
    const size = parseFloat(positionSize) || 0;
    
    if (entry <= 0 || exit <= 0 || size <= 0) {
      return null;
    }

    // Position value
    const positionValue = size * entry;
    
    // Margin required
    const marginRequired = positionValue / leverage;
    
    // Price change percentage
    const priceChange = ((exit - entry) / entry) * 100;
    
    // PnL calculation
    let pnlPercent: number;
    let pnlUsd: number;
    
    if (side === 'long') {
      pnlPercent = priceChange * leverage;
      pnlUsd = size * (exit - entry);
    } else {
      pnlPercent = -priceChange * leverage;
      pnlUsd = size * (entry - exit);
    }
    
    // ROE (Return on Equity)
    const roe = (pnlUsd / marginRequired) * 100;
    
    // Liquidation price (simplified - assumes 100% loss = liquidation)
    let liquidationPrice: number;
    const liquidationMove = 100 / leverage; // percentage move to liquidation
    
    if (side === 'long') {
      liquidationPrice = entry * (1 - liquidationMove / 100);
    } else {
      liquidationPrice = entry * (1 + liquidationMove / 100);
    }
    
    // Risk/Reward ratio
    const riskUsd = Math.abs(pnlUsd);
    const rewardRatio = pnlUsd > 0 ? (pnlUsd / marginRequired) : 0;
    
    return {
      positionValue,
      marginRequired,
      priceChange,
      pnlPercent,
      pnlUsd,
      roe,
      liquidationPrice,
      riskUsd,
      rewardRatio,
      isProfitable: pnlUsd > 0,
    };
  }, [entryPrice, exitPrice, positionSize, leverage, side]);

  const handleQuickExit = (percent: number) => {
    const entry = parseFloat(entryPrice);
    if (!entry) return;
    
    let newExit: number;
    if (side === 'long') {
      newExit = entry * (1 + percent / 100);
    } else {
      newExit = entry * (1 - percent / 100);
    }
    setExitPrice(newExit.toFixed(2));
  };

  return (
    <Card className={cn("glass border-border/50", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="w-5 h-5 text-primary" />
          PnL Calculator
          <Badge variant="outline" className="text-xs font-mono ml-auto">
            {coin}-PERP
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Side Toggle */}
        <Tabs value={side} onValueChange={(v) => setSide(v as 'long' | 'short')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="long" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Long
            </TabsTrigger>
            <TabsTrigger value="short" className="gap-2">
              <TrendingDown className="w-4 h-4" />
              Short
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Entry Price */}
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center justify-between">
            Entry Price (USD)
            {currentPrice > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 text-xs px-2"
                onClick={() => setEntryPrice(currentPrice.toString())}
              >
                Use Current: ${currentPrice.toLocaleString()}
              </Button>
            )}
          </Label>
          <Input
            type="number"
            placeholder="0.00"
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
            className="font-mono"
          />
        </div>

        {/* Exit Price */}
        <div className="space-y-1.5">
          <Label className="text-xs">Target Exit Price (USD)</Label>
          <Input
            type="number"
            placeholder="0.00"
            value={exitPrice}
            onChange={(e) => setExitPrice(e.target.value)}
            className="font-mono"
          />
          <div className="flex gap-1 mt-1">
            {[5, 10, 25, 50].map((pct) => (
              <Button
                key={pct}
                variant="ghost"
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={() => handleQuickExit(pct)}
              >
                +{pct}%
              </Button>
            ))}
          </div>
        </div>

        {/* Position Size */}
        <div className="space-y-1.5">
          <Label className="text-xs">Position Size ({coin})</Label>
          <Input
            type="number"
            placeholder="0.00"
            value={positionSize}
            onChange={(e) => setPositionSize(e.target.value)}
            className="font-mono"
          />
        </div>

        {/* Leverage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Leverage</Label>
            <Badge variant="outline" className="font-mono">{leverage}x</Badge>
          </div>
          <Slider
            value={[leverage]}
            onValueChange={([v]) => setLeverage(v)}
            min={1}
            max={50}
            step={1}
          />
          <div className="flex gap-1">
            {LEVERAGE_PRESETS.map((preset) => (
              <Button
                key={preset}
                variant={leverage === preset ? 'default' : 'ghost'}
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={() => setLeverage(preset)}
              >
                {preset}x
              </Button>
            ))}
          </div>
        </div>

        {/* Results */}
        {calculations ? (
          <div className="space-y-3 pt-2 border-t border-border/50">
            {/* Main PnL Display */}
            <div className={cn(
              "p-4 rounded-lg text-center",
              calculations.isProfitable 
                ? "bg-success/10 border border-success/20" 
                : "bg-destructive/10 border border-destructive/20"
            )}>
              <p className="text-xs text-muted-foreground mb-1">Expected PnL</p>
              <p className={cn(
                "text-2xl font-bold font-mono",
                calculations.isProfitable ? "text-success" : "text-destructive"
              )}>
                {calculations.pnlUsd >= 0 ? '+' : ''}${calculations.pnlUsd.toFixed(2)}
              </p>
              <p className={cn(
                "text-sm font-mono",
                calculations.isProfitable ? "text-success/80" : "text-destructive/80"
              )}>
                {calculations.roe >= 0 ? '+' : ''}{calculations.roe.toFixed(2)}% ROE
              </p>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-2 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <DollarSign className="w-3 h-3" />
                  Position Value
                </div>
                <p className="font-mono font-medium">
                  ${calculations.positionValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
              
              <div className="p-2 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Target className="w-3 h-3" />
                  Margin Required
                </div>
                <p className="font-mono font-medium">
                  ${calculations.marginRequired.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
              
              <div className="p-2 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Percent className="w-3 h-3" />
                  Price Change
                </div>
                <p className={cn(
                  "font-mono font-medium",
                  calculations.priceChange >= 0 ? "text-success" : "text-destructive"
                )}>
                  {calculations.priceChange >= 0 ? '+' : ''}{calculations.priceChange.toFixed(2)}%
                </p>
              </div>
              
              <div className="p-2 rounded-lg bg-warning/10 border border-warning/20">
                <div className="flex items-center gap-1.5 text-xs text-warning mb-1">
                  <AlertTriangle className="w-3 h-3" />
                  Liquidation
                </div>
                <p className="font-mono font-medium text-warning">
                  ${calculations.liquidationPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Warning for high leverage */}
            {leverage >= 20 && (
              <div className="flex items-start gap-2 p-2 rounded-lg bg-warning/10 border border-warning/20 text-xs">
                <Info className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <p className="text-warning">
                  High leverage ({leverage}x) significantly increases liquidation risk. 
                  A {(100 / leverage).toFixed(1)}% price move against you = 100% loss.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Calculator className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Enter values to calculate PnL</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
