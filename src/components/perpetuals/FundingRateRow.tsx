/**
 * Funding Rate Row Component
 * 
 * Displays funding rate with real-time countdown to next funding payment.
 */

import { memo } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Clock, Flame, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFundingCountdown } from './useFundingCountdown';

interface FundingRateRowProps {
  fundingRate: string | undefined;
  nextFundingTime: number | undefined;
  isLong: boolean;
  isFundingPositive: boolean;
}

// Format funding rate for display
const formatFundingRate = (rate: string | undefined): string => {
  if (!rate) return '0.00%';
  const parsed = parseFloat(rate) * 100;
  return `${parsed >= 0 ? '+' : ''}${parsed.toFixed(4)}%`;
};

export const FundingRateRow = memo(function FundingRateRow({
  fundingRate,
  nextFundingTime,
  isLong,
  isFundingPositive,
}: FundingRateRowProps) {
  const countdown = useFundingCountdown(nextFundingTime);
  
  return (
    <div className="flex items-center justify-between p-2 mb-3 rounded-md bg-secondary/30">
      <div className="flex items-center gap-3">
        {/* Countdown */}
        <div className="flex items-center gap-1.5">
          <Timer className="w-3.5 h-3.5 text-primary" />
          <span className="font-mono text-xs text-primary font-medium">{countdown}</span>
        </div>
        
        <div className="w-px h-4 bg-border" />
        
        {/* Funding Rate */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center gap-1 font-mono text-xs font-medium cursor-help",
              isFundingPositive 
                ? (isLong ? "text-red-400" : "text-green-400") 
                : (isLong ? "text-green-400" : "text-red-400")
            )}>
              <Flame className="w-3 h-3" />
              {formatFundingRate(fundingRate)}
              <span className="text-[10px] opacity-70">
                {isFundingPositive 
                  ? (isLong ? '(pay)' : '(earn)') 
                  : (isLong ? '(earn)' : '(pay)')}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1 text-xs">
              <p className="font-medium">Funding Payment</p>
              <p className="text-muted-foreground">
                {isFundingPositive 
                  ? 'Longs pay shorts every 8 hours' 
                  : 'Shorts pay longs every 8 hours'}
              </p>
              <p className="text-muted-foreground">
                Next payment in: <span className="font-mono text-foreground">{countdown}</span>
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
      
      {/* Label */}
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
        Next Funding
      </span>
    </div>
  );
});
