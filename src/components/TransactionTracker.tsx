import { useState } from "react";
import { Search, Loader2, CheckCircle2, Clock, AlertCircle, ArrowRight, ExternalLink, Copy, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { changeNowService, TransactionStatus } from "@/services/changenow";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  new: { label: "Awaiting Deposit", color: "bg-muted text-muted-foreground", icon: Clock },
  waiting: { label: "Awaiting Deposit", color: "bg-muted text-muted-foreground", icon: Clock },
  confirming: { label: "Confirming", color: "bg-warning/20 text-warning", icon: Clock },
  exchanging: { label: "Exchanging", color: "bg-primary/20 text-primary", icon: Loader2 },
  sending: { label: "Sending", color: "bg-primary/20 text-primary", icon: Loader2 },
  finished: { label: "Completed", color: "bg-success/20 text-success", icon: CheckCircle2 },
  failed: { label: "Failed", color: "bg-destructive/20 text-destructive", icon: AlertCircle },
  refunded: { label: "Refunded", color: "bg-muted text-muted-foreground", icon: AlertCircle },
  expired: { label: "Expired", color: "bg-destructive/20 text-destructive", icon: AlertCircle },
};

export function TransactionTracker() {
  const { toast } = useToast();
  const [transactionId, setTransactionId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [transaction, setTransaction] = useState<TransactionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!transactionId.trim()) {
      toast({
        title: "Enter Transaction ID",
        description: "Please enter a valid transaction ID to track",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setTransaction(null);

    try {
      const status = await changeNowService.getTransactionStatus(transactionId.trim());
      setTransaction(status);
    } catch (err: any) {
      console.error("Failed to fetch transaction:", err);
      setError(err?.message || "Transaction not found. Please check the ID and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getStatusInfo = (status: string) => {
    return statusConfig[status.toLowerCase()] || statusConfig.new;
  };

  const StatusIcon = transaction ? getStatusInfo(transaction.status).icon : Clock;

  return (
    <section className="py-12 border-t border-border">
      <div className="container px-4 sm:px-6">
        <Card className="bg-card border-border max-w-2xl mx-auto">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              Track Transaction
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your transaction ID to check the status of your exchange
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Enter transaction ID..."
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Transaction Details */}
            {transaction && (
              <div className="space-y-4 pt-2">
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge className={cn("gap-1.5", getStatusInfo(transaction.status).color)}>
                    <StatusIcon className={cn("w-3.5 h-3.5", transaction.status === "exchanging" || transaction.status === "sending" ? "animate-spin" : "")} />
                    {getStatusInfo(transaction.status).label}
                  </Badge>
                </div>

                {/* Exchange Details */}
                <div className="p-4 bg-secondary/30 rounded-xl space-y-3">
                  <div className="flex items-center justify-center gap-3">
                    <div className="text-center">
                      <p className="text-lg font-semibold">
                        {transaction.amountSend} <span className="uppercase">{transaction.fromCurrency}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">You send</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-lg font-semibold">
                        {transaction.amountReceive} <span className="uppercase">{transaction.toCurrency}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">You receive</p>
                    </div>
                  </div>
                </div>

                {/* Address Details */}
                <div className="space-y-3">
                  {/* Deposit Address */}
                  <div className="flex items-center justify-between gap-2 p-3 bg-secondary/20 rounded-lg">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Deposit Address</p>
                      <p className="text-sm font-mono truncate">{transaction.payinAddress}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-8 w-8"
                      onClick={() => handleCopy(transaction.payinAddress, "payin")}
                    >
                      {copiedField === "payin" ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  {/* Payout Address */}
                  <div className="flex items-center justify-between gap-2 p-3 bg-secondary/20 rounded-lg">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Recipient Address</p>
                      <p className="text-sm font-mono truncate">{transaction.payoutAddress}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-8 w-8"
                      onClick={() => handleCopy(transaction.payoutAddress, "payout")}
                    >
                      {copiedField === "payout" ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Transaction Hashes */}
                {(transaction.payinHash || transaction.payoutHash) && (
                  <div className="space-y-2">
                    {transaction.payinHash && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Deposit TX</span>
                        <a
                          href={`https://blockchair.com/search?q=${transaction.payinHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline font-mono text-xs"
                        >
                          {transaction.payinHash.slice(0, 8)}...{transaction.payinHash.slice(-8)}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                    {transaction.payoutHash && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Payout TX</span>
                        <a
                          href={`https://blockchair.com/search?q=${transaction.payoutHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline font-mono text-xs"
                        >
                          {transaction.payoutHash.slice(0, 8)}...{transaction.payoutHash.slice(-8)}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Transaction ID */}
                <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                  <span className="text-muted-foreground">Transaction ID</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{transaction.id}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleCopy(transaction.id, "id")}
                    >
                      {copiedField === "id" ? (
                        <Check className="w-3 h-3 text-success" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Refresh Button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleSearch}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Refresh Status
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
