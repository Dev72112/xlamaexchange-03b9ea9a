import { useState } from "react";
import { ArrowLeft, Copy, Check, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Currency } from "@/data/currencies";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";

interface ExchangeFormProps {
  fromCurrency: Currency;
  toCurrency: Currency;
  fromAmount: string;
  toAmount: string;
  exchangeRate: number | null;
  rateType: "standard" | "fixed";
  onBack: () => void;
}

type Step = "address" | "confirm" | "deposit" | "status";

export function ExchangeForm({
  fromCurrency,
  toCurrency,
  fromAmount,
  toAmount,
  exchangeRate,
  rateType,
  onBack,
}: ExchangeFormProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("address");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [refundAddress, setRefundAddress] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Mock deposit address (would come from API)
  const depositAddress = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";
  const transactionId = "a1b2c3d4e5f6";

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard" });
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

    if (!agreedToTerms) {
      toast({
        title: "Terms required",
        description: "Please agree to the terms of use",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsCreating(false);
    setStep("deposit");
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
                  value={depositAddress}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(depositAddress)}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* QR Code Placeholder */}
            <div className="flex justify-center">
              <div className="w-48 h-48 bg-secondary rounded-xl flex items-center justify-center border-2 border-dashed border-border">
                <div className="text-center text-muted-foreground">
                  <div className="text-4xl mb-2">📱</div>
                  <p className="text-xs">QR Code</p>
                  <p className="text-xs">(API integration pending)</p>
                </div>
              </div>
            </div>

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
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>

            <div>
              <h3 className="text-lg font-semibold">Processing Your Exchange</h3>
              <p className="text-sm text-muted-foreground mt-1">
                This usually takes 10-30 minutes
              </p>
            </div>

            <div className="bg-secondary/50 rounded-lg p-4 space-y-3 text-left">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Transaction ID</span>
                <button
                  onClick={() => handleCopy(transactionId)}
                  className="font-mono text-primary flex items-center gap-1 hover:underline"
                >
                  {transactionId}
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
                  ≈ {parseFloat(toAmount).toFixed(6)} {toCurrency.ticker.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="text-warning font-medium">Awaiting deposit</span>
              </div>
            </div>

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
    <Card className="w-full max-w-lg mx-auto glass glow">
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
