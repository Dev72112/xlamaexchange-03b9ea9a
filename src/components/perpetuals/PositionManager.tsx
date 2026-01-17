/**
 * Position Manager Component
 * 
 * Manage open positions with close, modify SL/TP, and add margin actions.
 */

import { memo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { HyperliquidPosition } from '@/services/hyperliquid';
import { useToast } from '@/hooks/use-toast';

interface PositionManagerProps {
  positions: HyperliquidPosition[];
  currentPrices: Record<string, number>;
  onClosePosition?: (coin: string, size: string) => Promise<void>;
  onModifySLTP?: (coin: string, stopLoss?: string, takeProfit?: string) => Promise<void>;
  onAddMargin?: (coin: string, amount: string) => Promise<void>;
}

type ModalType = 'close' | 'modify' | 'margin' | null;

export const PositionManager = memo(function PositionManager({
  positions,
  currentPrices,
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
    <>
      <div className="space-y-3">
        {positions.map((pos, i) => {
          const isLong = parseFloat(pos.szi) > 0;
          const size = Math.abs(parseFloat(pos.szi));
          const entryPrice = parseFloat(pos.entryPx);
          const currentPrice = currentPrices[pos.coin] || entryPrice;
          const unrealizedPnl = parseFloat(pos.unrealizedPnl);
          const roe = parseFloat(pos.returnOnEquity) * 100;
          const liquidationPx = pos.liquidationPx ? parseFloat(pos.liquidationPx) : null;
          
          return (
            <Card key={i} className="glass border-border/50 overflow-hidden">
              <div className={cn(
                "h-1 w-full",
                isLong ? "bg-success" : "bg-destructive"
              )} />
              <CardContent className="pt-4 pb-4">
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
                
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
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
                    <p className="text-xs text-muted-foreground">Liq. Price</p>
                    <p className={cn(
                      "font-mono",
                      liquidationPx ? "text-warning" : "text-muted-foreground"
                    )}>
                      {liquidationPx ? `$${liquidationPx.toLocaleString()}` : 'N/A'}
                    </p>
                  </div>
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
                    className="gap-1.5"
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
    </>
  );
});
