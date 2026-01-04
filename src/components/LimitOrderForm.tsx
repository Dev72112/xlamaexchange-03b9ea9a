import { useState } from 'react';
import { Target, Clock, AlertTriangle, Loader2, Shield } from 'lucide-react';
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
import { useLimitOrders } from '@/hooks/useLimitOrders';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { OkxToken } from '@/services/okxdex';
import { Chain } from '@/data/chains';
import { cn } from '@/lib/utils';

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
  const { isConnected } = useMultiWallet();
  const { createOrder, isSigning } = useLimitOrders();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [expirationHours, setExpirationHours] = useState<number | null>(168);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!fromToken || !toToken || !chain || !amount || !targetPrice) return;
    
    setIsSubmitting(true);
    
    const expiresAt = expirationHours 
      ? new Date(Date.now() + expirationHours * 60 * 60 * 1000).toISOString()
      : null;
    
    await createOrder({
      chain_index: chain.chainIndex,
      from_token_address: fromToken.tokenContractAddress,
      to_token_address: toToken.tokenContractAddress,
      from_token_symbol: fromToken.tokenSymbol,
      to_token_symbol: toToken.tokenSymbol,
      amount,
      target_price: parseFloat(targetPrice),
      condition,
      slippage: '0.5',
      expires_at: expiresAt,
    });
    
    setIsSubmitting(false);
    setOpen(false);
    setAmount('');
    setTargetPrice('');
  };

  const adjustPrice = (percent: number) => {
    if (!currentPrice) return;
    const adjusted = currentPrice * (1 + percent / 100);
    setTargetPrice(adjusted.toFixed(8));
  };

  if (!isConnected || !fromToken || !toToken || !chain) {
    return null;
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
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Token pair info */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
            <span className="text-sm">{fromToken.tokenSymbol} → {toToken.tokenSymbol}</span>
            <span className="text-sm text-muted-foreground">{chain.name}</span>
          </div>

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

          {/* Condition */}
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

          {/* Target Price */}
          <div className="space-y-2">
            <Label>Target Price (USD)</Label>
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

          {/* Signature Info */}
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 flex gap-2 text-sm">
            <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-primary">
              You'll sign a message with your wallet to verify order creation.
            </p>
          </div>

          {/* Warning */}
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-yellow-700 dark:text-yellow-500">
              You'll receive a notification when triggered. Manual execution required.
            </p>
          </div>

          <Button 
            className="w-full" 
            onClick={handleSubmit}
            disabled={!amount || !targetPrice || isSubmitting || isSigning}
          >
            {isSigning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sign in Wallet...
              </>
            ) : isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Create Signed Order
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
