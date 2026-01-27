/**
 * On-Chain History Tab
 * Transaction history from OKX API
 */

import { memo, useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Clock,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { okxDexService, TransactionHistoryItem } from '@/services/okxdex';
import { getEvmChains, getChainByIndex, getExplorerTxUrl } from '@/data/chains';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { TokenImage, ChainImage } from '@/components/ui/token-image';

const truncateHash = (hash: string) => {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
};

const formatAmount = (amount: string | number) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0';
  if (num >= 1000) return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (num >= 1) return num.toFixed(4);
  return num.toFixed(6);
};

export const OnchainHistoryTab = memo(function OnchainHistoryTab() {
  const { isConnected, activeAddress } = useMultiWallet();
  const [transactions, setTransactions] = useState<TransactionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!isConnected || !activeAddress) return;

    setIsLoading(true);
    setError(null);

    try {
      const chains = getEvmChains().slice(0, 6).map(c => c.chainIndex).join(',');
      const result = await okxDexService.getTransactionHistory(activeAddress, chains, { limit: 50 });
      setTransactions(result.transactions);
    } catch (err) {
      console.error('[OnchainHistoryTab] Failed to fetch:', err);
      setError('Failed to load on-chain history');
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, activeAddress]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const getStatusBadge = (status: string) => {
    if (status === 'success') {
      return (
        <Badge variant="secondary" className="bg-success/20 text-success border-success/30 text-[10px]">
          <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
          Success
        </Badge>
      );
    }
    if (status === 'fail') {
      return (
        <Badge variant="secondary" className="bg-destructive/20 text-destructive border-destructive/30 text-[10px]">
          <AlertCircle className="w-2.5 h-2.5 mr-0.5" />
          Failed
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30 text-[10px]">
        <Loader2 className="w-2.5 h-2.5 mr-0.5 animate-spin" />
        Pending
      </Badge>
    );
  };

  if (!isConnected) {
    return (
      <Card className="glass border-border/50">
        <CardContent className="py-12 text-center">
          <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Connect Wallet</h3>
          <p className="text-sm text-muted-foreground">
            Connect your wallet to view on-chain transaction history.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="glass border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="glass border-destructive/20">
        <CardContent className="py-8 text-center">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
          <p className="text-sm text-destructive mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchHistory}>
            <RefreshCw className="w-3 h-3 mr-1" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card className="glass border-border/50">
        <CardContent className="py-12 text-center">
          <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No On-Chain Transactions</h3>
          <p className="text-sm text-muted-foreground">
            Your on-chain transaction history will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Refresh button */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={fetchHistory} disabled={isLoading} className="h-8 gap-1.5">
          <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Transaction list */}
      {transactions.map((tx, index) => {
        const chain = getChainByIndex(tx.chainIndex);
        const explorerUrl = getExplorerTxUrl(tx.chainIndex, tx.txHash);
        const timestamp = parseInt(tx.txTime);
        const fromAddr = typeof tx.from === 'string' ? tx.from : (tx.from as any)?.[0]?.address || '';
        const toAddr = typeof tx.to === 'string' ? tx.to : (tx.to as any)?.[0]?.address || '';

        return (
          <Card 
            key={`${tx.txHash}-${index}`} 
            className="glass border-border/50 hover-lift transition-all"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {/* Token icon */}
                <div className="relative">
                  <TokenImage 
                    src={null} 
                    alt={tx.symbol} 
                    fallbackText={tx.symbol}
                    className="w-10 h-10 rounded-full"
                  />
                  {chain && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-background border border-border flex items-center justify-center">
                      <ChainImage 
                        src={chain.icon} 
                        alt={chain.shortName}
                        fallbackText={chain.shortName}
                        className="w-3 h-3"
                      />
                    </div>
                  )}
                </div>

                {/* Transaction details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {formatAmount(tx.amount)} {tx.symbol}
                    </span>
                    {getStatusBadge(tx.txStatus)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{chain?.shortName || 'Unknown'}</span>
                    <span>•</span>
                    <span>{formatDistanceToNow(timestamp, { addSuffix: true })}</span>
                  </div>
                </div>

                {/* Explorer link */}
                {explorerUrl && (
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </a>
                )}
              </div>

              {/* Hash */}
              <div className="mt-2 pt-2 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-mono">{truncateHash(tx.txHash)}</span>
                {fromAddr && toAddr && (
                  <span className="flex items-center gap-1">
                    {truncateHash(fromAddr)}
                    <ArrowRight className="w-3 h-3" />
                    {truncateHash(toAddr)}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
});

export default OnchainHistoryTab;
