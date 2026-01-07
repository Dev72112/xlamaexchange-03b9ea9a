import { memo, useState, useCallback } from 'react';
import { useDCAOrders } from '@/hooks/useDCAOrders';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getChainByIndex } from '@/data/chains';

// Non-EVM chains don't support signed DCA orders yet
const NON_EVM_CHAIN_INDEXES = ['501', '195', '784', '607']; // Solana, Tron, Sui, TON

interface DCAOrderFormProps {
  fromToken?: {
    address: string;
    symbol: string;
  };
  toToken?: {
    address: string;
    symbol: string;
  };
  chainIndex?: string;
}

export const DCAOrderForm = memo(function DCAOrderForm({ 
  fromToken, 
  toToken, 
  chainIndex 
}: DCAOrderFormProps) {
  const { isConnected, isOkxConnected } = useMultiWallet();
  const { createOrder, isSigning } = useDCAOrders();
  
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [totalIntervals, setTotalIntervals] = useState<string>('');
  const [slippage, setSlippage] = useState('0.5');
  const [executionHour, setExecutionHour] = useState<string>('9'); // Default 9 AM UTC

  const handleSubmit = useCallback(async () => {
    if (!fromToken || !toToken || !chainIndex || !amount) return;
    
    const order = await createOrder({
      chain_index: chainIndex,
      from_token_address: fromToken.address,
      to_token_address: toToken.address,
      from_token_symbol: fromToken.symbol,
      to_token_symbol: toToken.symbol,
      amount_per_interval: amount,
      frequency,
      total_intervals: totalIntervals ? parseInt(totalIntervals) : null,
      slippage,
      execution_hour: parseInt(executionHour),
    });
    
    if (order) {
      setIsOpen(false);
      setAmount('');
      setTotalIntervals('');
    }
  }, [fromToken, toToken, chainIndex, amount, frequency, totalIntervals, slippage, executionHour, createOrder]);

  const getFrequencyLabel = (freq: string) => {
    switch (freq) {
      case 'daily': return 'Every day';
      case 'weekly': return 'Every week';
      case 'biweekly': return 'Every 2 weeks';
      case 'monthly': return 'Every month';
      default: return freq;
    }
  };

  const calculateEstimate = () => {
    if (!amount || !totalIntervals) return null;
    const total = parseFloat(amount) * parseInt(totalIntervals);
    return isNaN(total) ? null : total;
  };

  if (!isConnected || !fromToken || !toToken) {
    return null;
  }

  const isNonEvmChain = chainIndex ? NON_EVM_CHAIN_INDEXES.includes(chainIndex) : false;
  const chain = chainIndex ? getChainByIndex(chainIndex) : null;
  const chainName = chain?.name || 'this chain';

  // Show disabled state for non-EVM chains when NOT connected via OKX
  if (isNonEvmChain && !isOkxConnected) {
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
          <p>DCA orders for {chainName} coming soon</p>
          <p className="text-xs text-muted-foreground">Connect OKX Wallet for full support</p>
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

          {/* Execution Time */}
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
          
          {/* Number of purchases (optional) */}
          <div className="space-y-2">
            <Label htmlFor="dca-intervals" className="flex items-center gap-2">
              Number of purchases
              <span className="text-xs text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="dca-intervals"
              type="number"
              placeholder="Leave empty for ongoing"
              value={totalIntervals}
              onChange={(e) => setTotalIntervals(e.target.value)}
            />
          </div>
          
          {/* Slippage */}
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
          
          {/* Summary */}
          {amount && (
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
                {calculateEstimate() && (
                  <div className="flex justify-between font-medium">
                    <span className="text-muted-foreground">Total investment</span>
                    <span>{calculateEstimate()?.toLocaleString()} {fromToken.symbol}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Submit */}
          <Button 
            onClick={handleSubmit} 
            disabled={!amount || isSigning}
            className="w-full"
          >
            {isSigning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sign to Create...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create DCA Order
              </>
            )}
          </Button>
          
          <p className="text-xs text-muted-foreground text-center">
            You'll need to sign a message to create this order. Your wallet signature proves ownership.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
});
