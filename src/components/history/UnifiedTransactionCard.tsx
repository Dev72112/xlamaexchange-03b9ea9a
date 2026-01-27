/**
 * UnifiedTransactionCard Component
 * 
 * Displays a single transaction in the unified history timeline.
 * Supports instant, DEX, and bridge transaction types.
 */

import { memo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, ExternalLink, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { STAGGER_ITEM_CLASS, getStaggerStyle } from '@/lib/staggerAnimation';

export interface UnifiedTransaction {
  id: string;
  type: 'instant' | 'dex' | 'bridge';
  timestamp: number;
  status: string;
  fromSymbol: string;
  toSymbol: string;
  fromAmount: string;
  toAmount: string;
  fromLogo?: string;
  toLogo?: string;
  chainName?: string;
  chainIcon?: string;
  explorerUrl?: string;
  bridgeFromChain?: string;
  bridgeToChain?: string;
  original: any;
}

interface UnifiedTransactionCardProps {
  transaction: UnifiedTransaction;
  index: number;
  onExplorerClick?: (url: string) => void;
}

const formatAmount = (amount: string | number) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0';
  if (num >= 1000) return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (num >= 1) return num.toFixed(4);
  return num.toFixed(6);
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
    case 'success':
    case 'confirmed':
      return (
        <Badge variant="secondary" className="bg-success/20 text-success border-success/30">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Completed
        </Badge>
      );
    case 'failed':
    case 'fail':
      return (
        <Badge variant="secondary" className="bg-destructive/20 text-destructive border-destructive/30">
          <AlertCircle className="w-3 h-3 mr-1" />
          Failed
        </Badge>
      );
    case 'bridging':
    case 'pending-source':
      return (
        <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Bridging
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Pending
        </Badge>
      );
  }
};

const TokenIcon = memo(function TokenIcon({ 
  src, 
  alt, 
  className 
}: { 
  src?: string; 
  alt: string; 
  className?: string; 
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn("rounded-full border-2 border-background", className)}
        onError={(e) => {
          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${alt}&background=random`;
        }}
      />
    );
  }
  return (
    <div className={cn(
      "rounded-full border-2 border-background bg-secondary flex items-center justify-center text-xs font-bold",
      className
    )}>
      {alt?.slice(0, 2)}
    </div>
  );
});

export const UnifiedTransactionCard = memo(function UnifiedTransactionCard({
  transaction: tx,
  index,
  onExplorerClick,
}: UnifiedTransactionCardProps) {
  return (
    <Card
      className={cn("p-4 sm:p-5 hover:border-primary/30 transition-all group", STAGGER_ITEM_CLASS)}
      style={getStaggerStyle(index, 60)}
    >
      <div className="flex items-center gap-4">
        {/* Token icons */}
        <div className="flex items-center shrink-0">
          <div className="relative">
            <TokenIcon
              src={tx.fromLogo}
              alt={tx.fromSymbol}
              className="w-10 h-10 sm:w-12 sm:h-12"
            />
          </div>
          <div className="relative -ml-3">
            <TokenIcon
              src={tx.toLogo}
              alt={tx.toSymbol}
              className="w-10 h-10 sm:w-12 sm:h-12"
            />
          </div>
        </div>

        {/* Transaction details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-medium">
              {formatAmount(tx.fromAmount)}{" "}
              <span className="uppercase text-muted-foreground">{tx.fromSymbol}</span>
            </span>
            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="font-medium">
              {formatAmount(tx.toAmount)}{" "}
              <span className="uppercase text-muted-foreground">{tx.toSymbol}</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <Badge 
              variant="outline" 
              className={cn(
                "h-5 text-xs",
                tx.type === 'instant' && "border-blue-500/30 text-blue-500",
                tx.type === 'dex' && "border-green-500/30 text-green-500",
                tx.type === 'bridge' && "border-purple-500/30 text-purple-500"
              )}
            >
              {tx.type === 'instant' && 'Instant'}
              {tx.type === 'dex' && 'DEX'}
              {tx.type === 'bridge' && 'Bridge'}
            </Badge>
            {tx.type === 'bridge' && tx.bridgeFromChain && tx.bridgeToChain && (
              <Badge variant="secondary" className="h-5 text-xs">
                {tx.bridgeFromChain} → {tx.bridgeToChain}
              </Badge>
            )}
            {tx.chainName && tx.chainIcon && (
              <Badge variant="outline" className="h-5 text-xs gap-1">
                <img src={tx.chainIcon} alt={tx.chainName} className="w-3 h-3 rounded-full" />
                {tx.chainName}
              </Badge>
            )}
            <span>•</span>
            <span>{formatDistanceToNow(tx.timestamp, { addSuffix: true })}</span>
          </div>
        </div>

        {/* Status and actions */}
        <div className="flex items-center gap-2">
          {getStatusBadge(tx.status)}
          {tx.explorerUrl && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => {
                if (onExplorerClick) {
                  onExplorerClick(tx.explorerUrl!);
                } else {
                  window.open(tx.explorerUrl, '_blank');
                }
              }}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
});
