import { useState, useEffect, useCallback } from "react";
import { History, ExternalLink, Loader2, Wallet, ArrowRight, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet } from "@/contexts/WalletContext";
import { Chain, getChainByChainId, getChainIcon } from "@/data/chains";
import { cn } from "@/lib/utils";

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  type: 'swap' | 'approve' | 'transfer';
}

export function DexTransactionHistory() {
  const { isConnected, address, chain, chainId } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Mock transaction history - in production, this would fetch from an indexer
  const fetchTransactions = useCallback(async () => {
    if (!isConnected || !address) return;
    
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock data - replace with actual indexer/explorer API
    const mockTransactions: Transaction[] = [
      {
        hash: '0x1234...5678',
        from: 'ETH',
        to: 'USDC',
        value: '0.5 ETH → 1,675 USDC',
        timestamp: Date.now() - 3600000,
        status: 'confirmed',
        type: 'swap',
      },
      {
        hash: '0xabcd...efgh',
        from: 'USDT',
        to: 'ETH',
        value: '1,000 USDT → 0.3 ETH',
        timestamp: Date.now() - 86400000,
        status: 'confirmed',
        type: 'swap',
      },
    ];
    
    setTransactions(mockTransactions);
    setIsLoading(false);
  }, [isConnected, address]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions, chainId]);

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getExplorerUrl = (hash: string) => {
    if (!chain) return '#';
    return `${chain.blockExplorer}/tx/${hash}`;
  };

  if (!isConnected) {
    return (
      <section className="py-12 border-t border-border">
        <div className="container px-4 sm:px-6">
          <Card className="bg-card border-border max-w-2xl mx-auto">
            <CardContent className="py-12 text-center">
              <div className="p-4 rounded-full bg-secondary/50 w-fit mx-auto mb-4">
                <Wallet className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Connect Wallet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Connect your wallet to view your DEX transaction history
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 border-t border-border">
      <div className="container px-4 sm:px-6">
        <Card className="bg-card border-border max-w-2xl mx-auto">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
                  <History className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                Transaction History
              </CardTitle>
              {chain && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <img 
                    src={getChainIcon(chain)} 
                    alt={chain.name}
                    className="w-4 h-4 rounded-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${chain.shortName}&background=random&size=32`;
                    }}
                  />
                  {chain.name}
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Your recent on-chain swaps
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="w-24 h-4" />
                      <Skeleton className="w-16 h-3" />
                    </div>
                  </div>
                  <Skeleton className="w-20 h-6" />
                </div>
              ))
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="mb-2">No transactions yet</p>
                <p className="text-xs">Your swap history will appear here</p>
              </div>
            ) : (
              transactions.map((tx, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border hover:border-border/80 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-full bg-primary/10">
                      <ArrowRight className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{tx.value}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(tx.timestamp)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge 
                      variant="secondary"
                      className={cn(
                        "text-xs",
                        tx.status === 'confirmed' && "bg-success/10 text-success border-success/20",
                        tx.status === 'pending' && "bg-warning/10 text-warning border-warning/20",
                        tx.status === 'failed' && "bg-destructive/10 text-destructive border-destructive/20"
                      )}
                    >
                      {tx.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      asChild
                    >
                      <a href={getExplorerUrl(tx.hash)} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))
            )}
            
            {transactions.length > 0 && (
              <Button variant="outline" className="w-full" onClick={fetchTransactions}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Refresh
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
