/**
 * On-Chain History Tab Content
 * Displays on-chain transaction history from OKX API
 */

import { memo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, ArrowRight, ExternalLink, Wallet, AlertCircle, RefreshCw, CheckCircle2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { getStaggerStyle, STAGGER_ITEM_CLASS } from '@/lib/staggerAnimation';
import { getChainByIndex, getExplorerTxUrl } from '@/data/chains';

interface OnchainTransaction {
  txHash: string;
  chainIndex: string;
  txTime: string;
  txStatus: string;
  symbol?: string;
  amount?: string;
  from: { address: string }[];
  to?: { address: string }[];
}

interface OnchainTabContentProps {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  transactions: OnchainTransaction[];
  activeAddress: string | null;
  onRetry: () => void;
}

const formatAmount = (amount: string | number) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0';
  if (num >= 1000) return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (num >= 1) return num.toFixed(4);
  return num.toFixed(6);
};

const truncateHash = (hash: string) => {
  if (hash.length <= 16) return hash;
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
    default:
      return (
        <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Pending
        </Badge>
      );
  }
};

export const OnchainTabContent = memo(function OnchainTabContent({
  isConnected,
  isLoading,
  error,
  transactions,
  activeAddress,
  onRetry,
}: OnchainTabContentProps) {
  if (!isConnected) {
    return (
      <Card className="p-12 text-center border-dashed">
        <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
        <h3 className="text-lg font-semibold mb-2">Connect wallet to view history</h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          Connect your wallet to see your on-chain transaction history across multiple networks.
        </p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4 sm:p-5">
            <div className="flex items-center gap-4">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="w-48 h-4" />
                <Skeleton className="w-32 h-3" />
              </div>
              <Skeleton className="w-20 h-6" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-12 text-center border-dashed">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive/30" />
        <h3 className="text-lg font-semibold mb-2">Failed to load history</h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">{error}</p>
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card className="p-12 text-center border-dashed">
        <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
        <h3 className="text-lg font-semibold mb-2">No on-chain transactions found</h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          No recent transactions found for this wallet across supported networks.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {transactions.map((tx, i) => {
        const chain = getChainByIndex(tx.chainIndex);
        const explorerUrl = tx.txHash ? getExplorerTxUrl(tx.chainIndex, tx.txHash) : null;
        const fromAddr = tx.from[0]?.address || '';
        const isSent = fromAddr.toLowerCase() === activeAddress?.toLowerCase();

        return (
          <Card
            key={`${tx.txHash}-${i}`}
            className={cn("p-4 sm:p-5 hover:border-primary/30 transition-all group", STAGGER_ITEM_CLASS)}
            style={getStaggerStyle(i, 60)}
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0",
                isSent ? "bg-destructive/10" : "bg-success/10"
              )}>
                <ArrowRight className={cn(
                  "w-5 h-5",
                  isSent ? "text-destructive rotate-45" : "text-success -rotate-45"
                )} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-medium">
                    {isSent ? 'Sent' : 'Received'}{" "}
                    {tx.amount && (
                      <>
                        {formatAmount(tx.amount)}{" "}
                        <span className="uppercase text-muted-foreground">{tx.symbol || 'ETH'}</span>
                      </>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                  {chain && (
                    <Badge variant="outline" className="h-5 text-xs gap-1">
                      <img src={chain.icon} alt={chain.name} className="w-3 h-3 rounded-full" />
                      {chain.shortName}
                    </Badge>
                  )}
                  <span className="font-mono text-xs truncate max-w-[80px]">{truncateHash(tx.txHash)}</span>
                  <span>•</span>
                  <span>{formatDistanceToNow(parseInt(tx.txTime), { addSuffix: true })}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {getStatusBadge(tx.txStatus)}
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
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
});
