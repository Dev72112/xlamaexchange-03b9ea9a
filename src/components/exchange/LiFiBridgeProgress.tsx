import { CheckCircle2, Circle, Loader2, XCircle, ExternalLink, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LiFiBridgeTransaction, BridgeStatus } from '@/hooks/useLiFiSwapExecution';
import { cn } from '@/lib/utils';

interface LiFiBridgeProgressProps {
  transaction: LiFiBridgeTransaction;
  onClose?: () => void;
}

const statusSteps: { status: BridgeStatus; label: string; description?: string }[] = [
  { status: 'checking-approval', label: 'Checking Approval', description: 'Verifying token allowance...' },
  { status: 'awaiting-approval', label: 'Approval Required', description: 'Please approve token spending' },
  { status: 'approving', label: 'Approving Token', description: 'Waiting for approval confirmation...' },
  { status: 'pending-source', label: 'Submitting Bridge', description: 'Confirm transaction in wallet...' },
  { status: 'bridging', label: 'Bridging Assets', description: 'Cross-chain transfer in progress...' },
  { status: 'completed', label: 'Complete', description: 'Bridge successful!' },
];

const getExplorerUrl = (chainIndex: string, txHash: string): string => {
  const explorers: Record<string, string> = {
    '1': 'https://etherscan.io/tx/',
    '56': 'https://bscscan.com/tx/',
    '137': 'https://polygonscan.com/tx/',
    '42161': 'https://arbiscan.io/tx/',
    '10': 'https://optimistic.etherscan.io/tx/',
    '8453': 'https://basescan.org/tx/',
    '43114': 'https://snowtrace.io/tx/',
    '250': 'https://ftmscan.com/tx/',
    '324': 'https://explorer.zksync.io/tx/',
    '59144': 'https://lineascan.build/tx/',
    '534352': 'https://scrollscan.com/tx/',
    '5000': 'https://explorer.mantle.xyz/tx/',
    '81457': 'https://blastscan.io/tx/',
    '196': 'https://www.okx.com/explorer/xlayer/tx/',
    '1101': 'https://zkevm.polygonscan.com/tx/',
    '169': 'https://pacific-explorer.manta.network/tx/',
    '34443': 'https://explorer.mode.network/tx/',
  };
  
  const base = explorers[chainIndex] || 'https://etherscan.io/tx/';
  return `${base}${txHash}`;
};

export function LiFiBridgeProgress({ transaction, onClose }: LiFiBridgeProgressProps) {
  const { status, fromChain, toChain, fromToken, toToken, fromAmount, toAmount, sourceTxHash, destTxHash, bridgeName, estimatedTime, startTime, error } = transaction;

  const getStepStatus = (step: BridgeStatus): 'completed' | 'current' | 'pending' | 'error' => {
    if (status === 'failed') {
      const stepIndex = statusSteps.findIndex(s => s.status === step);
      const currentIndex = statusSteps.findIndex(s => s.status === status);
      if (stepIndex <= currentIndex) return 'error';
      return 'pending';
    }

    const stepIndex = statusSteps.findIndex(s => s.status === step);
    const currentIndex = statusSteps.findIndex(s => s.status === status);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  const progressPercent = () => {
    const statusOrder: BridgeStatus[] = ['checking-approval', 'awaiting-approval', 'approving', 'pending-source', 'bridging', 'completed'];
    const index = statusOrder.indexOf(status);
    if (index === -1) return 0;
    return ((index + 1) / statusOrder.length) * 100;
  };

  // Filter steps to only show relevant ones
  const visibleSteps = statusSteps.filter(s => {
    // Always hide awaiting-approval and approving if we're past them or never needed them
    if (s.status === 'awaiting-approval' || s.status === 'approving') {
      const approvalStatuses: BridgeStatus[] = ['awaiting-approval', 'approving'];
      return approvalStatuses.includes(status) || 
             (transaction.approvalInfo && ['checking-approval', 'awaiting-approval', 'approving'].includes(status));
    }
    return true;
  });

  const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="bg-card/95 backdrop-blur-sm border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            Bridge Progress
            {bridgeName && (
              <Badge variant="secondary" className="text-xs">{bridgeName}</Badge>
            )}
          </CardTitle>
          <Badge variant={status === 'completed' ? 'default' : status === 'failed' ? 'destructive' : 'secondary'}>
            {status === 'completed' ? 'Complete' : status === 'failed' ? 'Failed' : 'In Progress'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Token Flow */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
          <div className="flex items-center gap-2">
            {fromToken.logoURI && (
              <img src={fromToken.logoURI} alt={fromToken.symbol} className="w-6 h-6 rounded-full" />
            )}
            <div>
              <div className="font-mono text-sm">{parseFloat(fromAmount).toFixed(4)}</div>
              <div className="text-xs text-muted-foreground">{fromToken.symbol} on {fromChain.name}</div>
            </div>
          </div>
          <div className="text-muted-foreground">→</div>
          <div className="flex items-center gap-2">
            {toToken.logoURI && (
              <img src={toToken.logoURI} alt={toToken.symbol} className="w-6 h-6 rounded-full" />
            )}
            <div className="text-right">
              <div className="font-mono text-sm">{toAmount ? parseFloat(toAmount).toFixed(4) : '...'}</div>
              <div className="text-xs text-muted-foreground">{toToken.symbol} on {toChain.name}</div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <Progress value={progressPercent()} className="h-2" />

        {/* Steps */}
        <div className="space-y-3">
          {visibleSteps.map((step) => {
            const stepStatus = getStepStatus(step.status);
            const isApprovalStep = step.status === 'awaiting-approval' || step.status === 'approving';
            
            return (
              <div key={step.status} className={cn(
                "flex items-start gap-3 p-2 rounded-lg transition-colors",
                stepStatus === 'current' && "bg-primary/10",
                stepStatus === 'error' && "bg-destructive/10"
              )}>
                {stepStatus === 'completed' && (
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                )}
                {stepStatus === 'current' && (
                  <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0 mt-0.5" />
                )}
                {stepStatus === 'pending' && (
                  <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                )}
                {stepStatus === 'error' && (
                  <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-sm",
                      stepStatus === 'current' && "font-medium",
                      stepStatus === 'pending' && "text-muted-foreground"
                    )}>
                      {step.label}
                    </span>
                    {isApprovalStep && stepStatus === 'current' && (
                      <Badge variant="outline" className="text-[10px] py-0">Token Approval</Badge>
                    )}
                    {step.status === 'bridging' && stepStatus === 'current' && (
                      <Badge variant="outline" className="text-[10px] py-0">Cross-Chain</Badge>
                    )}
                  </div>
                  {stepStatus === 'current' && step.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Time Info */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            Elapsed: {formatTime(elapsedTime)}
          </div>
          {estimatedTime && status !== 'completed' && status !== 'failed' && (
            <div>Est. {Math.ceil(estimatedTime / 60)} min</div>
          )}
        </div>

        {/* Explorer Links */}
        <div className="space-y-2">
          {sourceTxHash && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => window.open(getExplorerUrl(fromChain.chainIndex, sourceTxHash), '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View on {fromChain.name}
            </Button>
          )}
          {destTxHash && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => window.open(getExplorerUrl(toChain.chainIndex, destTxHash), '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View on {toChain.name}
            </Button>
          )}
        </div>

        {onClose && status === 'completed' && (
          <Button onClick={onClose} className="w-full">
            Done
          </Button>
        )}

        {onClose && status === 'failed' && (
          <Button onClick={onClose} variant="outline" className="w-full">
            Close
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
