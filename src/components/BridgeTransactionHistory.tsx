import { memo, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ExternalLink, 
  Trash2,
  ArrowRight,
  History,
  RefreshCw
} from "lucide-react";
import { useBridgeTransactions, BridgeTransaction, BridgeStatus } from "@/contexts/BridgeTransactionContext";
import { useBridgeStatusPolling } from "@/hooks/useBridgeStatusPolling";
import { formatDistanceToNow } from "date-fns";

const statusConfig: Record<BridgeStatus, { label: string; icon: typeof Clock; color: string }> = {
  idle: { label: "Idle", icon: Clock, color: "bg-muted text-muted-foreground" },
  "checking-approval": { label: "Checking", icon: Loader2, color: "bg-yellow-500/10 text-yellow-500" },
  "awaiting-approval": { label: "Awaiting Approval", icon: Clock, color: "bg-orange-500/10 text-orange-500" },
  approving: { label: "Approving", icon: Loader2, color: "bg-yellow-500/10 text-yellow-500" },
  "pending-source": { label: "Pending", icon: Loader2, color: "bg-blue-500/10 text-blue-500" },
  bridging: { label: "Bridging", icon: Loader2, color: "bg-primary/10 text-primary" },
  completed: { label: "Completed", icon: CheckCircle2, color: "bg-green-500/10 text-green-500" },
  failed: { label: "Failed", icon: XCircle, color: "bg-red-500/10 text-red-500" },
};

function getExplorerUrl(chainId: number, txHash: string): string {
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io/tx/',
    10: 'https://optimistic.etherscan.io/tx/',
    56: 'https://bscscan.com/tx/',
    137: 'https://polygonscan.com/tx/',
    42161: 'https://arbiscan.io/tx/',
    8453: 'https://basescan.org/tx/',
    43114: 'https://snowtrace.io/tx/',
    250: 'https://ftmscan.com/tx/',
    324: 'https://explorer.zksync.io/tx/',
    59144: 'https://lineascan.build/tx/',
    534352: 'https://scrollscan.com/tx/',
    196: 'https://www.okx.com/web3/explorer/xlayer/tx/',
    1151111081099710: 'https://solscan.io/tx/',
  };
  return `${explorers[chainId] || 'https://blockscan.com/tx/'}${txHash}`;
}

interface TransactionRowProps {
  tx: BridgeTransaction;
  onRemove: (id: string) => void;
  onRefresh?: (tx: BridgeTransaction) => void;
}

const TransactionRow = memo(function TransactionRow({ tx, onRemove, onRefresh }: TransactionRowProps) {
  const config = statusConfig[tx.status];
  const StatusIcon = config.icon;
  const isLoading = tx.status === 'bridging' || tx.status === 'pending-source' || tx.status === 'approving' || tx.status === 'checking-approval';

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border">
      {/* Status */}
      <Badge variant="outline" className={`${config.color} border-0 flex-shrink-0`}>
        <StatusIcon className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
        {config.label}
      </Badge>

      {/* Tokens */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="flex items-center gap-1">
          {tx.fromToken.logoURI && (
            <img src={tx.fromToken.logoURI} alt="" className="w-5 h-5 rounded-full" />
          )}
          <span className="font-medium text-sm truncate">
            {parseFloat(tx.fromAmount).toFixed(4)} {tx.fromToken.symbol}
          </span>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <div className="flex items-center gap-1">
          {tx.toToken.logoURI && (
            <img src={tx.toToken.logoURI} alt="" className="w-5 h-5 rounded-full" />
          )}
          <span className="font-medium text-sm truncate">
            {parseFloat(tx.toAmount).toFixed(4)} {tx.toToken.symbol}
          </span>
        </div>
      </div>

      {/* Chains - Always visible */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
        <img src={tx.fromChain.icon} alt="" className="w-4 h-4 rounded-full" 
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <ArrowRight className="w-3 h-3" />
        <img src={tx.toChain.icon} alt="" className="w-4 h-4 rounded-full"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      </div>

      {/* Time */}
      <span className="text-xs text-muted-foreground hidden md:block flex-shrink-0">
        {formatDistanceToNow(tx.startTime, { addSuffix: true })}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {isLoading && onRefresh && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onRefresh(tx)}
            title="Refresh status"
          >
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        )}
        {tx.sourceTxHash && (
          <a
            href={getExplorerUrl(tx.fromChain.chainId, tx.sourceTxHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded hover:bg-secondary transition-colors"
            title="View source transaction"
          >
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
          </a>
        )}
        {tx.destTxHash && (
          <a
            href={getExplorerUrl(tx.toChain.chainId, tx.destTxHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded hover:bg-secondary transition-colors"
            title="View destination transaction"
          >
            <ExternalLink className="w-3.5 h-3.5 text-green-500" />
          </a>
        )}
        {(tx.status === 'completed' || tx.status === 'failed') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onRemove(tx.id)}
            title="Remove from history"
          >
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        )}
      </div>
    </div>
  );
});

export const BridgeTransactionHistory = memo(function BridgeTransactionHistory() {
  const { transactions, removeTransaction, clearHistory, pendingCount } = useBridgeTransactions();
  const { pollTransaction } = useBridgeStatusPolling();

  const handleRefresh = useCallback((tx: BridgeTransaction) => {
    pollTransaction(tx);
  }, [pollTransaction]);

  const { pending, completed } = useMemo(() => {
    const pending = transactions.filter(
      tx => tx.status !== 'completed' && tx.status !== 'failed' && tx.status !== 'idle'
    );
    const completed = transactions.filter(
      tx => tx.status === 'completed' || tx.status === 'failed'
    );
    return { pending, completed };
  }, [transactions]);

  if (transactions.length === 0) {
    return null;
  }

  return (
    <Card className="bg-card/50 border-border overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            Bridge History
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-1 animate-pulse">
                {pendingCount} pending
              </Badge>
            )}
          </CardTitle>
          {completed.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearHistory}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clear History
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[350px] pr-2">
          <div className="space-y-2">
            {/* Pending transactions first */}
            {pending.map(tx => (
              <TransactionRow key={tx.id} tx={tx} onRemove={removeTransaction} onRefresh={handleRefresh} />
            ))}
            
            {/* Separator if both exist */}
            {pending.length > 0 && completed.length > 0 && (
              <div className="border-t border-border my-3" />
            )}
            
            {/* Completed transactions */}
            {completed.map(tx => (
              <TransactionRow key={tx.id} tx={tx} onRemove={removeTransaction} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
});
