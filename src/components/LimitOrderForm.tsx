import { useState, useMemo, useCallback, useEffect } from 'react';
import { Target, Clock, AlertTriangle, Loader2, Shield, Info, HelpCircle, TrendingUp, TrendingDown, ShieldAlert, ShieldCheck } from 'lucide-react';
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
import { useOkxLimitOrders } from '@/hooks/useOkxLimitOrders';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { OkxToken } from '@/services/okxdex';
import { Chain } from '@/data/chains';
import { cn } from '@/shared/lib';
import { useTokenBalance } from '@/hooks/useTokenBalance';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface LimitOrderFormProps {
  fromToken?: OkxToken | null;
  toToken?: OkxToken | null;
  chain?: Chain | null;
  currentPrice?: number;
  className?: string;
  /** When true, shows a standalone button that opens full form with token pickers */
  standalone?: boolean;
}

const EXPIRATION_OPTIONS = [
  { label: '24 hours', value: 24 },
  { label: '7 days', value: 168 },
  { label: '30 days', value: 720 },
  { label: 'Never', value: null },
];

const PRICE_ADJUSTMENTS = [
  { label: '-5%', value: -5 },
  { label: '-1%', value: -1 },
  { label: '+1%', value: 1 },
  { label: '+5%', value: 5 },
];

