/**
 * WrongNetworkState Component
 * 
 * Displays prompt to switch to EVM network for Hyperliquid trading.
 */

import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';

interface WrongNetworkStateProps {
  onSwitchToArbitrum: () => void;
  onSwitchToHyperEVM: () => void;
}

export const WrongNetworkState = memo(function WrongNetworkState({
  onSwitchToArbitrum,
  onSwitchToHyperEVM,
}: WrongNetworkStateProps) {
  return (
    <div className="max-w-xl mx-auto">
      <Card className="glass glow-sm border-warning/20">
        <CardContent className="pt-8 pb-8 text-center">
          <Wallet className="w-12 h-12 text-warning mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Switch to EVM Network</h3>
          <p className="text-sm text-muted-foreground mb-4">Hyperliquid requires an EVM wallet.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={onSwitchToArbitrum} className="gap-2">
              Switch to Arbitrum
            </Button>
            <Button variant="outline" onClick={onSwitchToHyperEVM} className="gap-2">
              Switch to HyperEVM
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
