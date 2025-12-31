import React from 'react';
import { Zap, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export type ExchangeMode = 'instant' | 'dex';

interface ModeToggleProps {
  mode: ExchangeMode;
  onModeChange: (mode: ExchangeMode) => void;
}

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => onModeChange('instant')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
              mode === 'instant' 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Zap className="w-4 h-4" />
            <span>Instant</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[250px]">
          <p className="text-xs">
            <strong>Instant Exchange</strong><br/>
            • No wallet connection needed<br/>
            • Cross-chain swaps supported<br/>
            • Send to any address<br/>
            • Powered by ChangeNow
          </p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => onModeChange('dex')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
              mode === 'dex' 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Repeat className="w-4 h-4" />
            <span>DEX</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[250px]">
          <p className="text-xs">
            <strong>DEX Aggregator</strong><br/>
            • Best rates from 400+ DEXs<br/>
            • Wallet connection required<br/>
            • Same-chain swaps only<br/>
            • Powered by OKX DEX
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
