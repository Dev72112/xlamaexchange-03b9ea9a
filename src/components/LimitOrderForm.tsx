import { useState, useMemo } from 'react';
import { Target, Clock, AlertTriangle, Loader2, Shield, Info } from 'lucide-react';
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
  const { isSigning } = useLimitOrders();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [expirationHours, setExpirationHours] = useState<number | null>(168);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const adjustPrice = (percent: number) => {
    if (!currentPrice) return;
    const adjusted = currentPrice * (1 + percent / 100);
    setTargetPrice(adjusted.toFixed(8));
  };

  if (!isConnected || !fromToken || !toToken || !chain) {
    return null;
  }

  // All chains now redirect to Perpetuals for limit orders (Jupiter removed)
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
            Coming Soon
          </Badge>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Limit orders coming soon. Use Perpetuals for advanced trading.</p>
      </TooltipContent>
    </Tooltip>
  );
}
