import { useState, useMemo } from 'react';
import { Target, Clock, AlertTriangle, Loader2, Shield, Info, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLimitOrders } from '@/features/orders';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { OkxToken } from '@/services/okxdex';
import { Chain } from '@/data/chains';
import { cn } from '@/shared/lib';
import { useTokenBalance } from '@/hooks/useTokenBalance';
import { Badge } from '@/components/ui/badge';

// Solana chain index
const SOLANA_CHAIN_INDEX = '501';

interface LimitOrderFormProps {
  fromToken?: OkxToken | null;
  toToken?: OkxToken | null;
  chain?: Chain | null;
  currentPrice?: number;
  className?: string;
}

const EXPIRATION_OPTIONS = [
  { label: '24 hours', value: 24 },
  { label: '7 days', value: 168 },
  { label: '30 days', value: 720 },
  { label: 'Never', value: null },
];

export function LimitOrderForm({ 
  fromToken, 
  toToken, 
  chain, 
  currentPrice,
  className 
}: LimitOrderFormProps) {
  const { isConnected, isOkxConnected, activeChainType } = useMultiWallet();
  const { createOrder, createJupiterOrder, isSigning } = useLimitOrders();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [expirationHours, setExpirationHours] = useState<number | null>(168);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if this is a Solana order
  const isSolana = chain?.chainIndex === SOLANA_CHAIN_INDEX || activeChainType === 'solana';

  // Get token balance for validation
  const { formatted: fromTokenBalance } = useTokenBalance(
    fromToken,
    chain?.chainIndex || ''
  );

  // Check for insufficient balance
  const hasInsufficientBalance = useMemo(() => {
    if (!fromTokenBalance || !amount) return false;
    if (fromTokenBalance === '< 0.000001' || fromTokenBalance === '0') return parseFloat(amount) > 0;
    const balance = parseFloat(fromTokenBalance);
    const amountNum = parseFloat(amount);
    return !isNaN(balance) && !isNaN(amountNum) && amountNum > balance;
  }, [fromTokenBalance, amount]);

  const handleSubmit = async () => {
    if (!fromToken || !toToken || !chain || !amount || !targetPrice) return;
    
    setIsSubmitting(true);
    
    try {
      // For Solana, use Jupiter on-chain limit orders
      if (isSolana) {
        // Calculate taking amount based on target price
        // makingAmount = amount in smallest units
        // takingAmount = expected output based on target price
        const decimals = typeof fromToken.decimals === 'number' ? fromToken.decimals : 9;
        const outputDecimals = typeof toToken.decimals === 'number' ? toToken.decimals : 6;
        const amountInSmallest = convertToSmallestUnits(amount, decimals);
        const takingAmount = calculateTakingAmount(
          parseFloat(amount),
          parseFloat(targetPrice),
          outputDecimals
        );

        const expiresAt = expirationHours 
          ? Math.floor(Date.now() / 1000) + (expirationHours * 60 * 60)
          : undefined;

        const result = await createJupiterOrder({
          inputMint: fromToken.tokenContractAddress,
          outputMint: toToken.tokenContractAddress,
          makingAmount: amountInSmallest,
          takingAmount,
          expiredAt: expiresAt,
        });

        if (result) {
          setOpen(false);
          setAmount('');
          setTargetPrice('');
        }
      } else {
        // EVM chains - Hyperliquid integration coming soon
        // Show message and close dialog
        setOpen(false);
        return;
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const adjustPrice = (percent: number) => {
    if (!currentPrice) return;
    const adjusted = currentPrice * (1 + percent / 100);
    setTargetPrice(adjusted.toFixed(8));
  };

  if (!isConnected || !fromToken || !toToken || !chain) {
    return null;
  }

  // For Solana without OKX wallet, show coming soon (we need a Solana wallet to sign)
  if (isSolana && !isOkxConnected && activeChainType !== 'solana') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={cn("gap-1.5 opacity-60 cursor-not-allowed", className)}
            disabled
          >
            <Target className="w-3.5 h-3.5" />
            Limit Order
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Connect a Solana wallet for Jupiter limit orders</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // For EVM chains, show Hyperliquid coming soon
  if (!isSolana) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={cn("gap-1.5", className)}
            onClick={() => window.open('/perpetuals', '_self')}
          >
            <Target className="w-3.5 h-3.5" />
            Limit Order
            <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">
              Hyperliquid
            </Badge>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>EVM limit orders via Hyperliquid Perpetuals</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-1.5", className)}>
          <Target className="w-3.5 h-3.5" />
          Limit Order
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Create Limit Order
            {isSolana && (
              <Badge variant="secondary" className="ml-2 gap-1 bg-primary/10 text-primary">
                <Zap className="w-3 h-3" />
                Jupiter On-Chain
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Token pair info */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
            <span className="text-sm">{fromToken.tokenSymbol} → {toToken.tokenSymbol}</span>
            <span className="text-sm text-muted-foreground">{chain.name}</span>
          </div>

          {/* Balance info for Solana */}
          {isSolana && fromTokenBalance && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Available Balance:</span>
                <span className="font-mono font-medium">{fromTokenBalance} {fromToken.tokenSymbol}</span>
              </div>
              {isSolana && (
                <p className="text-xs text-muted-foreground mt-1">
                  <Zap className="w-3 h-3 inline mr-1" />
                  Tokens will be locked in Jupiter until filled or cancelled
                </p>
              )}
            </div>
          )}

          {/* Insufficient balance warning */}
          {hasInsufficientBalance && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-destructive">
                Insufficient balance. You have {fromTokenBalance} {fromToken.tokenSymbol}.
              </p>
            </div>
          )}

          {/* Amount */}
          <div className="space-y-2">
            <Label>Amount ({fromToken.tokenSymbol})</Label>
            <Input
              type="number"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="font-mono"
            />
          </div>

          {/* Condition - Only show for non-Solana (Jupiter uses takingAmount for price) */}
          {!isSolana && (
            <div className="space-y-2">
              <Label>Trigger When Price Is</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={condition === 'above' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setCondition('above')}
                >
                  Above
                </Button>
                <Button
                  type="button"
                  variant={condition === 'below' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setCondition('below')}
                >
                  Below
                </Button>
              </div>
            </div>
          )}

          {/* Target Price */}
          <div className="space-y-2">
            <Label>{isSolana ? 'Minimum Price per Token (USD)' : 'Target Price (USD)'}</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="font-mono"
            />
            {currentPrice && (
              <div className="flex gap-1 flex-wrap">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => adjustPrice(-5)}
                >
                  -5%
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => adjustPrice(-2)}
                >
                  -2%
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setTargetPrice(currentPrice.toString())}
                >
                  Current
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => adjustPrice(2)}
                >
                  +2%
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => adjustPrice(5)}
                >
                  +5%
                </Button>
              </div>
            )}
            {currentPrice && (
              <p className="text-xs text-muted-foreground">
                Current: ${currentPrice.toFixed(6)}
              </p>
            )}
          </div>

          {/* Expiration */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Expires After
            </Label>
            <Select 
              value={expirationHours?.toString() || 'never'} 
              onValueChange={(v) => setExpirationHours(v === 'never' ? null : parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPIRATION_OPTIONS.map(opt => (
                  <SelectItem key={opt.label} value={opt.value?.toString() || 'never'}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Execution Info */}
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 flex gap-2 text-sm">
            <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-primary">
              {isSolana 
                ? 'Jupiter keepers will automatically execute when your price is reached.'
                : 'You\'ll sign a message with your wallet to verify order creation.'
              }
            </p>
          </div>

          {/* Warning for EVM */}
          {!isSolana && (
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
              <p className="text-yellow-700 dark:text-yellow-500">
                You'll receive a notification when triggered. Manual execution required.
              </p>
            </div>
          )}

          <Button 
            className="w-full" 
            onClick={handleSubmit}
            disabled={!amount || !targetPrice || isSubmitting || isSigning || hasInsufficientBalance}
          >
            {isSigning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isSolana ? 'Sign Transaction...' : 'Sign in Wallet...'}
              </>
            ) : isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                {isSolana ? <Zap className="w-4 h-4 mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
                {isSolana ? 'Create Jupiter Order' : 'Create Signed Order'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper: Convert human amount to smallest units
function convertToSmallestUnits(amount: string, decimals: number): string {
  if (!amount || isNaN(parseFloat(amount))) return '0';
  const [whole, fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  const combined = whole + paddedFraction;
  return combined.replace(/^0+/, '') || '0';
}

// Helper: Calculate taking amount based on target price
function calculateTakingAmount(amount: number, targetPrice: number, outputDecimals: number): string {
  // amount * targetPrice = expected output
  const expectedOutput = amount * targetPrice;
  const scaledOutput = Math.floor(expectedOutput * Math.pow(10, outputDecimals));
  return scaledOutput.toString();
}
