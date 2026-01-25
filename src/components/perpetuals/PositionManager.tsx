/**
 * Position Manager Component
 * 
 * Manage open positions with close, modify SL/TP, and add margin actions.
 * Includes funding rate display, liquidation proximity warnings, and funding countdown.
 */

import { memo, useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  TrendingUp,
  TrendingDown,
  X,
  Edit3,
  Plus,
  Loader2,
  AlertTriangle,
  DollarSign,
  Target,
  Shield,
  Clock,
  Flame,
  AlertCircle,
  Timer,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { HyperliquidPosition, hyperliquidService } from '@/services/hyperliquid';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { FundingRateRow } from './FundingRateRow';

interface PositionManagerProps {
  positions: HyperliquidPosition[];
  currentPrices: Record<string, number>;
  fundingRates?: Record<string, { fundingRate: string; nextFunding: number }>;
  onClosePosition?: (coin: string, size: string) => Promise<void>;
  onModifySLTP?: (coin: string, stopLoss?: string, takeProfit?: string) => Promise<void>;
  onAddMargin?: (coin: string, amount: string) => Promise<void>;
}

type ModalType = 'close' | 'modify' | 'margin' | null;

// Helper to calculate liquidation proximity (0-100, 100 = very close to liquidation)
const calculateLiquidationProximity = (
  currentPrice: number,
  liquidationPrice: number | null,
  isLong: boolean
): number => {
  if (!liquidationPrice || liquidationPrice <= 0) return 0;
  
  const priceDiff = isLong
    ? currentPrice - liquidationPrice
    : liquidationPrice - currentPrice;
  
  const totalRange = isLong
    ? currentPrice - liquidationPrice
    : liquidationPrice - currentPrice;
    
  if (totalRange <= 0) return 100; // Already liquidated
  
  // Calculate how close we are - smaller diff = closer to liquidation
  const distancePercent = (priceDiff / currentPrice) * 100;
  
  // Map to 0-100 where 100 = very close (< 2% away)
  if (distancePercent < 2) return 100;
  if (distancePercent < 5) return 75;
  if (distancePercent < 10) return 50;
  if (distancePercent < 20) return 25;
  return 0;
};

// Color coding for liquidation proximity
const getLiquidationColor = (proximity: number): string => {
  if (proximity >= 75) return 'text-red-500 bg-red-500';
  if (proximity >= 50) return 'text-orange-500 bg-orange-500';
  if (proximity >= 25) return 'text-yellow-500 bg-yellow-500';
  return 'text-green-500 bg-green-500';
};

// Format funding rate for display
const formatFundingRate = (rate: string | undefined): string => {
  if (!rate) return '0.00%';
  const parsed = parseFloat(rate) * 100;
  return `${parsed >= 0 ? '+' : ''}${parsed.toFixed(4)}%`;
};

export const PositionManager = memo(function PositionManager({
  positions,
  currentPrices,
  fundingRates: propFundingRates,
  onClosePosition,
  onModifySLTP,
  onAddMargin,
}: PositionManagerProps) {
  const { toast } = useToast();
  const [selectedPosition, setSelectedPosition] = useState<HyperliquidPosition | null>(null);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Close position state
  const [closePercent, setClosePercent] = useState(100);
  
  // Modify SL/TP state
  const [newStopLoss, setNewStopLoss] = useState('');
  const [newTakeProfit, setNewTakeProfit] = useState('');
  
  // Add margin state
  const [marginAmount, setMarginAmount] = useState('');

  // Fetch funding rates if not provided
  const { data: fetchedFundingRates } = useQuery({
    queryKey: ['hyperliquid', 'fundingRates'],
    queryFn: () => hyperliquidService.getFundingRates(),
    staleTime: 60000, // 1 minute
    refetchInterval: 60000,
    enabled: !propFundingRates && positions.length > 0,
  });

  const fundingRates = propFundingRates || fetchedFundingRates || {};

  const openModal = useCallback((position: HyperliquidPosition, type: ModalType) => {
    setSelectedPosition(position);
    setModalType(type);
    setClosePercent(100);
    setNewStopLoss('');
    setNewTakeProfit('');
    setMarginAmount('');
  }, []);

  const closeModal = useCallback(() => {
    setSelectedPosition(null);
    setModalType(null);
  }, []);

  const handleClosePosition = useCallback(async () => {
    if (!selectedPosition || !onClosePosition) return;
    
    setIsSubmitting(true);
    try {
      const sizeToClose = (Math.abs(parseFloat(selectedPosition.szi)) * closePercent / 100).toFixed(6);
      await onClosePosition(selectedPosition.coin, sizeToClose);
      toast({
        title: 'Position Closed',
        description: `Closed ${closePercent}% of ${selectedPosition.coin} position`,
      });
      closeModal();
    } catch (error) {
      toast({
        title: 'Failed to Close',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedPosition, closePercent, onClosePosition, toast, closeModal]);

  const handleModifySLTP = useCallback(async () => {
    if (!selectedPosition || !onModifySLTP) return;
    
    setIsSubmitting(true);
    try {
      await onModifySLTP(
        selectedPosition.coin,
        newStopLoss || undefined,
        newTakeProfit || undefined
      );
      toast({
        title: 'SL/TP Updated',
        description: `Updated stop-loss/take-profit for ${selectedPosition.coin}`,
      });
      closeModal();
    } catch (error) {
      toast({
        title: 'Failed to Update',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedPosition, newStopLoss, newTakeProfit, onModifySLTP, toast, closeModal]);

  const handleAddMargin = useCallback(async () => {
    if (!selectedPosition || !onAddMargin || !marginAmount) return;
    
    setIsSubmitting(true);
    try {
      await onAddMargin(selectedPosition.coin, marginAmount);
      toast({
        title: 'Margin Added',
        description: `Added $${marginAmount} margin to ${selectedPosition.coin}`,
      });
      closeModal();
    } catch (error) {
      toast({
        title: 'Failed to Add Margin',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedPosition, marginAmount, onAddMargin, toast, closeModal]);

  if (positions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Target className="w-10 h-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No open positions</p>
        <p className="text-xs mt-1">Your positions will appear here</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {positions.map((pos, i) => {
          const isLong = parseFloat(pos.szi) > 0;
          const size = Math.abs(parseFloat(pos.szi));
          const entryPrice = parseFloat(pos.entryPx);
          const currentPrice = currentPrices[pos.coin] || entryPrice;
          const unrealizedPnl = parseFloat(pos.unrealizedPnl);
          const roe = parseFloat(pos.returnOnEquity) * 100;
          const liquidationPx = pos.liquidationPx ? parseFloat(pos.liquidationPx) : null;
          
          // Funding rate for this position
          const funding = fundingRates[pos.coin];
          const fundingRate = funding?.fundingRate;
          const fundingRateParsed = fundingRate ? parseFloat(fundingRate) : 0;
          const isFundingPositive = fundingRateParsed >= 0;
          
          // Liquidation proximity calculation
          const liqProximity = calculateLiquidationProximity(currentPrice, liquidationPx, isLong);
          const liqColor = getLiquidationColor(liqProximity);
          const isLiquidationDanger = liqProximity >= 50;
          
          return (
            <Card key={i} className={cn(
              "glass border-border/50 overflow-hidden transition-all",
              isLiquidationDanger && "border-red-500/50 animate-pulse"
            )}>
              <div className={cn(
                "h-1 w-full",
                isLong ? "bg-success" : "bg-destructive"
              )} />
              <CardContent className="pt-4 pb-4">
                {/* Liquidation Warning Banner */}
                {isLiquidationDanger && (
                  <div className="flex items-center gap-2 p-2 mb-3 rounded-md bg-red-500/10 border border-red-500/30">
                    <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />
                    <span className="text-xs text-red-500 font-medium">
                      Liquidation risk: {liqProximity >= 75 ? 'CRITICAL' : 'HIGH'} - Consider adding margin
                    </span>
                  </div>
                )}
                
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">{pos.coin}</span>
                    <Badge variant={isLong ? "default" : "destructive"} className="text-xs">
                      {isLong ? 'LONG' : 'SHORT'} {pos.leverage}x
                    </Badge>
                  </div>
                  <div className={cn(
                    "text-right",
                    unrealizedPnl >= 0 ? "text-success" : "text-destructive"
                  )}>
                    <p className="font-mono font-bold">
                      {unrealizedPnl >= 0 ? '+' : ''}${unrealizedPnl.toFixed(2)}
                    </p>
                    <p className="text-xs opacity-80">
                      {roe >= 0 ? '+' : ''}{roe.toFixed(2)}%
                    </p>
                  </div>
                </div>
                
                {/* Funding Rate Row with Countdown */}
                <FundingRateRow 
                  fundingRate={fundingRate}
                  nextFundingTime={funding?.nextFunding}
                  isLong={isLong}
                  isFundingPositive={isFundingPositive}
                />
                
                <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Size</p>
                    <p className="font-mono">{size.toFixed(4)} {pos.coin}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Entry Price</p>
                    <p className="font-mono">${entryPrice.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Mark Price</p>
                    <p className="font-mono">${currentPrice.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Margin Used</p>
                    <p className="font-mono">${parseFloat(pos.marginUsed).toFixed(2)}</p>
                  </div>
                </div>
                
                {/* Liquidation Price with Progress Bar */}
                <div className="mb-4 p-2 rounded-md bg-secondary/30">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={cn("w-3.5 h-3.5", liqColor.split(' ')[0])} />
                      <span className="text-xs text-muted-foreground">Liquidation Price</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="inline-flex">
                            <AlertCircle className="w-3 h-3 text-muted-foreground/60 cursor-help" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[250px]">
                          <div className="space-y-1 text-xs">
                            <p className="font-medium">What is Liquidation?</p>
                            <p className="text-muted-foreground">
                              If the mark price reaches this level, your position will be automatically closed to prevent further losses.
                            </p>
                            <p className="text-muted-foreground">
                              Higher leverage = closer liquidation price. Add margin to reduce risk.
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <span className={cn("font-mono text-xs font-medium", liqColor.split(' ')[0])}>
                      {liquidationPx ? `$${liquidationPx.toLocaleString()}` : 'N/A'}
                    </span>
                  </div>
                  {liquidationPx && (
                    <>
                      <Progress 
                        value={liqProximity} 
                        className={cn("h-1.5", liqColor.split(' ')[1].replace('text-', 'bg-').replace('bg-', '[&>div]:bg-'))}
                      />
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-muted-foreground">Safe</span>
                        <span className="text-[10px] text-muted-foreground">
                          {((Math.abs(currentPrice - liquidationPx) / currentPrice) * 100).toFixed(1)}% away
                        </span>
                        <span className="text-[10px] text-red-400">Liquidation</span>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => openModal(pos, 'close')}
                  >
                    <X className="w-3.5 h-3.5" />
                    Close
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => openModal(pos, 'modify')}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    SL/TP
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "gap-1.5",
                      isLiquidationDanger && "border-green-500/50 text-green-500 hover:bg-green-500/10"
                    )}
                    onClick={() => openModal(pos, 'margin')}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Margin
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Close Position Modal */}
      <Dialog open={modalType === 'close'} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X className="w-5 h-5 text-destructive" />
              Close Position
            </DialogTitle>
            <DialogDescription>
              Close {selectedPosition?.coin} {parseFloat(selectedPosition?.szi || '0') > 0 ? 'long' : 'short'} position
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Close Amount</span>
                <span className="font-mono">{closePercent}%</span>
              </div>
              <Slider
                value={[closePercent]}
                onValueChange={([v]) => setClosePercent(v)}
                min={10}
                max={100}
                step={10}
              />
              <div className="flex justify-between gap-1">
                {[25, 50, 75, 100].map((pct) => (
                  <Button
                    key={pct}
                    variant={closePercent === pct ? 'default' : 'ghost'}
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => setClosePercent(pct)}
                  >
                    {pct}%
                  </Button>
                ))}
              </div>
            </div>
            
            {selectedPosition && (
              <div className="p-3 rounded-lg bg-secondary/50 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Size to Close</span>
                  <span className="font-mono">
                    {(Math.abs(parseFloat(selectedPosition.szi)) * closePercent / 100).toFixed(4)} {selectedPosition.coin}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleClosePosition}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Close {closePercent}%
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modify SL/TP Modal */}
      <Dialog open={modalType === 'modify'} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-primary" />
              Modify SL/TP
            </DialogTitle>
            <DialogDescription>
              Set stop-loss and take-profit for {selectedPosition?.coin}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-destructive" />
                Stop Loss (USD)
              </Label>
              <Input
                type="number"
                placeholder={`Current: ${selectedPosition?.entryPx || '0'}`}
                value={newStopLoss}
                onChange={(e) => setNewStopLoss(e.target.value)}
                className="font-mono"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Target className="w-4 h-4 text-success" />
                Take Profit (USD)
              </Label>
              <Input
                type="number"
                placeholder="Enter target price"
                value={newTakeProfit}
                onChange={(e) => setNewTakeProfit(e.target.value)}
                className="font-mono"
              />
            </div>
            
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 flex gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <p className="text-warning">
                SL/TP orders execute as market orders when price is reached.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button
              onClick={handleModifySLTP}
              disabled={isSubmitting || (!newStopLoss && !newTakeProfit)}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Update SL/TP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Margin Modal */}
      <Dialog open={modalType === 'margin'} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-success" />
              Add Margin
            </DialogTitle>
            <DialogDescription>
              Add margin to reduce liquidation risk for {selectedPosition?.coin}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Amount (USD)
              </Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={marginAmount}
                onChange={(e) => setMarginAmount(e.target.value)}
                className="font-mono"
              />
            </div>
            
            {selectedPosition && (
              <div className="p-3 rounded-lg bg-secondary/50 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Margin</span>
                  <span className="font-mono">${parseFloat(selectedPosition.marginUsed).toFixed(2)}</span>
                </div>
                {marginAmount && parseFloat(marginAmount) > 0 && (
                  <div className="flex justify-between text-success">
                    <span>New Margin</span>
                    <span className="font-mono">
                      ${(parseFloat(selectedPosition.marginUsed) + parseFloat(marginAmount)).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button
              onClick={handleAddMargin}
              disabled={isSubmitting || !marginAmount || parseFloat(marginAmount) <= 0}
              className="bg-success hover:bg-success/90 text-success-foreground"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Add Margin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
});
