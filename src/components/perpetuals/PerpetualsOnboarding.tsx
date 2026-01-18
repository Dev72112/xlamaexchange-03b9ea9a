/**
 * Perpetuals Onboarding Component
 * 
 * Checklist for first-time users to get started with trading.
 */

import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Check, 
  Circle, 
  Wallet, 
  DollarSign, 
  Shield, 
  ExternalLink,
  Loader2,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  loading?: boolean;
  action?: {
    label: string;
    onClick: () => void;
    external?: boolean;
  };
}

interface PerpetualsOnboardingProps {
  isWalletConnected: boolean;
  hasDeposit: boolean;
  isBuilderApproved: boolean;
  isTestnet: boolean;
  onApproveBuilder: () => void;
  builderApprovalLoading: boolean;
}

export const PerpetualsOnboarding = memo(function PerpetualsOnboarding({
  isWalletConnected,
  hasDeposit,
  isBuilderApproved,
  isTestnet,
  onApproveBuilder,
  builderApprovalLoading,
}: PerpetualsOnboardingProps) {
  const depositUrl = isTestnet 
    ? 'https://app.hyperliquid-testnet.xyz/drip'
    : 'https://app.hyperliquid.xyz/portfolio';

  const steps: OnboardingStep[] = [
    {
      id: 'wallet',
      title: 'Connect EVM Wallet',
      description: 'Connect MetaMask, OKX, or any EVM-compatible wallet',
      completed: isWalletConnected,
    },
    {
      id: 'deposit',
      title: isTestnet ? 'Get Testnet USDC' : 'Deposit USDC',
      description: isTestnet 
        ? 'Use the Hyperliquid testnet faucet to get test USDC'
        : 'Bridge USDC to Hyperliquid to start trading',
      completed: hasDeposit,
      action: {
        label: isTestnet ? 'Get Test Funds' : 'Deposit',
        onClick: () => window.open(depositUrl, '_blank'),
        external: true,
      },
    },
    {
      id: 'approve',
      title: 'Approve Platform Fee',
      description: 'One-time approval to enable trading with 0.01% fee',
      completed: isBuilderApproved,
      loading: builderApprovalLoading,
      action: isBuilderApproved ? undefined : {
        label: 'Approve Fee',
        onClick: onApproveBuilder,
      },
    },
  ];

  const completedSteps = steps.filter(s => s.completed).length;
  const allComplete = completedSteps === steps.length;

  if (allComplete) {
    return null; // Hide when onboarding complete
  }

  return (
    <Card className="glass border-primary/20 glow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Get Started
          </span>
          <Badge variant="outline" className="text-xs">
            {completedSteps}/{steps.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step, index) => (
          <div 
            key={step.id}
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg transition-colors",
              step.completed 
                ? "bg-success/5" 
                : "bg-secondary/30"
            )}
          >
            {/* Status Icon */}
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
              step.completed 
                ? "bg-success text-success-foreground" 
                : "border-2 border-muted-foreground/30"
            )}>
              {step.loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : step.completed ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <span className="text-xs font-medium text-muted-foreground">
                  {index + 1}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium",
                step.completed && "text-success"
              )}>
                {step.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {step.description}
              </p>
            </div>

            {/* Action Button */}
            {step.action && !step.completed && (
              <Button
                variant="outline"
                size="sm"
                onClick={step.action.onClick}
                disabled={step.loading}
                className="shrink-0 gap-1.5 text-xs h-7"
              >
                {step.loading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : step.action.external ? (
                  <ExternalLink className="w-3 h-3" />
                ) : null}
                {step.action.label}
              </Button>
            )}
          </div>
        ))}

        {/* Testnet Hint */}
        {isTestnet && (
          <div className="pt-2 text-center">
            <p className="text-xs text-muted-foreground">
              You're on <span className="text-warning font-medium">Testnet</span> — 
              no real funds required to practice trading.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
