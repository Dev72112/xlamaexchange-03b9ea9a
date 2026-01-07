import { useState, useEffect } from "react";
import { ArrowLeft, Copy, Check, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Currency } from "@/data/currencies";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { changeNowService, Transaction, TransactionStatus } from "@/services/changenow";
import QRCode from "react-qr-code";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { useFeedback } from "@/hooks/useFeedback";

interface ExchangeFormProps {
  fromCurrency: Currency;
  toCurrency: Currency;
  fromAmount: string;
  toAmount: string;
  exchangeRate: number | null;
  rateType: "standard" | "fixed";
  rateId?: string;
  onBack: () => void;
}

type Step = "address" | "deposit" | "status";

export function ExchangeForm({
  fromCurrency,
  toCurrency,
  fromAmount,
  toAmount,
  exchangeRate,
  rateType,
  rateId,
  onBack,
}: ExchangeFormProps) {
  const { toast } = useToast();
  const { addTransaction, updateTransaction } = useTransactionHistory();
  const { triggerFeedback } = useFeedback();
  const [step, setStep] = useState<Step>("address");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [refundAddress, setRefundAddress] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [txStatus, setTxStatus] = useState<TransactionStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard" });
  };

  // Email validation regex
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleCreateExchange = async () => {
    if (!recipientAddress) {
      toast({
        title: "Address required",
        description: "Please enter your receiving wallet address",
        variant: "destructive",
      });
      return;
    }

    // Validate email if provided
    if (contactEmail && !isValidEmail(contactEmail)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    if (!agreedToTerms) {
      toast({
        title: "Terms required",
        description: "Please agree to the terms of use",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      const tx = await changeNowService.createTransaction({
        from: fromCurrency.ticker,
        to: toCurrency.ticker,
        address: recipientAddress,
        amount: parseFloat(fromAmount),
        refundAddress: refundAddress || undefined,
        contactEmail: contactEmail || undefined,
        rateId: rateType === "fixed" ? rateId : undefined,
        fixed: rateType === "fixed",
      });

      setTransaction(tx);
      setStep("deposit");

      // Save to transaction history
      addTransaction({
        id: tx.id,
        fromTicker: fromCurrency.ticker,
        toTicker: toCurrency.ticker,
        fromName: fromCurrency.name,
        toName: toCurrency.name,
        fromImage: fromCurrency.image,
        toImage: toCurrency.image,
        fromAmount: fromAmount,
        toAmount: toAmount,
        status: 'pending',
        payinAddress: tx.payinAddress,
        payoutAddress: recipientAddress,
      });

      toast({
        title: "Exchange created!",
        description: `Transaction ID: ${tx.id}`,
      });
    } catch (error) {
      console.error("Create transaction error:", error);
      const errorMessage = error instanceof Error ? error.message : "";
      
      // Map specific errors to user-friendly messages
      let displayMessage = "Please try again later.";
      let title = "Exchange Failed";
      
      if (errorMessage.includes('pair_is_inactive') || errorMessage.includes('pair is inactive')) {
        title = "Pair Unavailable";
        displayMessage = "This trading pair is currently unavailable. Please try a different pair.";
      } else if (errorMessage.includes('fixed_rate_not_enabled')) {
        title = "Fixed Rate Unavailable";
        displayMessage = "Fixed rate is not available for this pair. Please use floating rate.";
      } else if (errorMessage.includes('deposit_too_small')) {
        title = "Amount Too Small";
        displayMessage = "The amount is too small for this exchange. Please enter a larger amount.";
      } else if (errorMessage.includes('Edge Function') || errorMessage.includes('non-2xx')) {
        title = "Service Unavailable";
        displayMessage = "Exchange service is temporarily unavailable. Please try again in a moment.";
      } else if (errorMessage.includes('address') || errorMessage.includes('validation')) {
        title = "Invalid Address";
        displayMessage = "The wallet address appears to be invalid. Please check and try again.";
      } else if (errorMessage) {
        displayMessage = errorMessage;
      }
      
      toast({
        title,
        description: displayMessage,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const checkTransactionStatus = async () => {
    if (!transaction?.id) return;

    setIsCheckingStatus(true);
    try {
      const status = await changeNowService.getTransactionStatus(transaction.id);
      setTxStatus(status);
      
      // Update transaction in history
      if (status.status === 'finished') {
        // Trigger success feedback for completed swap
        triggerFeedback('success', 'heavy');
        updateTransaction(transaction.id, { status: 'completed' });
      } else if (status.status === 'failed' || status.status === 'refunded') {
        updateTransaction(transaction.id, { status: 'failed' });
      }
    } catch (error) {
      console.error("Status check error:", error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Poll for status updates when on status step
  useEffect(() => {
    if (step === "status" && transaction?.id) {
      checkTransactionStatus();
      const interval = setInterval(checkTransactionStatus, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }
  }, [step, transaction?.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "finished":
        return "text-success";
      case "failed":
      case "refunded":
        return "text-destructive";
      case "waiting":
      case "confirming":
        return "text-warning";
      case "exchanging":
      case "sending":
        return "text-primary";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "waiting":
        return "Awaiting deposit";
      case "confirming":
        return "Confirming deposit";
      case "exchanging":
        return "Exchanging";
      case "sending":
        return "Sending to your wallet";
      case "finished":
        return "Completed";
      case "failed":
        return "Failed";
      case "refunded":
        return "Refunded";
      default:
        return status;
    }
  };

  const renderStep = () => {
    switch (step) {
      case "address":
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="recipient">
                Your {toCurrency.name} ({toCurrency.ticker.toUpperCase()}) Address
              </Label>
              <Input
                id="recipient"
                placeholder={`Enter your ${toCurrency.ticker.toUpperCase()} wallet address`}
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Make sure this is the correct address. Funds sent to wrong address cannot be recovered.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refund">
                Refund Address (Optional)
              </Label>
              <Input
                id="refund"
                placeholder={`Enter ${fromCurrency.ticker.toUpperCase()} address for refunds`}
                value={refundAddress}
                onChange={(e) => setRefundAddress(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Used to refund your funds if the exchange cannot be completed.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email for Notifications (Optional)
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Receive transaction status updates via email from ChangeNow.
              </p>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
              />
              <Label htmlFor="terms" className="text-sm leading-relaxed">
                I agree to the{" "}
                <Link to="/terms" className="text-primary hover:underline" target="_blank">
                  Terms of Use
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-primary hover:underline" target="_blank">
                  Privacy Policy
                </Link>
              </Label>
            </div>

            <Button
              size="lg"
              className="w-full gradient-primary text-primary-foreground"
              onClick={handleCreateExchange}
              disabled={isCreating || !recipientAddress || !agreedToTerms}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating Exchange...
                </>
              ) : (
                "Confirm Exchange"
              )}
            </Button>
          </div>
        );

      case "deposit":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <img
                  src={fromCurrency.image}
                  alt={fromCurrency.name}
                  className="w-10 h-10"
                />
              </div>
              <h3 className="text-lg font-semibold">
                Send {fromAmount} {fromCurrency.ticker.toUpperCase()}
              </h3>
              <p className="text-sm text-muted-foreground">
                to the address below to complete your exchange
              </p>
            </div>

            <div className="space-y-2">
              <Label>Deposit Address</Label>
              <div className="flex gap-2">
                <Input
                  value={transaction?.payinAddress || ""}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(transaction?.payinAddress || "")}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* QR Code */}
            {transaction?.payinAddress && (
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-xl">
                  <QRCode value={transaction.payinAddress} size={180} />
                </div>
              </div>
            )}

            <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-warning">Important</p>
                  <p className="text-muted-foreground">
                    Send exactly {fromAmount} {fromCurrency.ticker.toUpperCase()}. 
                    Sending a different amount may result in delays or loss of funds.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-secondary/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transaction ID</span>
                <button
                  onClick={() => handleCopy(transaction?.id || "")}
                  className="font-mono text-primary flex items-center gap-1 hover:underline"
                >
                  {transaction?.id}
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setStep("status")}
            >
              I've Sent the Funds
            </Button>
          </div>
        );

      case "status":
        return (
          <div className="space-y-6 text-center">
            <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center animate-pulse-glow">
              {txStatus?.status === "finished" ? (
                <Check className="w-10 h-10 text-success" />
              ) : txStatus?.status === "failed" || txStatus?.status === "refunded" ? (
                <AlertCircle className="w-10 h-10 text-destructive" />
              ) : (
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold">
                {txStatus?.status === "finished" ? "Exchange Complete!" : 
                 txStatus?.status === "failed" ? "Exchange Failed" :
                 "Processing Your Exchange"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {txStatus?.status === "finished" 
                  ? "Your funds have been sent to your wallet"
                  : "This usually takes 1-5 minutes"}
              </p>
            </div>

            <div className="bg-secondary/50 rounded-lg p-4 space-y-3 text-left">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Transaction ID</span>
                <button
                  onClick={() => handleCopy(transaction?.id || "")}
                  className="font-mono text-primary flex items-center gap-1 hover:underline"
                >
                  {transaction?.id?.slice(0, 12)}...
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">You Send</span>
                <span className="font-medium">
                  {fromAmount} {fromCurrency.ticker.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">You Receive</span>
                <span className="font-medium">
                  ≈ {txStatus?.amountReceive || parseFloat(toAmount).toFixed(6)} {toCurrency.ticker.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className={`font-medium ${getStatusColor(txStatus?.status || "waiting")}`}>
                  {getStatusLabel(txStatus?.status || "waiting")}
                </span>
              </div>
              {txStatus?.payoutHash && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payout TX</span>
                  <span className="font-mono text-xs">{txStatus.payoutHash.slice(0, 16)}...</span>
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={checkTransactionStatus}
              disabled={isCheckingStatus}
              className="mx-auto"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isCheckingStatus ? "animate-spin" : ""}`} />
              Refresh Status
            </Button>

            <p className="text-xs text-muted-foreground">
              Save your transaction ID. You can use it to track your exchange status.
            </p>

            <Button variant="outline" className="w-full" onClick={onBack}>
              Start New Exchange
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto bg-card border border-border rounded-xl overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          {step === "address" && (
            <Button variant="ghost" size="icon" onClick={onBack} className="-ml-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <CardTitle className="text-xl">
            {step === "address" && "Enter Wallet Address"}
            {step === "deposit" && "Deposit Funds"}
            {step === "status" && "Exchange Status"}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Exchange Summary */}
        {step === "address" && (
          <div className="bg-secondary/50 rounded-lg p-4 flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <img src={fromCurrency.image} alt={fromCurrency.name} className="w-6 h-6" />
              <span className="font-medium">{fromAmount}</span>
              <span className="text-muted-foreground uppercase text-sm">{fromCurrency.ticker}</span>
            </div>
            <span className="text-muted-foreground">→</span>
            <div className="flex items-center gap-2">
              <img src={toCurrency.image} alt={toCurrency.name} className="w-6 h-6" />
              <span className="font-medium">{parseFloat(toAmount).toFixed(6)}</span>
              <span className="text-muted-foreground uppercase text-sm">{toCurrency.ticker}</span>
            </div>
          </div>
        )}

        {renderStep()}
      </CardContent>
    </Card>
  );
}
