import { Check, Loader2, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chain } from "@/data/chains";
import { cn } from "@/lib/utils";

type SwapStep = 'idle' | 'checking-approval' | 'approving' | 'swapping' | 'confirming' | 'complete' | 'error';

interface DexSwapProgressProps {
  step: SwapStep;
  txHash: string | null;
  error: string | null;
  chain: Chain;
  onClose: () => void;
  onRetry: () => void;
}

const STEP_CONFIG: Record<SwapStep, { label: string; description: string }> = {
  'idle': { label: 'Ready', description: 'Ready to swap' },
  'checking-approval': { label: 'Checking Approval', description: 'Checking token allowance...' },
  'approving': { label: 'Approving', description: 'Please approve the token spend in your wallet' },
  'swapping': { label: 'Swapping', description: 'Please confirm the swap in your wallet' },
  'confirming': { label: 'Confirming', description: 'Waiting for transaction confirmation...' },
  'complete': { label: 'Complete', description: 'Swap completed successfully!' },
  'error': { label: 'Error', description: 'Something went wrong' },
};

export function DexSwapProgress({
  step,
  txHash,
  error,
  chain,
  onClose,
  onRetry,
}: DexSwapProgressProps) {
  const config = STEP_CONFIG[step];
  const isActive = step !== 'idle' && step !== 'complete' && step !== 'error';
  const isComplete = step === 'complete';
  const isError = step === 'error';

  const explorerUrl = txHash ? `${chain.blockExplorer}/tx/${txHash}` : null;

  return (
    <div className="p-4 space-y-4">
      {/* Progress indicator */}
      <div className="flex items-center justify-center">
        <div className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center",
          isComplete && "bg-success/20",
          isError && "bg-destructive/20",
          isActive && "bg-primary/20"
        )}>
          {isComplete ? (
            <Check className="w-8 h-8 text-success" />
          ) : isError ? (
            <X className="w-8 h-8 text-destructive" />
          ) : (
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          )}
        </div>
      </div>

      {/* Status text */}
      <div className="text-center space-y-1">
        <h3 className="font-semibold text-lg">{config.label}</h3>
        <p className="text-sm text-muted-foreground">{config.description}</p>
      </div>

      {/* Error message */}
      {isError && error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Transaction hash */}
      {txHash && (
        <div className="p-3 bg-secondary/50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Transaction</span>
            <a
              href={explorerUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline font-mono text-xs"
            >
              {txHash.slice(0, 10)}...{txHash.slice(-8)}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {/* Step progress */}
      {isActive && (
        <div className="flex items-center justify-center gap-2">
          {['approving', 'swapping', 'confirming'].map((s, i) => {
            const steps = ['approving', 'swapping', 'confirming'];
            const currentIndex = steps.indexOf(step);
            const stepIndex = i;
            const isStepComplete = stepIndex < currentIndex;
            const isStepActive = stepIndex === currentIndex;

            return (
              <div
                key={s}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  isStepComplete && "bg-primary",
                  isStepActive && "bg-primary animate-pulse w-3",
                  !isStepComplete && !isStepActive && "bg-muted"
                )}
              />
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {isComplete && (
          <>
            {explorerUrl && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.open(explorerUrl, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Transaction
              </Button>
            )}
            <Button className="flex-1" onClick={onClose}>
              Done
            </Button>
          </>
        )}
        {isError && (
          <>
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={onRetry}>
              Try Again
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
