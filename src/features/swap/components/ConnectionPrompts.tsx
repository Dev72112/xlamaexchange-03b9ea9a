/**
 * ConnectionPrompts - Wallet and chain connection prompts
 */
import { Wallet, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WalletPromptProps {
  message?: string;
  description?: string;
}

export function WalletConnectionPrompt({
  message = 'Connect wallet to swap',
  description = 'View live quotes below • Connect when ready to trade',
}: WalletPromptProps) {
  return (
    <div className="mx-4 sm:mx-5 mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
      <div className="flex items-center gap-2 text-sm">
        <Wallet className="w-4 h-4 text-primary" />
        <span className="text-foreground">{message}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  );
}

interface ChainSwitchPromptProps {
  chainName: string;
  onSwitch: () => void;
}

export function ChainSwitchPrompt({ chainName, onSwitch }: ChainSwitchPromptProps) {
  return (
    <div className="mx-4 sm:mx-5 mt-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4 text-warning" />
          <span className="text-warning">Switch to {chainName}</span>
        </div>
        <Button size="sm" variant="outline" onClick={onSwitch} className="h-7 text-xs">
          Switch Network
        </Button>
      </div>
    </div>
  );
}

interface NonEvmInfoProps {
  chainName: string;
  isConnected: boolean;
}

export function NonEvmChainInfo({ chainName, isConnected }: NonEvmInfoProps) {
  return (
    <div className="mx-4 sm:mx-5 mt-3 p-3 bg-secondary/50 border border-border rounded-lg">
      <div className="flex items-center gap-2 text-sm">
        <Info className="w-4 h-4 text-muted-foreground" />
        <span className="text-foreground">
          {isConnected
            ? `For best experience on ${chainName}, use OKX Wallet`
            : `Connect OKX Wallet for seamless ${chainName} swaps`}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        OKX Wallet supports multi-chain swaps including {chainName}.
      </p>
    </div>
  );
}
