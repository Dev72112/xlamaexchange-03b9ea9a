/**
 * Trade Confirmation Modal
 * 
 * Pre-trade confirmation with order details, fees, and risk warnings.
 */

import { memo, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Loader2,
  AlertTriangle,
  Target,
  Shield,
  DollarSign,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderDetails {
  coin: string;
  side: 'long' | 'short';
  orderType: 'market' | 'limit';
  size: string;
  leverage: number;
  price: number;
  limitPrice?: string;
  stopLoss?: string;
  takeProfit?: string;
}

interface TradeConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  orderDetails: OrderDetails;
  feePercent: string;
  isSubmitting: boolean;
  isTestnet: boolean;
}

export const TradeConfirmModal = memo(function TradeConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  orderDetails,
  feePercent,
  isSubmitting,
  isTestnet,
}: TradeConfirmModalProps) {
  const { coin, side, orderType, size, leverage, price, limitPrice, stopLoss, takeProfit } = orderDetails;
  
  const isLong = side === 'long';
  const sizeNum = parseFloat(size) || 0;
  const entryPrice = orderType === 'limit' && limitPrice ? parseFloat(limitPrice) : price;
  const positionValue = sizeNum * entryPrice;
  const marginRequired = positionValue / leverage;
  
  // Estimated platform fee
  const estimatedFee = useMemo(() => {
    const feeRate = parseFloat(feePercent) / 100;
    return positionValue * feeRate;
  }, [positionValue, feePercent]);
  
  // Estimated liquidation price (simplified calculation)
  const liquidationPrice = useMemo(() => {
    if (leverage <= 1) return null;
    const maintenanceMarginRate = 0.005; // 0.5% maintenance margin
    const direction = isLong ? -1 : 1;
    const liqPrice = entryPrice * (1 + direction * (1 / leverage - maintenanceMarginRate));
    return liqPrice > 0 ? liqPrice : null;
  }, [entryPrice, leverage, isLong]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="glass max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isLong ? (
              <TrendingUp className="w-5 h-5 text-success" />
            ) : (
              <TrendingDown className="w-5 h-5 text-destructive" />
            )}
            Confirm {orderType === 'market' ? 'Market' : 'Limit'} Order
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            {isTestnet && (
              <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">
                Testnet
              </Badge>
            )}
            Review your order details before signing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Order Summary */}
          <div className={cn(
            "p-4 rounded-lg border-2",
            isLong 
              ? "bg-success/5 border-success/30" 
              : "bg-destructive/5 border-destructive/30"
          )}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{coin}-PERP</span>
                <Badge 
                  variant="default" 
                  className={cn(
                    isLong 
                      ? "bg-success text-success-foreground" 
                      : "bg-destructive text-destructive-foreground"
                  )}
                >
                  {leverage}x {isLong ? 'LONG' : 'SHORT'}
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Size</p>
                <p className="font-mono font-medium">{size} {coin}</p>
              </div>
              <div>
                <p className="text-muted-foreground">
                  {orderType === 'limit' ? 'Limit Price' : 'Entry Price'}
                </p>
                <p className="font-mono font-medium">
                  ${entryPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Position Details */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                Position Value
              </span>
              <span className="font-mono">
                ${positionValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Margin Required
              </span>
              <span className="font-mono">
                ${marginRequired.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform Fee ({feePercent})</span>
              <span className="font-mono text-xs">
                ~${estimatedFee.toFixed(4)}
              </span>
            </div>
            
            {liquidationPrice && (
              <div className="flex justify-between text-warning">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Liq. Price (est.)
                </span>
                <span className="font-mono">
                  ${liquidationPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>

          {/* SL/TP if set */}
          {(stopLoss || takeProfit) && (
            <div className="p-3 rounded-lg bg-secondary/50 space-y-2 text-sm">
              {stopLoss && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-destructive" />
                    Stop Loss
                  </span>
                  <span className="font-mono">${stopLoss}</span>
                </div>
              )}
              {takeProfit && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-success" />
                    Take Profit
                  </span>
                  <span className="font-mono">${takeProfit}</span>
                </div>
              )}
            </div>
          )}

          {/* High Leverage Warning */}
          {leverage >= 20 && (
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 flex gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <p className="text-warning">
                High leverage ({leverage}x) significantly increases liquidation risk. 
                Consider using lower leverage or setting a stop-loss.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isSubmitting}
            className={cn(
              "gap-2",
              isLong 
                ? "bg-success hover:bg-success/90 text-success-foreground" 
                : "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing...
              </>
            ) : (
              <>
                {isLong ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                Sign & Submit
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
