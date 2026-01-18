/**
 * Hyperliquid Deposit/Withdraw Component
 * 
 * Allows users to deposit USDC from Arbitrum to Hyperliquid and withdraw back.
 */

import { memo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ExternalLink,
  Loader2,
  Wallet,
  AlertTriangle,
  Droplet,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface HyperliquidDepositWithdrawProps {
  isOpen: boolean;
  onClose: () => void;
  availableMargin: number;
  isTestnet?: boolean;
  onWithdraw?: (amount: number) => Promise<void>;
}

const HYPERLIQUID_BRIDGE_URL = 'https://app.hyperliquid.xyz/bridge';
const HYPERLIQUID_TESTNET_FAUCET = 'https://app.hyperliquid-testnet.xyz/drip';

export const HyperliquidDepositWithdraw = memo(function HyperliquidDepositWithdraw({
  isOpen,
  onClose,
  availableMargin,
  isTestnet = false,
  onWithdraw,
}: HyperliquidDepositWithdrawProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const withdrawAmountNum = parseFloat(withdrawAmount) || 0;
  const hasInsufficientBalance = withdrawAmountNum > availableMargin;
  const isValidWithdraw = withdrawAmountNum > 0 && !hasInsufficientBalance;

  const handleWithdraw = useCallback(async () => {
    if (!isValidWithdraw || !onWithdraw) return;
    
    setIsSubmitting(true);
    try {
      await onWithdraw(withdrawAmountNum);
      toast({
        title: 'Withdrawal Initiated',
        description: `$${withdrawAmountNum.toFixed(2)} USDC is being withdrawn to Arbitrum`,
      });
      setWithdrawAmount('');
      onClose();
    } catch (error) {
      toast({
        title: 'Withdrawal Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [withdrawAmountNum, isValidWithdraw, onWithdraw, toast, onClose]);

  const setMaxWithdraw = useCallback(() => {
    setWithdrawAmount(availableMargin.toFixed(2));
  }, [availableMargin]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="glass sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            {isTestnet ? 'Testnet Funds' : 'Deposit / Withdraw'}
          </DialogTitle>
          <DialogDescription>
            {isTestnet 
              ? 'Get testnet USDC to practice trading'
              : 'Manage your USDC on Hyperliquid L2'
            }
          </DialogDescription>
        </DialogHeader>
        
        {isTestnet ? (
          /* Testnet Mode - Show Faucet Link */
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Droplet className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">Testnet Faucet</h4>
                  <p className="text-xs text-muted-foreground">
                    Get free testnet USDC for practice
                  </p>
                </div>
              </div>
              
              <Button
                asChild
                className="w-full gap-2"
              >
                <a 
                  href={HYPERLIQUID_TESTNET_FAUCET} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <Droplet className="w-4 h-4" />
                  Get Testnet USDC
                  <ExternalLink className="w-3.5 h-3.5 ml-auto" />
                </a>
              </Button>
            </div>
            
            <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20 text-sm">
              <Info className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <p className="text-warning">
                Testnet funds have no real value. Use them to learn the platform risk-free.
              </p>
            </div>
            
            <div className="p-3 rounded-lg bg-secondary/50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Balance</span>
                <span className="font-mono">${availableMargin.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ) : (
          /* Mainnet Mode - Deposit/Withdraw Tabs */
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'deposit' | 'withdraw')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="deposit" className="gap-2">
                <ArrowDownToLine className="w-3.5 h-3.5" />
                Deposit
              </TabsTrigger>
              <TabsTrigger value="withdraw" className="gap-2">
                <ArrowUpFromLine className="w-3.5 h-3.5" />
                Withdraw
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="deposit" className="space-y-4 mt-4">
              <div className="p-4 rounded-lg bg-secondary/50 border border-border/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                    <ArrowDownToLine className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <h4 className="font-medium">Deposit USDC</h4>
                    <p className="text-xs text-muted-foreground">
                      Bridge from Arbitrum to Hyperliquid
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span>Use USDC on Arbitrum One</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span>~5 minute deposit time</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span>No deposit fees</span>
                  </div>
                </div>
                
                <Button
                  asChild
                  className="w-full gap-2"
                >
                  <a 
                    href={HYPERLIQUID_BRIDGE_URL} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <ArrowDownToLine className="w-4 h-4" />
                    Open Deposit Portal
                    <ExternalLink className="w-3.5 h-3.5 ml-auto" />
                  </a>
                </Button>
              </div>
              
              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-muted-foreground">
                  Deposits are made directly through Hyperliquid's official bridge for security.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="withdraw" className="space-y-4 mt-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Amount (USDC)</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={setMaxWithdraw}
                  >
                    Max
                  </Button>
                </div>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="font-mono"
                />
                
                <div className="p-3 rounded-lg bg-secondary/50 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Available</span>
                    <span className="font-mono">${availableMargin.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Destination</span>
                    <span>Arbitrum One</span>
                  </div>
                </div>
                
                {hasInsufficientBalance && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
                    <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                    <p className="text-destructive">Insufficient balance</p>
                  </div>
                )}
                
                <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20 text-sm">
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <p className="text-warning">
                    Withdrawals take ~15 minutes to arrive on Arbitrum.
                  </p>
                </div>
              </div>
              
              <Button
                className="w-full gap-2"
                onClick={handleWithdraw}
                disabled={!isValidWithdraw || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ArrowUpFromLine className="w-4 h-4" />
                    Withdraw ${withdrawAmountNum.toFixed(2)} USDC
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
});
