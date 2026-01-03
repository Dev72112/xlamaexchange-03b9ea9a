import React, { memo, useRef, useEffect, useState } from 'react';
import { Zap, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export type ExchangeMode = 'instant' | 'dex';

interface ModeToggleProps {
  mode: ExchangeMode;
  onModeChange: (mode: ExchangeMode) => void;
}

export const ModeToggle = memo(function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  const instantRef = useRef<HTMLButtonElement>(null);
  const dexRef = useRef<HTMLButtonElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  // Update sliding indicator position
  useEffect(() => {
    const activeRef = mode === 'instant' ? instantRef : dexRef;
    if (activeRef.current) {
      const { offsetLeft, offsetWidth } = activeRef.current;
      setIndicatorStyle({ left: offsetLeft, width: offsetWidth });
    }
  }, [mode]);

  return (
    <div className="relative flex items-center gap-1 p-1 bg-muted rounded-lg">
      {/* Sliding background indicator */}
      <div 
        className="absolute h-[calc(100%-8px)] bg-background rounded-md shadow-sm transition-all duration-200 ease-out"
        style={{ 
          left: indicatorStyle.left,
          width: indicatorStyle.width,
        }}
      />
      
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            ref={instantRef}
            onClick={() => onModeChange('instant')}
            className={cn(
              "relative z-10 flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200",
              mode === 'instant' 
                ? "text-foreground" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Zap className={cn(
              "w-4 h-4 transition-transform duration-200",
              mode === 'instant' && "scale-110"
            )} />
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
            ref={dexRef}
            onClick={() => onModeChange('dex')}
            className={cn(
              "relative z-10 flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200",
              mode === 'dex' 
                ? "text-foreground" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Repeat className={cn(
              "w-4 h-4 transition-transform duration-200",
              mode === 'dex' && "scale-110"
            )} />
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
});
