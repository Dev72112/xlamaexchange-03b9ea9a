import { memo, useState, useCallback, useMemo } from 'react';
import { useDCAOrders } from '@/features/orders';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { useTokenBalance } from '@/hooks/useTokenBalance';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  CalendarClock, 
  Loader2, 
  Plus,
  ArrowRight,
  Info,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getChainByIndex } from '@/data/chains';

// Solana chain index
const SOLANA_CHAIN_INDEX = '501';

interface DCAOrderFormProps {
  fromToken?: {
    address: string;
    symbol: string;
    decimals?: number;
  };
  toToken?: {
    address: string;
    symbol: string;
    decimals?: number;
  };
  chainIndex?: string;
}

export const DCAOrderForm = memo(function DCAOrderForm({ 
  fromToken, 
  toToken, 
  chainIndex 
}: DCAOrderFormProps) {
  const { isConnected, isOkxConnected, activeChainType } = useMultiWallet();
  const { createOrder, createJupiterDCA, isSigning } = useDCAOrders();
  
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [totalIntervals, setTotalIntervals] = useState<string>('10');
  const [slippage, setSlippage] = useState('0.5');
  const [executionHour, setExecutionHour] = useState<string>('9'); // Default 9 AM UTC

  // Check if this is a Solana order
  const isSolana = chainIndex === SOLANA_CHAIN_INDEX || activeChainType === 'solana';

  // Get token balance for validation - add debug logging
  const { formatted: fromTokenBalance, loading: balanceLoading } = useTokenBalance(
    fromToken ? { tokenContractAddress: fromToken.address, tokenSymbol: fromToken.symbol, decimals: fromToken.decimals || 9 } as any : null,
    chainIndex || ''
  );

  // Debug: Log balance state for Solana DCA
  console.log('[DCAOrderForm] Balance state:', {
    fromToken: fromToken?.symbol,
    fromTokenAddress: fromToken?.address?.slice(0, 12),
    fromTokenDecimals: fromToken?.decimals,
    chainIndex,
    isSolana,
    fromTokenBalance,
    balanceLoading,
    activeChainType,
  });

  // Calculate total investment
  const totalInvestment = useMemo(() => {
    if (!amount || !totalIntervals) return null;
    const total = parseFloat(amount) * parseInt(totalIntervals);
    return isNaN(total) ? null : total;
  }, [amount, totalIntervals]);

  // Check for insufficient balance (for Jupiter, total amount is locked)
  const hasInsufficientBalance = useMemo(() => {
    if (!fromTokenBalance || !totalInvestment) return false;
    if (fromTokenBalance === '< 0.000001' || fromTokenBalance === '0') return totalInvestment > 0;
    const balance = parseFloat(fromTokenBalance);
    return !isNaN(balance) && totalInvestment > balance;
  }, [fromTokenBalance, totalInvestment]);

  const handleSubmit = useCallback(async () => {
    if (!fromToken || !toToken || !chainIndex || !amount) return;
    
    // Validate inputs before submitting
    const amountNum = parseFloat(amount);
    const intervals = parseInt(totalIntervals) || 10;
    
    if (isNaN(amountNum) || amountNum <= 0) {
      console.error('[DCAOrderForm] Invalid amount:', { amount });
      return;
    }
    
    if (intervals <= 0) {
      console.error('[DCAOrderForm] Invalid intervals:', { totalIntervals });
      return;
    }
    
    // CRITICAL: Validate token addresses
    const inputMint = fromToken.address;
    const outputMint = toToken.address;
    if (!inputMint || !outputMint) {
      console.error('[DCAOrderForm] Missing token addresses:', { inputMint, outputMint });
      return;
    }
    
    // For Solana, use Jupiter on-chain DCA
    if (isSolana) {
      const totalAmount = (amountNum * intervals).toString();
      const inputDecimals = fromToken.decimals || 9;
      
      // Debug log the parameters
      console.log('[DCAOrderForm] Jupiter DCA params:', {
        inputMint,
        outputMint,
        totalAmount,
        numberOfOrders: intervals,
        inputDecimals,
        frequency,
      });
      
      const result = await createJupiterDCA({
        inputMint: String(inputMint),
        outputMint: String(outputMint),
        totalAmount,
        numberOfOrders: intervals,
        inputDecimals,
        frequency,
        fromSymbol: fromToken.symbol,
        toSymbol: toToken.symbol,
      });
      
      if (result) {
        setIsOpen(false);
        setAmount('');
        setTotalIntervals('10');
      }
      return;
    }
    
    // EVM chains - Hyperliquid integration coming soon
    // Show message and close dialog
    setIsOpen(false);
    return;
  }, [fromToken, toToken, chainIndex, amount, frequency, totalIntervals, slippage, executionHour, createOrder, createJupiterDCA, isSolana]);

  const getFrequencyLabel = (freq: string) => {
    switch (freq) {
      case 'daily': return 'Every day';
      case 'weekly': return 'Every week';
      case 'biweekly': return 'Every 2 weeks';
      case 'monthly': return 'Every month';
      default: return freq;
    }
  };

  if (!isConnected || !fromToken || !toToken) {
    return null;
  }

  const chain = chainIndex ? getChainByIndex(chainIndex) : null;
  const chainName = chain?.name || 'this chain';

  // For Solana without proper wallet, show coming soon
  if (isSolana && !isOkxConnected && activeChainType !== 'solana') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 opacity-60 cursor-not-allowed"
            disabled
          >
            <CalendarClock className="w-4 h-4" />
            <span className="hidden sm:inline">DCA</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Connect a Solana wallet for Jupiter DCA</p>
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
            className="gap-2"
            onClick={() => window.open('/perpetuals', '_self')}
          >
            <CalendarClock className="w-4 h-4" />
            <span className="hidden sm:inline">DCA</span>
            <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">
              Hyperliquid
            </Badge>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>EVM DCA via Hyperliquid Perpetuals</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CalendarClock className="w-4 h-4" />
          <span className="hidden sm:inline">DCA</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            Create DCA Order
            {isSolana && (
              <Badge variant="secondary" className="ml-2 gap-1 bg-primary/10 text-primary">
                <Zap className="w-3 h-3" />
                Jupiter On-Chain
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Automatically buy {toToken.symbol} on a schedule with Dollar Cost Averaging.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Token Pair Display */}
          <div className="flex items-center justify-center gap-3 p-3 bg-secondary/50 rounded-lg">
            <span className="font-medium">{fromToken.symbol}</span>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{toToken.symbol}</span>
          </div>

          {/* Balance info for Solana */}
          {isSolana && fromTokenBalance && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Available Balance:</span>
                <span className="font-mono font-medium">{fromTokenBalance} {fromToken.symbol}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                <Zap className="w-3 h-3 inline mr-1" />
                Total investment amount will be locked in Jupiter
              </p>
            </div>
          )}

          {/* Insufficient balance warning */}
          {hasInsufficientBalance && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-destructive">
                Insufficient balance. You need {totalInvestment?.toFixed(4)} {fromToken.symbol} but have {fromTokenBalance}.
              </p>
            </div>
          )}
          
          {/* Amount per interval */}
          <div className="space-y-2">
            <Label htmlFor="dca-amount" className="flex items-center gap-2">
              Amount per purchase
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3.5 h-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>How much {fromToken.symbol} to spend each time</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <div className="relative">
              <Input
                id="dca-amount"
                type="number"
                placeholder="100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pr-16"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {fromToken.symbol}
              </span>
            </div>
          </div>
          
          {/* Frequency */}
          <div className="space-y-2">
            <Label htmlFor="dca-frequency">Frequency</Label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as any)}>
              <SelectTrigger id="dca-frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-weekly (Every 2 weeks)</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Execution Time - Only for EVM */}
          {!isSolana && (
            <div className="space-y-2">
              <Label htmlFor="dca-execution-hour" className="flex items-center gap-2">
                Execution Time (UTC)
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3.5 h-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>What time each day/week/month should the order execute?</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Select value={executionHour} onValueChange={setExecutionHour}>
                <SelectTrigger id="dca-execution-hour">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {String(i).padStart(2, '0')}:00 UTC
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Number of purchases */}
          <div className="space-y-2">
            <Label htmlFor="dca-intervals" className="flex items-center gap-2">
              Number of purchases
              {!isSolana && <span className="text-xs text-muted-foreground">(optional)</span>}
            </Label>
            <Input
              id="dca-intervals"
              type="number"
              placeholder={isSolana ? "10" : "Leave empty for ongoing"}
              value={totalIntervals}
              onChange={(e) => setTotalIntervals(e.target.value)}
            />
            {isSolana && (
              <p className="text-xs text-muted-foreground">
                Required for Jupiter DCA - defines how many cycles to execute
              </p>
            )}
          </div>
          
          {/* Slippage - Only for EVM */}
          {!isSolana && (
            <div className="space-y-2">
              <Label htmlFor="dca-slippage">Max Slippage</Label>
              <Select value={slippage} onValueChange={setSlippage}>
                <SelectTrigger id="dca-slippage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">0.5%</SelectItem>
                  <SelectItem value="1">1%</SelectItem>
                  <SelectItem value="2">2%</SelectItem>
                  <SelectItem value="3">3%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Summary */}
          {amount && totalIntervals && (
            <Card className="bg-secondary/30 border-border">
              <CardContent className="p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Schedule</span>
                  <span>{getFrequencyLabel(frequency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Per purchase</span>
                  <span>{amount} {fromToken.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total cycles</span>
                  <span>{totalIntervals}</span>
                </div>
                {totalInvestment && (
                  <div className="flex justify-between font-medium pt-2 border-t border-border/50">
                    <span className="text-muted-foreground">Total investment</span>
                    <span>{totalInvestment.toLocaleString()} {fromToken.symbol}</span>
                  </div>
                )}
                {isSolana && (
                  <p className="text-xs text-primary pt-2">
                    <Zap className="w-3 h-3 inline mr-1" />
                    Jupiter keepers will automatically execute each cycle
                  </p>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Submit */}
          <Button 
            onClick={handleSubmit} 
            disabled={!amount || !totalIntervals || isSigning || hasInsufficientBalance}
            className="w-full"
          >
            {isSigning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isSolana ? 'Sign Transaction...' : 'Sign to Create...'}
              </>
            ) : (
              <>
                {isSolana ? <Zap className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                {isSolana ? 'Create Jupiter DCA' : 'Create DCA Order'}
              </>
            )}
          </Button>
          
          <p className="text-xs text-muted-foreground text-center">
            {isSolana 
              ? 'You\'ll sign a transaction to lock funds in Jupiter\'s DCA program.'
              : 'You\'ll need to sign a message to create this order. Your wallet signature proves ownership.'
            }
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
});