export function LimitOrderForm({ 
  fromToken, 
  toToken, 
  chain, 
  currentPrice,
  className,
  standalone = false,
}: LimitOrderFormProps) {
  const { isConnected, activeChainType, activeChain } = useMultiWallet();
  const { createOrder, getCurrentRate, isChainSupported, isSigning } = useOkxLimitOrders();
  
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [expirationHours, setExpirationHours] = useState<number | null>(168);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [liveRate, setLiveRate] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState(false);
  
  // TP/SL state
  const [showTpSl, setShowTpSl] = useState(false);
  const [takeProfitPrice, setTakeProfitPrice] = useState('');
  const [stopLossPrice, setStopLossPrice] = useState('');

  // Use active chain from wallet if not provided
  const effectiveChain = chain || activeChain;

  // Get balance
  const { formatted: balance } = useTokenBalance(fromToken, effectiveChain?.chainIndex || '');
  
  // Check if this chain is EVM and supported
  const isEVM = activeChainType === 'evm';
  const isSupported = effectiveChain && isChainSupported(effectiveChain.chainIndex);
  
  // For standalone mode, we only need wallet connected and EVM chain supported
  // For inline mode (in ExchangeWidget), we also need tokens selected
  const canOpenForm = isConnected && isEVM && isSupported;
  const hasTokensSelected = fromToken && toToken && effectiveChain;
  const showFullForm = standalone ? canOpenForm : (canOpenForm && hasTokensSelected);

  // Fetch current exchange rate when dialog opens
  useEffect(() => {
    if (open && fromToken && toToken && chain && isSupported) {
      setRateLoading(true);
      getCurrentRate(chain.chainIndex, fromToken.tokenContractAddress, toToken.tokenContractAddress)
        .then(rate => {
          if (rate) {
            setLiveRate(rate);
            // Initialize target price with current rate if empty
            if (!targetPrice) {
              setTargetPrice(rate.toFixed(8));
            }
          }
        })
        .finally(() => setRateLoading(false));
    }
  }, [open, fromToken, toToken, chain, isSupported, getCurrentRate, targetPrice]);

  const adjustPrice = useCallback((percent: number) => {
    const basePrice = liveRate || currentPrice;
    if (!basePrice) return;
    const adjusted = basePrice * (1 + percent / 100);
    setTargetPrice(adjusted.toFixed(8));
    // Auto-set condition based on adjustment direction
    setCondition(percent > 0 ? 'above' : 'below');
  }, [liveRate, currentPrice]);

  const handleSubmit = async () => {
    if (!showFullForm || !amount || !targetPrice) return;

    setIsSubmitting(true);
    try {
      const expiresAt = expirationHours 
        ? new Date(Date.now() + expirationHours * 60 * 60 * 1000).toISOString()
        : null;

      const order = await createOrder({
        chainIndex: chain.chainIndex,
        fromTokenAddress: fromToken.tokenContractAddress,
        toTokenAddress: toToken.tokenContractAddress,
        fromTokenSymbol: fromToken.tokenSymbol,
        toTokenSymbol: toToken.tokenSymbol,
        amount,
        targetPrice: parseFloat(targetPrice),
        condition,
        slippage: '0.5',
        expiresAt,
        // TP/SL fields
        takeProfitPrice: takeProfitPrice ? parseFloat(takeProfitPrice) : undefined,
        stopLossPrice: stopLossPrice ? parseFloat(stopLossPrice) : undefined,
      });

      if (order) {
        setOpen(false);
        setAmount('');
        setTargetPrice('');
        setTakeProfitPrice('');
        setStopLossPrice('');
        setShowTpSl(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasInsufficientBalance = balance && amount && parseFloat(amount) > parseFloat(balance);

  // If not connected or not EVM, show disabled button
  if (!isConnected || !isEVM) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={cn("gap-1.5", className)}
            disabled
          >
            <Target className="w-3.5 h-3.5" />
            Limit Order
            <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">
              {!isConnected ? 'Connect Wallet' : 'EVM Only'}
            </Badge>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{!isConnected ? 'Connect an EVM wallet to create limit orders.' : 'Limit orders available on EVM chains only.'}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // If chain not supported, show unsupported message
  if (!isSupported) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={cn("gap-1.5", className)}
            disabled
          >
            <Target className="w-3.5 h-3.5" />
            Limit Order
            <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">
              Chain Not Supported
            </Badge>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>This chain doesn't support limit orders yet. Switch to Ethereum, BSC, Polygon, Arbitrum, or other major EVM chains.</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // For standalone mode without tokens, show button that opens dialog with message
  if (standalone && !hasTokensSelected) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={cn("gap-1.5", className)}
          >
            <Target className="w-3.5 h-3.5" />
            Create Limit Order
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Create Limit Order
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="font-medium mb-2">Select tokens to create a limit order</p>
              <p className="text-sm text-muted-foreground">
                Go to the Swap page and select your token pair, then click "Limit Order" to set your target price.
              </p>
            </div>
            <Button 
              className="w-full"
              onClick={() => {
                setOpen(false);
                window.location.href = '/swap';
              }}
            >
              Go to Swap
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn("gap-1.5", className)}
        >
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

        <div className="space-y-4">
          {/* Current Rate Display */}
          <div className="p-3 rounded-lg bg-secondary/50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                Current Rate
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3 h-3" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[200px]">
                    <p className="text-xs">Live exchange rate between your selected tokens.</p>
                  </TooltipContent>
                </Tooltip>
              </span>
              <span className="font-mono">
                {rateLoading ? '...' : liveRate ? `1 ${fromToken.tokenSymbol} = ${liveRate.toFixed(6)} ${toToken.tokenSymbol}` : 'N/A'}
              </span>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1">
                Amount ({fromToken.tokenSymbol})
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3 h-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[200px]">
                    <p className="text-xs">The amount of tokens you want to sell when the target price is reached.</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              {balance && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-xs"
                  onClick={() => setAmount(balance)}
                >
                  Max: {parseFloat(balance).toFixed(4)}
                </Button>
              )}
            </div>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={cn("font-mono", hasInsufficientBalance && "border-destructive")}
            />
            {hasInsufficientBalance && (
              <p className="text-xs text-destructive">Insufficient balance</p>
            )}
          </div>

          {/* Target Price Input */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              Target Price ({toToken.tokenSymbol} per {fromToken.tokenSymbol})
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3 h-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[220px]">
                  <p className="text-xs">The price at which your order will execute. Set higher than current for profit-taking, lower for buying dips.</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <Input
              type="number"
              placeholder={liveRate?.toFixed(8) || '0.00000000'}
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="font-mono"
            />
            {/* Price adjustment buttons */}
            <div className="flex gap-1">
              {PRICE_ADJUSTMENTS.map(({ label, value }) => (
                <Button
                  key={value}
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={() => adjustPrice(value)}
                  disabled={!liveRate && !currentPrice}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Condition Selector */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              Execute When Price Is
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3 h-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[220px]">
                  <p className="text-xs">"Above" triggers when price rises to target. "Below" triggers when price drops to target.</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={condition === 'above' ? 'default' : 'outline'}
                className={cn(
                  "gap-1.5",
                  condition === 'above' && "bg-success hover:bg-success/90 text-success-foreground"
                )}
                onClick={() => setCondition('above')}
              >
                <TrendingUp className="w-4 h-4" />
                Above Target
              </Button>
              <Button
                variant={condition === 'below' ? 'default' : 'outline'}
                className={cn(
                  "gap-1.5",
                  condition === 'below' && "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                )}
                onClick={() => setCondition('below')}
              >
                <TrendingDown className="w-4 h-4" />
                Below Target
              </Button>
            </div>
          </div>

          {/* TP/SL Section */}
          <Collapsible open={showTpSl} onOpenChange={setShowTpSl}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 cursor-pointer hover:bg-secondary/70 transition-colors">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Take Profit / Stop Loss</span>
                  <Badge variant="secondary" className="text-[10px]">Optional</Badge>
                </div>
                <Switch checked={showTpSl} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              {/* Take Profit */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1 text-success">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Take Profit Price
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3 h-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[220px]">
                      <p className="text-xs">Auto-trigger when price rises to this level to lock in profits.</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  type="number"
                  placeholder={liveRate ? (liveRate * 1.1).toFixed(8) : '0.00'}
                  value={takeProfitPrice}
                  onChange={(e) => setTakeProfitPrice(e.target.value)}
                  className="font-mono border-success/30 focus:border-success"
                />
                <div className="flex gap-1">
                  {[5, 10, 20].map((pct) => (
                    <Button
                      key={pct}
                      variant="outline"
                      size="sm"
                      className="flex-1 h-6 text-[10px] text-success border-success/30"
                      onClick={() => {
                        const base = liveRate || currentPrice;
                        if (base) setTakeProfitPrice((base * (1 + pct / 100)).toFixed(8));
                      }}
                      disabled={!liveRate && !currentPrice}
                    >
                      +{pct}%
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Stop Loss */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1 text-destructive">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Stop Loss Price
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3 h-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[220px]">
                      <p className="text-xs">Auto-trigger when price falls to this level to limit losses.</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  type="number"
                  placeholder={liveRate ? (liveRate * 0.9).toFixed(8) : '0.00'}
                  value={stopLossPrice}
                  onChange={(e) => setStopLossPrice(e.target.value)}
                  className="font-mono border-destructive/30 focus:border-destructive"
                />
                <div className="flex gap-1">
                  {[5, 10, 20].map((pct) => (
                    <Button
                      key={pct}
                      variant="outline"
                      size="sm"
                      className="flex-1 h-6 text-[10px] text-destructive border-destructive/30"
                      onClick={() => {
                        const base = liveRate || currentPrice;
                        if (base) setStopLossPrice((base * (1 - pct / 100)).toFixed(8));
                      }}
                      disabled={!liveRate && !currentPrice}
                    >
                      -{pct}%
                    </Button>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Expiration Selector */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Order Expires
            </Label>
            <Select
              value={expirationHours?.toString() || 'never'}
              onValueChange={(v) => setExpirationHours(v === 'never' ? null : parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPIRATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value?.toString() || 'never'} value={opt.value?.toString() || 'never'}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Security Notice */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Your order will be signed with your wallet and monitored automatically. 
              {showTpSl && ' TP/SL orders will trigger independently when their price levels are reached.'}
            </p>
          </div>

          {/* Submit Button */}
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!amount || !targetPrice || isSubmitting || isSigning || hasInsufficientBalance}
          >
            {isSubmitting || isSigning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isSigning ? 'Signing...' : 'Creating Order...'}
              </>
            ) : (
              <>
                <Target className="w-4 h-4 mr-2" />
                Create Limit Order
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
