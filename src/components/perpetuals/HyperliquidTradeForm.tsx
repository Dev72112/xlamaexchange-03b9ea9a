/**
 * Hyperliquid Trade Form Component
 * 
 * Trading form with long/short buttons, leverage slider, and order types.
 */

import { memo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  TrendingUp, 
  TrendingDown, 
  Loader2,
  AlertTriangle,
  Zap,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HyperliquidTradeFormProps {
  coin: string;
  currentPrice: number;
  availableMargin: number;
  onTrade?: (params: TradeParams) => Promise<void>;
}

interface TradeParams {
  coin: string;
  side: 'long' | 'short';
  orderType: 'market' | 'limit';
  size: string;
  leverage: number;
  limitPrice?: string;
  stopLoss?: string;
  takeProfit?: string;
}

const LEVERAGE_PRESETS = [1, 2, 5, 10, 20, 50];

export const HyperliquidTradeForm = memo(function HyperliquidTradeForm({
  coin,
  currentPrice,
  availableMargin,
  onTrade,
}: HyperliquidTradeFormProps) {
  const [side, setSide] = useState<'long' | 'short'>('long');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [size, setSize] = useState('');
  const [leverage, setLeverage] = useState(5);
  const [limitPrice, setLimitPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate position value and margin required
  const sizeNum = parseFloat(size) || 0;
  const positionValue = sizeNum * currentPrice;
  const marginRequired = positionValue / leverage;
  const hasInsufficientMargin = marginRequired > availableMargin && sizeNum > 0;

  const handleSubmit = useCallback(async () => {
    if (!size || isSubmitting || hasInsufficientMargin) return;
    
    setIsSubmitting(true);
    try {
      await onTrade?.({
        coin,
        side,
        orderType,
        size,
        leverage,
        limitPrice: orderType === 'limit' ? limitPrice : undefined,
        stopLoss: stopLoss || undefined,
        takeProfit: takeProfit || undefined,
      });
      
      // Reset form on success
      setSize('');
      setLimitPrice('');
      setStopLoss('');
      setTakeProfit('');
    } finally {
      setIsSubmitting(false);
    }
  }, [coin, side, orderType, size, leverage, limitPrice, stopLoss, takeProfit, onTrade, isSubmitting, hasInsufficientMargin]);

  const setMaxSize = useCallback(() => {
    if (currentPrice > 0 && availableMargin > 0) {
      const maxPositionValue = availableMargin * leverage * 0.95; // 95% to leave buffer
      const maxSize = maxPositionValue / currentPrice;
      setSize(maxSize.toFixed(4));
    }
  }, [currentPrice, availableMargin, leverage]);

  return (
    <div className="space-y-4">
      {/* Long/Short Toggle */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={side === 'long' ? 'default' : 'outline'}
          className={cn(
            "h-12 gap-2 font-semibold border-2 transition-all",
            side === 'long' 
              ? "bg-success hover:bg-success/90 text-success-foreground border-success shadow-md" 
              : "border-border hover:border-success/50 hover:bg-success/10"
          )}
          onClick={() => setSide('long')}
        >
          <TrendingUp className="w-4 h-4" />
          Long
        </Button>
        <Button
          variant={side === 'short' ? 'default' : 'outline'}
          className={cn(
            "h-12 gap-2 font-semibold border-2 transition-all",
            side === 'short' 
              ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground border-destructive shadow-md" 
              : "border-border hover:border-destructive/50 hover:bg-destructive/10"
          )}
          onClick={() => setSide('short')}
        >
          <TrendingDown className="w-4 h-4" />
          Short
        </Button>
      </div>

      {/* Order Type Tabs */}
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Order Type</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-4 w-4 p-0">
                <HelpCircle className="w-3 h-3 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px]">
              <p className="text-xs">Market orders execute immediately at current price. Limit orders execute only when price reaches your target.</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <Tabs value={orderType} onValueChange={(v) => setOrderType(v as 'market' | 'limit')}>
          <TabsList className="grid w-full grid-cols-2 h-10 p-1 bg-secondary/50">
            <TabsTrigger 
              value="market" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium"
            >
              Market
            </TabsTrigger>
            <TabsTrigger 
              value="limit"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium"
            >
              Limit
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Limit Price (for limit orders) */}
      {orderType === 'limit' && (
        <div className="space-y-2">
          <Label>Limit Price (USD)</Label>
          <Input
            type="number"
            placeholder={currentPrice.toString()}
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            className="font-mono"
          />
        </div>
      )}

      {/* Size Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Label>Size ({coin})</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-4 w-4 p-0">
                  <HelpCircle className="w-3 h-3 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px]">
                <p className="text-xs">The amount of {coin} to trade. Position value = Size × Current Price.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs"
            onClick={setMaxSize}
          >
            Max
          </Button>
        </div>
        <Input
          type="number"
          placeholder="0.00"
          value={size}
          onChange={(e) => setSize(e.target.value)}
          className="font-mono"
        />
        {sizeNum > 0 && (
          <p className="text-xs text-muted-foreground">
            Value: ${positionValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        )}
      </div>

      {/* Leverage Slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Label>Leverage</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-4 w-4 p-0">
                  <HelpCircle className="w-3 h-3 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px]">
                <p className="text-xs">Higher leverage increases both potential profits and losses. Risk of liquidation increases with leverage. Use with caution.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Badge variant="outline" className="font-mono">
            {leverage}x
          </Badge>
        </div>
        <Slider
          value={[leverage]}
          onValueChange={([v]) => setLeverage(v)}
          min={1}
          max={50}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between gap-1">
          {LEVERAGE_PRESETS.map((preset) => (
            <Button
              key={preset}
              variant={leverage === preset ? 'default' : 'ghost'}
              size="sm"
              className="h-7 flex-1 text-xs"
              onClick={() => setLeverage(preset)}
            >
              {preset}x
            </Button>
          ))}
        </div>
      </div>

      {/* Margin Required */}
      {sizeNum > 0 && (
        <div className="p-3 rounded-lg bg-secondary/50 space-y-1 text-sm">
          <div className="flex justify-between">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Margin Required</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-4 w-4 p-0">
                    <HelpCircle className="w-3 h-3 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px]">
                  <p className="text-xs">The amount of USDC collateral required to open this position at your selected leverage.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="font-mono">
              ${marginRequired.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Available</span>
            <span className="font-mono">
              ${availableMargin.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      {/* Insufficient Margin Warning */}
      {hasInsufficientMargin && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex gap-2 text-sm">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-destructive">
            Insufficient margin. Reduce size or increase deposit.
          </p>
        </div>
      )}

      {/* SL/TP (Collapsible) */}
      <details className="group">
        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
          <Zap className="w-3.5 h-3.5" />
          Stop Loss / Take Profit (Optional)
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-auto" onClick={(e) => e.stopPropagation()}>
                <HelpCircle className="w-3 h-3 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[240px]">
              <p className="text-xs">Stop Loss: Auto-closes to limit losses. Take Profit: Auto-closes to lock in gains. Set prices in USD.</p>
            </TooltipContent>
          </Tooltip>
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Stop Loss (USD)</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Take Profit (USD)</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
        </div>
      </details>

      {/* Submit Button */}
      <Button
        className={cn(
          "w-full h-12",
          side === 'long' 
            ? "bg-success hover:bg-success/90 text-success-foreground" 
            : "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
        )}
        onClick={handleSubmit}
        disabled={!size || isSubmitting || hasInsufficientMargin}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            {side === 'long' ? <TrendingUp className="w-4 h-4 mr-2" /> : <TrendingDown className="w-4 h-4 mr-2" />}
            {orderType === 'market' ? 'Market' : 'Limit'} {side === 'long' ? 'Long' : 'Short'}
          </>
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Trading on Hyperliquid • Fees: 0.035% maker / 0.1% taker
      </p>
    </div>
  );
});
