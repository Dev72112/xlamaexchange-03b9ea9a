/**
 * Network Toggle Component
 * 
 * Switch between Hyperliquid testnet and mainnet.
 */

import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  TestTube2, 
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NetworkToggleProps {
  isTestnet: boolean;
  onToggle: (testnet: boolean) => void;
  className?: string;
}

export const NetworkToggle = memo(function NetworkToggle({
  isTestnet,
  onToggle,
  className,
}: NetworkToggleProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingNetwork, setPendingNetwork] = useState<boolean | null>(null);

  const handleToggle = (newTestnet: boolean) => {
    // Switching from testnet to mainnet requires confirmation
    if (isTestnet && !newTestnet) {
      setPendingNetwork(false);
      setShowConfirm(true);
    } else {
      onToggle(newTestnet);
    }
  };

  const confirmSwitch = () => {
    if (pendingNetwork !== null) {
      onToggle(pendingNetwork);
    }
    setShowConfirm(false);
    setPendingNetwork(null);
  };

  return (
    <>
      <div className={cn("flex items-center gap-1 p-1 rounded-lg bg-secondary/50", className)}>
        <Button
          variant={isTestnet ? "default" : "ghost"}
          size="sm"
          onClick={() => handleToggle(true)}
          className={cn(
            "gap-1.5 h-8",
            isTestnet && "bg-warning/20 text-warning hover:bg-warning/30 hover:text-warning"
          )}
        >
          <TestTube2 className="w-3.5 h-3.5" />
          Testnet
        </Button>
        <Button
          variant={!isTestnet ? "default" : "ghost"}
          size="sm"
          onClick={() => handleToggle(false)}
          className={cn(
            "gap-1.5 h-8",
            !isTestnet && "bg-success/20 text-success hover:bg-success/30 hover:text-success"
          )}
        >
          <Zap className="w-3.5 h-3.5" />
          Mainnet
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="glass">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Switch to Mainnet?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to switch to <strong>mainnet</strong> where you'll be trading with 
              <strong> real funds</strong>. Make sure you understand the risks of leveraged trading.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-2">
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-sm space-y-2">
              <p className="text-warning font-medium">⚠️ Real Money Warning</p>
              <ul className="text-warning/80 text-xs space-y-1 list-disc list-inside">
                <li>Trades will use real USDC from your Hyperliquid account</li>
                <li>Losses are permanent and cannot be recovered</li>
                <li>Liquidations can result in total loss of margin</li>
              </ul>
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Stay on Testnet</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSwitch}
              className="bg-success hover:bg-success/90 text-success-foreground"
            >
              Switch to Mainnet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
