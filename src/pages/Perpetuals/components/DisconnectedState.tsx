/**
 * DisconnectedState Component
 * 
 * Displays connect wallet prompt and feature preview for disconnected users.
 */

import { memo, Suspense, lazy } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Activity, 
  TrendingUp, 
  BarChart3, 
  Layers, 
  Calculator, 
  HelpCircle,
  Wallet,
} from 'lucide-react';
import { MultiWalletButton } from '@/features/wallet';
import { GlowBar } from '@/components/ui/glow-bar';
import { EducationCollapsible } from '@/components/EducationCollapsible';

const PerpetualsHowItWorks = lazy(() => 
  import('@/components/perpetuals/PerpetualsHowItWorks').then(m => ({ default: m.PerpetualsHowItWorks }))
);

const perpsSteps = [
  { icon: Activity, title: "Open Position", description: "Choose Long or Short with your desired leverage." },
  { icon: Layers, title: "Manage", description: "Set stop loss, take profit, or add margin." },
  { icon: TrendingUp, title: "Monitor PnL", description: "Real-time profit tracking with live prices." },
  { icon: Wallet, title: "Deposit/Withdraw", description: "Manage your trading collateral on Hyperliquid." },
];

const perpsTips = [
  "Start with low leverage (1-5x) until you're comfortable",
  "Always set a stop loss to limit potential losses",
  "Funding rates are paid every 8 hours",
];

export const DisconnectedState = memo(function DisconnectedState() {
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

      {/* Education Collapsible */}
      <EducationCollapsible
        title="How Perpetuals Work"
        icon={HelpCircle}
        steps={perpsSteps}
        tips={perpsTips}
      />
    </div>
  );
});
