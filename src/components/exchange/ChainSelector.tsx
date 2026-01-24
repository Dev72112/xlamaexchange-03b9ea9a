import React, { useCallback, useMemo } from 'react';
import { Check, ChevronDown, Star, Globe, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Chain, getEvmChains, getNonEvmChains } from '@/data/chains';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { prefetchChain } from '@/lib/tokenPrefetch';
import { isChainExcludedFromDex } from '@/features/wallet/core/types';
import { lifiService } from '@/services/lifi';

interface ChainSelectorProps {
  selectedChain: Chain;
  onChainSelect: (chain: Chain) => void;
  showOnlyEvm?: boolean;
  excludeChainIndex?: string;
  /** Only show chains supported by Li.Fi bridge (Bridge mode) */
  showOnlyBridgeSupported?: boolean;
}

export function ChainSelector({ 
  selectedChain, 
  onChainSelect, 
  showOnlyEvm = false, 
  excludeChainIndex,
  showOnlyBridgeSupported = false
}: ChainSelectorProps) {
  const { 
    evmChainId: chainId, 
    switchEvmChain: switchChain, 
    isConnected,
    isOkxConnected,
    switchChainByIndex
  } = useMultiWallet();
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();
  
  // Filter chains based on mode
  const evmChains = useMemo(() => {
    let chains = getEvmChains()
      .filter(c => c.chainIndex !== excludeChainIndex)
      .filter(c => !isChainExcludedFromDex(c.chainId));
    
    // Bridge mode: only show Li.Fi supported chains
    if (showOnlyBridgeSupported) {
      chains = chains.filter(c => lifiService.isChainSupported(c.chainIndex));
    }
    
    return chains;
  }, [excludeChainIndex, showOnlyBridgeSupported]);
  
  // Non-EVM chains are NOT supported by Li.Fi bridge
  const nonEvmChains = useMemo(() => {
    if (showOnlyBridgeSupported) return []; // Hide all non-EVM in bridge mode
    return getNonEvmChains().filter(c => c.chainIndex !== excludeChainIndex);
  }, [excludeChainIndex, showOnlyBridgeSupported]);
  
  // Check if wallet is on the selected chain
  const isOnCorrectChain = chainId === selectedChain.chainId;

  const handleChainSelect = async (chain: Chain) => {
    // Close popover FIRST to prevent stuck state
    setOpen(false);
    
    // Always update the chain selection
    onChainSelect(chain);
    
    // Process network switching after a frame to prevent UI conflicts
    requestAnimationFrame(async () => {
      // Priority 1: OKX Universal Provider - seamless multi-chain switching
      if (isOkxConnected) {
        try {
          await switchChainByIndex(chain.chainIndex);
          console.log(`[ChainSelector] OKX seamless switch to ${chain.name}`);
          return;
        } catch (error) {
          console.warn('[ChainSelector] OKX switch failed:', error);
          // Fall through to other methods
        }
      }
      
      // Priority 2: EVM chains via Reown/wagmi
      if (chain.isEvm && chain.chainId) {
        if (isConnected && chainId !== chain.chainId) {
          try {
            await switchChain(chain.chainId);
          } catch (error: any) {
            if (error?.code === 4001) {
              return; // User rejected
            }
            console.warn('Network switch:', error?.message || error);
            toast({
              title: "Network Switch",
              description: `Please switch to ${chain.name} in your wallet.`,
            });
          }
        }
      }
      
      // Non-EVM without OKX: just UI update (existing behavior)
      console.log(`[ChainSelector] Selected ${chain.isEvm ? 'EVM' : 'non-EVM'} chain: ${chain.name}`);
    });
  };

  // Fallback icon handler
  const handleIconError = (e: React.SyntheticEvent<HTMLImageElement>, name: string) => {
    const target = e.target as HTMLImageElement;
    target.onerror = null;
    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name.slice(0, 2))}&background=6366f1&color=fff&size=64`;
  };

  // Prefetch tokens when hovering over a chain
  const handleChainHover = useCallback((chain: Chain) => {
    prefetchChain(chain.chainIndex);
  }, []);

  const renderChainItem = (chain: Chain) => (
    <button
      key={chain.chainIndex}
      onClick={() => handleChainSelect(chain)}
      onMouseEnter={() => handleChainHover(chain)}
      className={cn(
        "flex items-center gap-3 w-full px-3 py-2.5 min-h-[44px] rounded-md text-left transition-colors",
        "hover:bg-accent/50 active:bg-accent/70",
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
        className="w-64 max-w-[calc(100vw-2rem)] p-0 z-50"
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
