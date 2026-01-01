import React from 'react';
import { Check, ChevronDown, Star, Globe, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Chain, SUPPORTED_CHAINS, getEvmChains, getNonEvmChains } from '@/data/chains';
import { useWallet } from '@/contexts/WalletContext';
import { cn } from '@/lib/utils';

interface ChainSelectorProps {
  selectedChain: Chain;
  onChainSelect: (chain: Chain) => void;
  showOnlyEvm?: boolean;
  excludeChainIndex?: string;
}

export function ChainSelector({ selectedChain, onChainSelect, showOnlyEvm = false, excludeChainIndex }: ChainSelectorProps) {
  const { chainId, switchChain, isConnected } = useWallet();
  const [open, setOpen] = React.useState(false);
  
  const evmChains = getEvmChains().filter(c => c.chainIndex !== excludeChainIndex);
  const nonEvmChains = getNonEvmChains().filter(c => c.chainIndex !== excludeChainIndex);
  
  // Check if wallet is on the selected chain
  const isOnCorrectChain = chainId === selectedChain.chainId;

  const handleChainSelect = async (chain: Chain) => {
    onChainSelect(chain);
    setOpen(false);
    
    // If wallet is connected and chain is different and EVM, prompt to switch
    if (isConnected && chain.isEvm && chain.chainId && chainId !== chain.chainId) {
      try {
        await switchChain(chain.chainId);
      } catch (error) {
        console.error('Failed to switch chain:', error);
      }
    }
  };

  // Fallback icon handler
  const handleIconError = (e: React.SyntheticEvent<HTMLImageElement>, name: string) => {
    const target = e.target as HTMLImageElement;
    target.onerror = null;
    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name.slice(0, 2))}&background=6366f1&color=fff&size=64`;
  };

  const renderChainItem = (chain: Chain) => (
    <button
      key={chain.chainIndex}
      onClick={() => handleChainSelect(chain)}
      className={cn(
        "flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-left transition-colors",
        "hover:bg-accent/50",
        selectedChain.chainIndex === chain.chainIndex && "bg-accent"
      )}
    >
      <img 
        src={chain.icon} 
        alt={chain.name} 
        className="w-6 h-6 rounded-full object-cover shrink-0"
        onError={(e) => handleIconError(e, chain.shortName)}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{chain.name}</span>
          {chain.isPrimary && (
            <Star className="w-3 h-3 text-primary fill-primary shrink-0" />
          )}
        </div>
      </div>
      {selectedChain.chainIndex === chain.chainIndex && (
        <Check className="w-4 h-4 text-primary shrink-0" />
      )}
    </button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className={cn(
            "gap-2 min-w-[120px] justify-between",
            isConnected && !isOnCorrectChain && selectedChain.isEvm && "border-warning text-warning"
          )}
        >
          <div className="flex items-center gap-2">
            <img 
              src={selectedChain.icon} 
              alt={selectedChain.name} 
              className="w-5 h-5 rounded-full object-cover"
              onError={(e) => handleIconError(e, selectedChain.shortName)}
            />
            <span className="hidden sm:inline truncate max-w-[80px]">{selectedChain.shortName}</span>
          </div>
          <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        align="start" 
        className="w-64 p-0 z-50"
        sideOffset={8}
      >
        <div className="px-3 py-2 border-b border-border">
          <p className="text-xs font-medium text-muted-foreground">Select Network</p>
        </div>
        <ScrollArea className="h-[380px]">
          <div className="p-1">
            {/* EVM Chains */}
            <div className="px-2 py-1.5 flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">EVM Networks</span>
              <span className="text-xs text-muted-foreground/60">({evmChains.length})</span>
            </div>
            {evmChains.map(renderChainItem)}
            
            {/* Non-EVM Chains */}
            {!showOnlyEvm && nonEvmChains.length > 0 && (
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
