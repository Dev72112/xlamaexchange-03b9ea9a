/**
 * TransactionCard Component
 * 
 * Reusable card for displaying transaction history items across
 * different transaction types (instant, DEX, bridge, on-chain).
 */

import { memo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, ExternalLink, CheckCircle2, AlertCircle, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { getStaggerStyle, STAGGER_ITEM_CLASS } from '@/lib/staggerAnimation';

export interface TransactionCardProps {
  /** Unique identifier */
  id: string;
  /** Transaction type for styling */
  type: 'instant' | 'dex' | 'bridge' | 'onchain';
  /** From token symbol */
  fromSymbol: string;
  /** To token symbol */
  toSymbol: string;
  /** From amount */
  fromAmount: string;
  /** To amount */
  toAmount: string;
  /** From token logo URL */
  fromLogo?: string;
  /** To token logo URL */
  toLogo?: string;
  /** Transaction status */
  status: string;
  /** Timestamp (Unix ms or Date) */
  timestamp: number | Date;
  /** Chain name for display */
  chainName?: string;
  /** Chain icon URL */
  chainIcon?: string;
  /** Explorer URL for the transaction */
  explorerUrl?: string;
  /** Transaction hash (truncated display) */
  txHash?: string;
  /** Bridge source chain name */
  bridgeFromChain?: string;
  /** Bridge destination chain name */
  bridgeToChain?: string;
  /** Animation index for stagger effect */
  index?: number;
  /** Optional delete handler */
  onDelete?: () => void;
  /** Optional refresh handler (for pending bridge transactions) */
  onRefresh?: () => void;
  /** Whether refresh is in progress */
  isRefreshing?: boolean;
}

const formatAmount = (amount: string | number) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0';
  if (num >= 1000) return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (num >= 1) return num.toFixed(4);
  return num.toFixed(6);
};

const truncateHash = (hash: string) => {
  if (!hash || hash.length <= 16) return hash || '';
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
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

const getTypeBadge = (type: string) => {
  switch (type) {
    case 'instant':
      return <Badge variant="outline" className="text-xs">Instant</Badge>;
    case 'dex':
      return <Badge variant="outline" className="text-xs">DEX</Badge>;
    case 'bridge':
      return <Badge variant="outline" className="text-xs">Bridge</Badge>;
    case 'onchain':
      return <Badge variant="outline" className="text-xs">On-chain</Badge>;
    default:
      return null;
  }
};

export const TransactionCard = memo(function TransactionCard({
  id,
  type,
  fromSymbol,
  toSymbol,
  fromAmount,
  toAmount,
  fromLogo,
  toLogo,
  status,
  timestamp,
  chainName,
  chainIcon,
  explorerUrl,
  txHash,
  bridgeFromChain,
  bridgeToChain,
  index = 0,
  onDelete,
  onRefresh,
  isRefreshing,
}: TransactionCardProps) {
  const timestampDate = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
  
  return (
    <Card
      className={cn("p-4 sm:p-5 hover:border-primary/30 transition-all group", STAGGER_ITEM_CLASS)}
      style={getStaggerStyle(index, 60)}
    >
      <div className="flex items-center gap-4">
        {/* Token Icons */}
        <div className="flex items-center shrink-0">
          <div className="relative">
            {fromLogo ? (
              <img
                src={fromLogo}
                alt={fromSymbol}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-background"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${fromSymbol}&background=random`;
                }}
              />
            ) : (
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-xs font-bold">
                {fromSymbol?.slice(0, 2)}
              </div>
            )}
          </div>
          <div className="relative -ml-3">
            {toLogo ? (
              <img
                src={toLogo}
                alt={toSymbol}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-background"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${toSymbol}&background=random`;
                }}
              />
            ) : (
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-xs font-bold">
                {toSymbol?.slice(0, 2)}
              </div>
            )}
          </div>
        </div>

        {/* Transaction Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-medium">
              {formatAmount(fromAmount)}{" "}
              <span className="uppercase text-muted-foreground">{fromSymbol}</span>
            </span>
            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="font-medium">
              {formatAmount(toAmount)}{" "}
              <span className="uppercase text-muted-foreground">{toSymbol}</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            {getTypeBadge(type)}
            {chainName && chainIcon && (
              <Badge variant="outline" className="h-5 text-xs gap-1">
                <img src={chainIcon} alt={chainName} className="w-3 h-3 rounded-full" />
                {chainName}
              </Badge>
            )}
            {bridgeFromChain && bridgeToChain && (
              <span className="text-xs">
                {bridgeFromChain} → {bridgeToChain}
              </span>
            )}
            {txHash && (
              <>
                <span className="font-mono text-xs truncate max-w-[80px]">{truncateHash(txHash)}</span>
                <span>•</span>
              </>
            )}
            <span>{formatDistanceToNow(timestampDate, { addSuffix: true })}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {getStatusBadge(status)}
          
          {onRefresh && (status === 'pending' || status === 'bridging' || status === 'pending-source') && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            </Button>
          )}
          
          {explorerUrl && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => window.open(explorerUrl, '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
          
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onDelete}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
});
