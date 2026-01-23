import { memo } from 'react';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarClock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
}: DCAOrderFormProps) {
  const { isConnected } = useMultiWallet();

  if (!isConnected || !fromToken || !toToken) {
    return null;
  }

  // All chains now redirect to Perpetuals for DCA (Jupiter removed)
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
            Coming Soon
          </Badge>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>DCA orders coming soon. Use Perpetuals for advanced trading.</p>
      </TooltipContent>
    </Tooltip>
  );
});
