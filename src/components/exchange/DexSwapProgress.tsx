import { Check, Loader2, X, ExternalLink, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chain } from "@/data/chains";
import { cn } from "@/lib/utils";
import { SwapStep } from "@/hooks/useDexSwap";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
  'confirming': { label: 'Confirming', description: 'Waiting for blockchain confirmation...' },
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
  if (chainName.includes('solana')) return '~15-60s';
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
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="p-6 space-y-5 gpu-accelerated"
    >
      {/* Progress indicator with enhanced GPU-accelerated animation */}
      <div className="flex items-center justify-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center relative performance-critical",
            isComplete && "bg-success/20 market-bullish",
            isError && "bg-destructive/20 market-bearish",
            isActive && "bg-primary/20"
          )}
        >
          {/* Outer glow ring */}
          {(isActive || isComplete) && (
            <motion.div
              className={cn(
                "absolute inset-[-4px] rounded-full",
                isComplete ? "bg-success/10" : "bg-primary/10"
              )}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
          )}
          
          {/* Animated ring for active state - GPU optimized */}
          {isActive && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-primary/40"
                style={{ willChange: 'transform, opacity' }}
                animate={{ 
                  scale: [1, 1.15, 1], 
                  opacity: [0.6, 0.2, 0.6] 
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  ease: [0.4, 0, 0.2, 1]
                }}
              />
              <motion.div
                className="absolute inset-[-2px] rounded-full border border-primary/20"
                style={{ willChange: 'transform, opacity' }}
                animate={{ 
                  scale: [1, 1.25, 1], 
                  opacity: [0.4, 0, 0.4] 
                }}
                transition={{ 
                  duration: 2.5, 
                  repeat: Infinity, 
                  ease: [0.4, 0, 0.2, 1],
                  delay: 0.2
                }}
              />
            </>
          )}
          
          <AnimatePresence mode="wait">
            {isComplete ? (
              <motion.div
                key="complete"
                initial={{ scale: 0, rotate: -180, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 12 }}
                className="relative"
              >
                <motion.div
                  className="absolute inset-0 bg-success/30 rounded-full blur-xl"
                  initial={{ scale: 0 }}
                  animate={{ scale: 2 }}
                  transition={{ duration: 0.5 }}
                />
                <Check className="w-10 h-10 text-success relative z-10" />
              </motion.div>
            ) : isError ? (
              <motion.div
                key="error"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
              >
                <X className="w-10 h-10 text-destructive" />
              </motion.div>
            ) : (
              <motion.div 
                key="loading" 
                className="relative"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <Loader2 className="w-10 h-10 text-primary animate-spin" style={{ willChange: 'transform' }} />
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.7, 1, 0.7]
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Sparkles className="w-4 h-4 text-primary absolute -top-1 -right-1" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Status text with animation */}
      <motion.div 
        key={step}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <h3 className="font-semibold text-xl">{config.label}</h3>
        <p className="text-sm text-muted-foreground">{config.description}</p>
      </motion.div>

      {/* Confirmation timer for Solana */}
      {isConfirming && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-secondary/30 py-2 px-4 rounded-lg mx-auto w-fit"
        >
          <Clock className="w-4 h-4 animate-pulse" />
          <span className="font-mono">{elapsedTime}s</span>
          <span className="text-xs">• Est. {estimatedTime}</span>
        </motion.div>
      )}

      {/* Chain badge */}
      {isActive && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/50 rounded-full text-sm border border-border/50">
            {chain.icon && <img src={chain.icon} alt={chain.name} className="w-5 h-5 rounded-full" />}
            <span className="font-medium">{chain.name}</span>
          </div>
        </motion.div>
      )}

      {/* Error message */}
      {isError && error && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive"
        >
          {error}
        </motion.div>
      )}

      {/* Transaction hash with explorer link */}
      {txHash && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-secondary/50 rounded-xl space-y-2 border border-border/50"
        >
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Transaction</span>
            {explorerUrl ? (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-primary hover:text-primary/80 font-mono text-xs transition-colors"
              >
                {txHash.slice(0, 10)}...{txHash.slice(-8)}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <span className="font-mono text-xs">{txHash.slice(0, 10)}...{txHash.slice(-8)}</span>
            )}
          </div>
          {explorerUrl && (
            <div className="text-xs text-muted-foreground text-center pt-1">
              View on {explorerName}
            </div>
          )}
        </motion.div>
      )}

      {/* Step progress dots with animation */}
      {isActive && (
        <div className="flex items-center justify-center gap-3 pt-2">
          {['checking-allowance', 'approving', 'swapping', 'confirming'].map((s, i) => {
            const steps = ['checking-allowance', 'approving', 'swapping', 'confirming'];
            const currentIndex = steps.indexOf(step);
            const isStepComplete = i < currentIndex;
            const isStepActive = i === currentIndex;

            return (
              <motion.div
                key={s}
                initial={false}
                animate={{
                  scale: isStepActive ? 1.3 : 1,
                  opacity: isStepComplete || isStepActive ? 1 : 0.3,
                }}
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-colors",
                  isStepComplete && "bg-primary",
                  isStepActive && "bg-primary",
                  !isStepComplete && !isStepActive && "bg-muted"
                )}
              />
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {isComplete && (
          <>
            {explorerUrl && (
              <Button
                variant="outline"
                className="flex-1 h-11"
                onClick={() => window.open(explorerUrl, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View on {explorerName}
              </Button>
            )}
            <Button className="flex-1 h-11 gradient-primary text-primary-foreground" onClick={onClose}>
              Done
            </Button>
          </>
        )}
        {isError && (
          <>
            <Button variant="outline" className="flex-1 h-11" onClick={onClose}>
              Cancel
            </Button>
            <Button className="flex-1 h-11" onClick={onRetry}>
              Try Again
            </Button>
          </>
        )}
      </div>
    </motion.div>
  );
}
