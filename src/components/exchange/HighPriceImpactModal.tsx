import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface HighPriceImpactModalProps {
  priceImpact: number;
  fromSymbol: string;
  toSymbol: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function HighPriceImpactModal({
  priceImpact,
  fromSymbol,
  toSymbol,
  onConfirm,
  onCancel,
}: HighPriceImpactModalProps) {
  const isVeryHigh = priceImpact > 10;

  return (
    <div className="p-1">
      <DialogHeader className="text-center pb-4">
        <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <DialogTitle className="text-xl">
          High Price Impact Warning
        </DialogTitle>
        <DialogDescription className="text-center pt-2">
          This swap has a <span className="font-bold text-destructive">{priceImpact.toFixed(2)}%</span> price impact.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 my-6">
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive font-medium mb-2">
            {isVeryHigh ? "⚠️ Extreme Price Impact" : "⚠️ High Price Impact"}
          </p>
          <p className="text-sm text-muted-foreground">
            {isVeryHigh
              ? `Swapping ${fromSymbol} to ${toSymbol} at this amount will result in a significant loss of value. Consider reducing the swap amount or splitting it into smaller trades.`
              : `Due to low liquidity or large trade size, you will receive significantly less ${toSymbol} than the current market rate suggests.`}
          </p>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-destructive rounded-full" />
            <span className="text-muted-foreground">
              Price impact above {priceImpact > 10 ? "10%" : "5%"} is considered {priceImpact > 10 ? "very " : ""}high
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-warning rounded-full" />
            <span className="text-muted-foreground">
              Consider reducing trade size for better rates
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-muted-foreground rounded-full" />
            <span className="text-muted-foreground">
              This action cannot be undone once confirmed
            </span>
          </div>
        </div>
      </div>

      <DialogFooter className="flex-col sm:flex-row gap-2">
        <Button
          variant="outline"
          onClick={onCancel}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={onConfirm}
          className="w-full sm:w-auto"
        >
          I understand, proceed anyway
        </Button>
      </DialogFooter>
    </div>
  );
}
