import React, { useMemo, useCallback } from 'react';
import { Check, ChevronDown, Layers, Globe, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Chain, SUPPORTED_CHAINS, getEvmChains, getNonEvmChains, getChainIcon, getChainByIndex } from '@/data/chains';
import { cn } from '@/lib/utils';
import { ChainImage } from '@/components/ui/token-image';

export type ChainFilterValue = 'all' | 'all-evm' | string;

interface UnifiedChainSelectorProps {
  value: ChainFilterValue;
  onChange: (value: ChainFilterValue) => void;
  showAllOption?: boolean;
  showEvmOnlyOption?: boolean;
  className?: string;
  triggerClassName?: string;
  compact?: boolean;
}

export function UnifiedChainSelector({
  value,
  onChange,
  showAllOption = true,
  showEvmOnlyOption = false,
  className,
  triggerClassName,
  compact = false,
}: UnifiedChainSelectorProps) {
  const [open, setOpen] = React.useState(false);
  
  const evmChains = useMemo(() => getEvmChains(), []);
  const nonEvmChains = useMemo(() => getNonEvmChains(), []);
  
  // Get display info for current selection
  const displayInfo = useMemo(() => {
    if (value === 'all') {
      return { 
        label: 'All Networks', 
        icon: null,
        isMulti: true,
      };
    }
    if (value === 'all-evm') {
      return { 
        label: 'EVM Networks', 
        icon: null,
        isMulti: true,
      };
    }
    const chain = getChainByIndex(value);
    if (chain) {
      return {
        label: compact ? chain.shortName : chain.name,
        icon: getChainIcon(chain),
        isMulti: false,
      };
    }
    return { label: 'Select Network', icon: null, isMulti: false };
  }, [value, compact]);

  const handleSelect = useCallback((newValue: ChainFilterValue) => {
    onChange(newValue);
    setOpen(false);
  }, [onChange]);

  // Fallback icon handler
  const handleIconError = useCallback((e: React.SyntheticEvent<HTMLImageElement>, name: string) => {
    const target = e.target as HTMLImageElement;
    target.onerror = null;
    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name.slice(0, 2))}&background=6366f1&color=fff&size=64`;
  }, []);

  const renderChainItem = useCallback((chain: Chain) => (
    <button
      key={chain.chainIndex}
      onClick={() => handleSelect(chain.chainIndex)}
      className={cn(
        "flex items-center gap-3 w-full px-3 py-2.5 min-h-[44px] rounded-md text-left transition-colors",
        "hover:bg-accent/50 active:bg-accent/70",
        value === chain.chainIndex && "bg-accent"
      )}
    >
      <ChainImage
        src={getChainIcon(chain)}
        alt={chain.name}
        fallbackText={chain.shortName}
        className="w-5 h-5"
      />
      <span className="font-medium text-sm flex-1 truncate">{chain.name}</span>
      {value === chain.chainIndex && (
        <Check className="w-4 h-4 text-primary shrink-0" />
      )}
    </button>
  ), [value, handleSelect]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className={cn(
            "gap-2 justify-between",
            compact ? "min-w-[100px]" : "min-w-[160px]",
            triggerClassName
          )}
        >
          <div className="flex items-center gap-2">
            {displayInfo.isMulti ? (
              <div className="w-5 h-5 rounded-full bg-gradient-to-r from-primary to-chart-2 flex items-center justify-center">
                <Layers className="w-3 h-3 text-white" />
              </div>
            ) : displayInfo.icon ? (
              <img 
                src={displayInfo.icon}
                alt=""
                className="w-5 h-5 rounded-full object-cover"
                onError={(e) => handleIconError(e, displayInfo.label)}
              />
            ) : (
              <Layers className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="truncate max-w-[100px]">{displayInfo.label}</span>
          </div>
          <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        align="start" 
        className={cn("w-64 max-w-[calc(100vw-2rem)] p-0 z-50", className)}
        sideOffset={8}
      >
        <div className="px-3 py-2 border-b border-border">
          <p className="text-xs font-medium text-muted-foreground">Select Network</p>
        </div>
        <ScrollArea className="h-[400px]">
          <div className="p-1">
            {/* All Networks option */}
            {showAllOption && (
              <button
                onClick={() => handleSelect('all')}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2.5 min-h-[44px] rounded-md text-left transition-colors",
                  "hover:bg-accent/50 active:bg-accent/70",
                  value === 'all' && "bg-accent"
                )}
              >
                <div className="w-5 h-5 rounded-full bg-gradient-to-r from-primary to-chart-2 flex items-center justify-center">
                  <Layers className="w-3 h-3 text-white" />
                </div>
                <span className="font-medium text-sm flex-1">All Networks</span>
                <span className="text-xs text-muted-foreground">{SUPPORTED_CHAINS.length}</span>
                {value === 'all' && (
                  <Check className="w-4 h-4 text-primary shrink-0" />
                )}
              </button>
            )}

            {/* All EVM option */}
            {showEvmOnlyOption && (
              <button
                onClick={() => handleSelect('all-evm')}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2.5 min-h-[44px] rounded-md text-left transition-colors",
                  "hover:bg-accent/50 active:bg-accent/70",
                  value === 'all-evm' && "bg-accent"
                )}
              >
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                  <Cpu className="w-3 h-3 text-primary" />
                </div>
                <span className="font-medium text-sm flex-1">EVM Networks</span>
                <span className="text-xs text-muted-foreground">{evmChains.length}</span>
                {value === 'all-evm' && (
                  <Check className="w-4 h-4 text-primary shrink-0" />
                )}
              </button>
            )}
            
            {/* EVM Chains */}
            <div className="px-2 py-1.5 mt-2 flex items-center gap-1.5 border-t border-border pt-3">
              <Cpu className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">EVM Networks</span>
              <span className="text-xs text-muted-foreground/60">({evmChains.length})</span>
            </div>
            {evmChains.map(renderChainItem)}
            
            {/* Non-EVM Chains */}
            {nonEvmChains.length > 0 && (
              <>
                <div className="px-2 py-1.5 mt-2 flex items-center gap-1.5 border-t border-border pt-3">
                  <Globe className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Other Networks</span>
                  <span className="text-xs text-muted-foreground/60">({nonEvmChains.length})</span>
                </div>
                {nonEvmChains.map(renderChainItem)}
              </>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
