/**
 * DisconnectedState Component
 * 
 * Displays connect wallet prompt and feature preview for disconnected users.
 */

import { memo, useState, Suspense, lazy } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Activity, 
  TrendingUp, 
  BarChart3, 
  Layers, 
  Calculator, 
  HelpCircle, 
  ChevronDown 
} from 'lucide-react';
import { MultiWalletButton } from '@/features/wallet';
import { GlowBar } from '@/components/ui/glow-bar';
import { cn } from '@/lib/utils';

const PerpetualsHowItWorks = lazy(() => 
  import('@/components/perpetuals/PerpetualsHowItWorks').then(m => ({ default: m.PerpetualsHowItWorks }))
);

export const DisconnectedState = memo(function DisconnectedState() {
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Card className="glass glow-sm border-primary/10 sweep-effect glow-border-animated overflow-hidden">
        <GlowBar variant="multi" />
        <CardContent className="pt-8 pb-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-4 glow-sm">
            <Activity className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
          <p className="text-sm text-muted-foreground mb-2">
            We recommend <span className="text-primary font-medium">OKX Wallet</span> for the best multi-chain experience.
          </p>
          <p className="text-xs text-muted-foreground mb-6">
            Connect to start trading perpetuals with up to 50x leverage.
          </p>
          <MultiWalletButton />
          <p className="text-xs text-muted-foreground mt-3">Other wallets supported via WalletConnect</p>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground mb-4">
        What you'll get access to:
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="glass-subtle border-border/50">
          <CardContent className="pt-4 pb-4 text-center">
            <TrendingUp className="w-6 h-6 text-primary mx-auto mb-2" />
            <h4 className="font-medium text-sm">50x Leverage</h4>
            <p className="text-xs text-muted-foreground">Trade with maximum leverage</p>
          </CardContent>
        </Card>
        <Card className="glass-subtle border-border/50">
          <CardContent className="pt-4 pb-4 text-center">
            <BarChart3 className="w-6 h-6 text-primary mx-auto mb-2" />
            <h4 className="font-medium text-sm">Live Charts</h4>
            <p className="text-xs text-muted-foreground">Real-time candlestick data</p>
          </CardContent>
        </Card>
        <Card className="glass-subtle border-border/50">
          <CardContent className="pt-4 pb-4 text-center">
            <Layers className="w-6 h-6 text-primary mx-auto mb-2" />
            <h4 className="font-medium text-sm">Position Management</h4>
            <p className="text-xs text-muted-foreground">SL/TP and margin control</p>
          </CardContent>
        </Card>
        <Card className="glass-subtle border-border/50">
          <CardContent className="pt-4 pb-4 text-center">
            <Calculator className="w-6 h-6 text-primary mx-auto mb-2" />
            <h4 className="font-medium text-sm">PnL Calculator</h4>
            <p className="text-xs text-muted-foreground">Plan trades before execution</p>
          </CardContent>
        </Card>
      </div>

      {/* How Perpetuals Work - Collapsible Education */}
      <Collapsible open={showHowItWorks} onOpenChange={setShowHowItWorks}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between h-12 glass-subtle mb-2">
            <span className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-primary" />
              How Perpetual Trading Works
            </span>
            <ChevronDown className={cn(
              "w-4 h-4 transition-transform",
              showHowItWorks && "rotate-180"
            )} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <Suspense fallback={<div className="h-48 skeleton-shimmer rounded-lg" />}>
            <PerpetualsHowItWorks />
          </Suspense>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
});
