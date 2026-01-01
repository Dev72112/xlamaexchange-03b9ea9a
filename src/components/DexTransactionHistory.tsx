import { History, ExternalLink, Wallet, ArrowRight, Clock, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/contexts/WalletContext";
import { useDexTransactionHistory } from "@/hooks/useDexTransactionHistory";
import { cn } from "@/lib/utils";

export function DexTransactionHistory() {
  const { isConnected, chain } = useWallet();
  const { transactions, removeTransaction, clearHistory } = useDexTransactionHistory();

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
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
                Swap History
              </CardTitle>
              {transactions.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearHistory}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Clear All
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Your recent on-chain swaps made on this site
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="mb-2">No transactions yet</p>
                <p className="text-xs">Your swap history will appear here after you make swaps</p>
              </div>
            ) : (
              transactions.slice(0, 10).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border hover:border-border/80 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center -space-x-2">
                      {tx.fromTokenLogo && (
                        <img 
                          src={tx.fromTokenLogo} 
                          alt={tx.fromTokenSymbol}
                          className="w-7 h-7 rounded-full border-2 border-background"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${tx.fromTokenSymbol}&background=random`;
                          }}
                        />
                      )}
                      {tx.toTokenLogo && (
                        <img 
                          src={tx.toTokenLogo} 
                          alt={tx.toTokenSymbol}
                          className="w-7 h-7 rounded-full border-2 border-background"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${tx.toTokenSymbol}&background=random`;
                          }}
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate flex items-center gap-1">
                        {parseFloat(tx.fromTokenAmount).toLocaleString(undefined, { maximumFractionDigits: 6 })} {tx.fromTokenSymbol}
                        <ArrowRight className="w-3 h-3 text-muted-foreground inline shrink-0" />
                        {parseFloat(tx.toTokenAmount).toLocaleString(undefined, { maximumFractionDigits: 6 })} {tx.toTokenSymbol}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(tx.timestamp)}
                        </span>
                        <span>•</span>
                        <span>{tx.chainName}</span>
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
                    {tx.explorerUrl && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        asChild
                      >
                        <a href={tx.explorerUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeTransaction(tx.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
