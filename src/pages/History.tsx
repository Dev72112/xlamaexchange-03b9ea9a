import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Helmet } from "react-helmet-async";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { Clock, ArrowRight, ExternalLink, Trash2, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { TransactionCardsSkeleton } from "@/components/ContentSkeletons";


const History = () => {
  const { transactions, removeTransaction, clearHistory } = useTransactionHistory();
  const navigate = useNavigate();
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Brief loading state for perceived performance
  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="secondary" className="bg-success/20 text-success border-success/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case 'failed':
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

  return (
    <Layout>
      <Helmet>
        <title>Transaction History - xlama</title>
        <meta name="description" content="View your cryptocurrency exchange transaction history." />
      </Helmet>

      <div className="container px-4 py-12 sm:py-16 max-w-4xl">
        {/* Header */}
        <div className="mb-10 flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-primary/10">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold">Transaction History</h1>
            </div>
            <p className="text-muted-foreground">
              Your recent cryptocurrency exchanges. Transactions are stored locally in your browser.
            </p>
          </div>
          {transactions.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                if (confirm('Are you sure you want to clear all transaction history?')) {
                  clearHistory();
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>

        {/* Transaction List */}
        {isInitialLoading ? (
          <TransactionCardsSkeleton count={3} />
        ) : transactions.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Your completed exchanges will appear here. Start by making your first exchange.
            </p>
            <Button onClick={() => navigate('/')}>
              Start Exchange
            </Button>
          </Card>
        ) : (
          <div className="grid gap-3">
            {transactions.map((tx) => (
              <Card 
                key={tx.id}
                className="p-4 sm:p-5 hover:border-primary/30 transition-all group"
              >
                <div className="flex items-center gap-4">
                  {/* Pair Icons */}
                  <div className="flex items-center shrink-0">
                    <div className="relative">
                      <img
                        src={tx.fromImage}
                        alt={tx.fromName}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-background"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${tx.fromTicker}&background=random`;
                        }}
                      />
                    </div>
                    <div className="relative -ml-3">
                      <img
                        src={tx.toImage}
                        alt={tx.toName}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-background"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${tx.toTicker}&background=random`;
                        }}
                      />
                    </div>
                  </div>

                  {/* Transaction Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium">
                        {tx.fromAmount} <span className="uppercase text-muted-foreground">{tx.fromTicker}</span>
                      </span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-medium">
                        {parseFloat(tx.toAmount).toFixed(6)} <span className="uppercase text-muted-foreground">{tx.toTicker}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-mono text-xs truncate max-w-[100px]">
                        {tx.id}
                      </span>
                      <span>•</span>
                      <span>{formatDistanceToNow(tx.createdAt, { addSuffix: true })}</span>
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div className="flex items-center gap-3">
                    {getStatusBadge(tx.status)}
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-9 w-9 text-muted-foreground hover:text-destructive",
                        "opacity-0 group-hover:opacity-100 transition-opacity"
                      )}
                      onClick={() => removeTransaction(tx.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Summary */}
        {transactions.length > 0 && (
          <div className="mt-8 p-4 rounded-xl bg-secondary/30 border border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total transactions</span>
              <span className="font-medium">{transactions.length}</span>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default History;
