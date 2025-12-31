import React from 'react';
import { Check, ChevronDown, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Chain, SUPPORTED_CHAINS, getEvmChains } from '@/data/chains';
import { useWallet } from '@/contexts/WalletContext';
import { cn } from '@/lib/utils';

interface ChainSelectorProps {
  selectedChain: Chain;
  onChainSelect: (chain: Chain) => void;
  showOnlyEvm?: boolean;
}

export function ChainSelector({ selectedChain, onChainSelect, showOnlyEvm = true }: ChainSelectorProps) {
  const { chainId, switchChain, isConnected } = useWallet();
  
  const chains = showOnlyEvm ? getEvmChains() : SUPPORTED_CHAINS;
  
  // Check if wallet is on the selected chain
  const isOnCorrectChain = chainId === selectedChain.chainId;

  const handleChainSelect = async (chain: Chain) => {
    onChainSelect(chain);
    
    // If wallet is connected and chain is different, prompt to switch
    if (isConnected && chain.chainId && chainId !== chain.chainId) {
      try {
        await switchChain(chain.chainId);
      } catch (error) {
        console.error('Failed to switch chain:', error);
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={cn(
            "gap-2 min-w-[140px] justify-between",
            isConnected && !isOnCorrectChain && "border-warning text-warning"
          )}
        >
          <div className="flex items-center gap-2">
            <img 
              src={selectedChain.icon} 
              alt={selectedChain.name} 
              className="w-5 h-5 rounded-full"
            />
            <span className="hidden sm:inline">{selectedChain.shortName}</span>
          </div>
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Select Network
        </div>
        <DropdownMenuSeparator />
        
        {chains.map((chain) => (
          <DropdownMenuItem
            key={chain.chainIndex}
            onClick={() => handleChainSelect(chain)}
            className="flex items-center gap-3 py-2.5"
          >
            <img 
              src={chain.icon} 
              alt={chain.name} 
              className="w-6 h-6 rounded-full"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{chain.name}</span>
                {chain.isPrimary && (
                  <Star className="w-3 h-3 text-primary fill-primary" />
                )}
              </div>
            </div>
            {selectedChain.chainIndex === chain.chainIndex && (
              <Check className="w-4 h-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
