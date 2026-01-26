import { memo, useState, useCallback, useEffect } from 'react';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarClock, Loader2, HelpCircle, Shield, Clock, DollarSign } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
import { OkxToken } from '@/services/okxdex';
import { Chain } from '@/data/chains';
import { cn } from '@/lib/utils';
import { useTokenBalance } from '@/hooks/useTokenBalance';
import { okxLimitOrdersService } from '@/services/okxLimitOrders';
import { useToast } from '@/hooks/use-toast';

interface DCAOrderFormProps {
  fromToken?: OkxToken | null;
  toToken?: OkxToken | null;
  chain?: Chain | null;
  className?: string;
}

const FREQUENCY_OPTIONS = [
  { label: 'Daily', value: 'daily', hours: 24 },
  { label: 'Twice Weekly', value: 'twice-weekly', hours: 84 },
  { label: 'Weekly', value: 'weekly', hours: 168 },
  { label: 'Biweekly', value: 'biweekly', hours: 336 },
  { label: 'Monthly', value: 'monthly', hours: 720 },
];

const EXECUTION_HOURS = Array.from({ length: 24 }, (_, i) => ({
  label: `${i.toString().padStart(2, '0')}:00 UTC`,
  value: i,
}));

export const DCAOrderForm = memo(function DCAOrderForm({ 
  fromToken, 
  toToken, 
  chain,
  className,
}: DCAOrderFormProps) {
  const { isConnected, activeChainType } = useMultiWallet();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [amountPerInterval, setAmountPerInterval] = useState('');
  const [frequency, setFrequency] = useState('weekly');
  const [executionHour, setExecutionHour] = useState(12);
  const [totalIntervals, setTotalIntervals] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get balance
  const { formatted: balance } = useTokenBalance(fromToken, chain?.chainIndex || '');
  
  // Check if this chain is EVM and supported
  const isEVM = activeChainType === 'evm';
  const isSupported = chain && okxLimitOrdersService.isChainSupported(chain.chainIndex);
  const showFullForm = isConnected && isEVM && isSupported && fromToken && toToken && chain;

  // Calculate total commitment
  const totalAmount = amountPerInterval && totalIntervals 
    ? (parseFloat(amountPerInterval) * parseInt(totalIntervals)).toFixed(4)
    : null;

  const frequencyLabel = FREQUENCY_OPTIONS.find(f => f.value === frequency)?.label || frequency;

  const handleSubmit = useCallback(async () => {
    if (!showFullForm || !amountPerInterval) return;

    setIsSubmitting(true);
    try {
      // For now, show coming soon toast - full implementation requires edge function updates
      toast({
        title: 'DCA Coming Soon',
        description: 'EVM DCA orders are being finalized. Check back soon!',
      });
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [showFullForm, amountPerInterval, toast]);

  // If not connected, not EVM, or chain not supported, show coming soon button
  if (!showFullForm) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={cn("gap-2", className)}
            onClick={() => window.open('/perpetuals', '_self')}
          >
            <CalendarClock className="w-4 h-4" />
            <span className="hidden sm:inline">DCA</span>
            <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">
              {isEVM ? 'Coming Soon' : 'EVM Only'}
            </Badge>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isEVM ? 'DCA orders coming soon for this chain.' : 'DCA orders available on EVM chains only.'}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn("gap-2", className)}
        >
          <CalendarClock className="w-4 h-4" />
          <span className="hidden sm:inline">DCA</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5" />
            Create DCA Strategy
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Strategy Summary */}
          <div className="p-3 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-2 text-sm font-medium">
              <DollarSign className="w-4 h-4 text-primary" />
              Dollar Cost Average into {toToken.tokenSymbol}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Automatically swap {fromToken.tokenSymbol} to {toToken.tokenSymbol} at regular intervals
            </p>
          </div>

          {/* Amount Per Interval */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1">
                Amount Per Purchase ({fromToken.tokenSymbol})
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3 h-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[220px]">
                    <p className="text-xs">How much {fromToken.tokenSymbol} to spend on each scheduled purchase.</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              {balance && (
                <span className="text-xs text-muted-foreground">
                  Balance: {parseFloat(balance).toFixed(4)}
                </span>
              )}
            </div>
            <Input
              type="number"
              placeholder="100"
              value={amountPerInterval}
              onChange={(e) => setAmountPerInterval(e.target.value)}
              className="font-mono"
            />
          </div>

          {/* Frequency Selector */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              Purchase Frequency
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3 h-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[200px]">
                  <p className="text-xs">How often to execute a purchase. More frequent = smoother averaging.</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Execution Hour */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Execution Time (UTC)
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3 h-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[200px]">
                  <p className="text-xs">The hour of day (in UTC) when purchases will execute.</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <Select value={executionHour.toString()} onValueChange={(v) => setExecutionHour(parseInt(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {EXECUTION_HOURS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value.toString()}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Total Intervals (Optional) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              Number of Purchases (Optional)
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3 h-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[220px]">
                  <p className="text-xs">Leave empty for ongoing DCA, or set a limit for fixed duration.</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <Input
              type="number"
              placeholder="Ongoing (leave empty)"
              value={totalIntervals}
              onChange={(e) => setTotalIntervals(e.target.value)}
              className="font-mono"
            />
          </div>

          {/* Summary */}
          {amountPerInterval && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Per Purchase</span>
                <span className="font-mono">{amountPerInterval} {fromToken.tokenSymbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frequency</span>
                <span>{frequencyLabel}</span>
              </div>
              {totalAmount && (
                <div className="flex justify-between pt-1.5 border-t border-border">
                  <span className="text-muted-foreground">Total Commitment</span>
                  <span className="font-mono font-medium">{totalAmount} {fromToken.tokenSymbol}</span>
                </div>
              )}
            </div>
          )}

          {/* Security Notice */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/50">
            <Shield className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              DCA orders execute automatically. You can pause or cancel anytime from the Orders page.
            </p>
          </div>

          {/* Submit Button */}
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!amountPerInterval || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Strategy...
              </>
            ) : (
              <>
                <CalendarClock className="w-4 h-4 mr-2" />
                Create DCA Strategy
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});
