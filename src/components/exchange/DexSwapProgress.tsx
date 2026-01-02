import { Check, Loader2, X, ExternalLink, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chain } from "@/data/chains";
import { cn } from "@/lib/utils";
import { SwapStep } from "@/hooks/useDexSwap";
import { useEffect, useState } from "react";

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
  'checking-allowance': { label: 'Checking Allowance', description: 'Verifying token approval...' },
  'approving': { label: 'Approving', description: 'Please approve the token spend in your wallet' },
  'swapping': { label: 'Swapping', description: 'Please confirm the swap in your wallet' },
  'confirming': { label: 'Confirming', description: 'Waiting for transaction confirmation...' },
  'complete': { label: 'Complete', description: 'Swap completed successfully!' },
  'error': { label: 'Error', description: 'Something went wrong' },
};

// Block explorer URLs for non-EVM chains
const NON_EVM_EXPLORERS: Record<string, { name: string; txPath: string; url: string }> = {
  'solana': { name: 'Solscan', txPath: '/tx/', url: 'https://solscan.io' },
  'sui': { name: 'SuiScan', txPath: '/tx/', url: 'https://suiscan.xyz/mainnet' },
  'ton': { name: 'TONScan', txPath: '/tx/', url: 'https://tonscan.org' },
  'tron': { name: 'TronScan', txPath: '/#/transaction/', url: 'https://tronscan.org' },
};

function getExplorerInfo(chain: Chain, txHash: string | null): { url: string | null; name: string } {
  if (!txHash) return { url: null, name: 'Explorer' };
  
  if (chain.isEvm && chain.blockExplorer) {
    return { url: `${chain.blockExplorer}/tx/${txHash}`, name: 'Explorer' };
  }
  
  const chainName = chain.name.toLowerCase();
  for (const [key, explorer] of Object.entries(NON_EVM_EXPLORERS)) {
    if (chainName.includes(key)) {
      return { url: `${explorer.url}${explorer.txPath}${txHash}`, name: explorer.name };
    }
  }
  
  return { url: null, name: 'Explorer' };
}

function getEstimatedTime(chain: Chain): string {
  const chainName = chain.name.toLowerCase();
  if (chainName.includes('solana')) return '~1s';
  if (chainName.includes('sui')) return '~2s';
  if (chainName.includes('ton')) return '~5s';
  if (chainName.includes('tron')) return '~3s';
  if (chainName.includes('arbitrum') || chainName.includes('optimism') || chainName.includes('base')) return '~2s';
  if (chainName.includes('polygon')) return '~2s';
  if (chainName.includes('bsc') || chainName.includes('bnb')) return '~3s';
  if (chainName.includes('ethereum')) return '~12s';
  return '~5s';
}

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
  const isConfirming = step === 'confirming';

  const [elapsedTime, setElapsedTime] = useState(0);
  const { url: explorerUrl, name: explorerName } = getExplorerInfo(chain, txHash);
  const estimatedTime = getEstimatedTime(chain);

  useEffect(() => {
    if (!isConfirming) {
      setElapsedTime(0);
      return;
    }
    const interval = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [isConfirming]);

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

      {/* Confirmation timer for non-EVM */}
      {isConfirming && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{elapsedTime}s elapsed • Est. {estimatedTime}</span>
        </div>
      )}

      {/* Chain badge */}
      {isActive && (
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary/50 rounded-full text-xs">
            {chain.icon && <img src={chain.icon} alt={chain.name} className="w-4 h-4 rounded-full" />}
            <span className="text-muted-foreground">{chain.name}</span>
          </div>
        </div>
      )}

      {/* Error message */}
      {isError && error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Transaction hash with explorer link */}
      {txHash && (
        <div className="p-3 bg-secondary/50 rounded-lg space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Transaction</span>
            {explorerUrl ? (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline font-mono text-xs"
              >
                {txHash.slice(0, 10)}...{txHash.slice(-8)}
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <span className="font-mono text-xs">{txHash.slice(0, 10)}...{txHash.slice(-8)}</span>
            )}
          </div>
          {explorerUrl && (
            <div className="text-xs text-muted-foreground text-center">
              View on {explorerName}
            </div>
          )}
        </div>
      )}

      {/* Step progress dots */}
      {isActive && (
        <div className="flex items-center justify-center gap-2">
          {['checking-allowance', 'approving', 'swapping', 'confirming'].map((s, i) => {
            const steps = ['checking-allowance', 'approving', 'swapping', 'confirming'];
            const currentIndex = steps.indexOf(step);
            const isStepComplete = i < currentIndex;
            const isStepActive = i === currentIndex;

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
                View on {explorerName}
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
