/**
 * OKX Portfolio Tab
 * Multi-chain token balances via OKX DEX API
 */

import { memo, useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Wallet, 
  TrendingUp, 
  PieChart, 
  Layers, 
  AlertTriangle, 
  Image, 
  RefreshCw,
  ArrowRightLeft,
  ChevronDown,
  Coins,
  Eye,
  EyeOff,
  Check,
  Cpu,
  Zap,
} from 'lucide-react';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { useExchangeMode } from '@/contexts/ExchangeModeContext';
import { okxDexService, WalletTokenBalance } from '@/services/okxdex';
import { AccountSummaryCard } from '@/components/portfolio/AccountSummaryCard';
import { PortfolioHoldingsTable } from '@/components/portfolio/PortfolioHoldingsTable';
import { PortfolioAllocationChart } from '@/components/portfolio/PortfolioAllocationChart';
import { NFTGallery } from '@/components/portfolio/NFTGallery';
import { useOkxNFTs } from '@/hooks/useOkxNFTs';
import { usePortfolioPnL } from '@/hooks/usePortfolioPnL';
import { SUPPORTED_CHAINS, getEvmChains, Chain } from '@/data/chains';
import { ChainImage } from '@/components/ui/token-image';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Lazy load chart components
const PortfolioPnLChart = lazy(() => import('@/components/PortfolioPnLChart').then(m => ({ default: m.PortfolioPnLChart })));

type ChainFilter = 'all-evm' | 'evm-chain' | 'solana';
const evmChains = getEvmChains();

export const OkxPortfolioTab = memo(function OkxPortfolioTab() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { 
    isConnected, 
    activeChainType, 
    activeAddress,
    activeChain,
    setActiveChain, 
    switchChainByIndex,
    isOkxConnected,
  } = useMultiWallet();
  const { setGlobalChainFilter } = useExchangeMode();
  const { saveSnapshot, getPnLMetrics } = usePortfolioPnL();

  // UI state
  const [chainFilter, setChainFilter] = useState<ChainFilter>(
    activeChainType === 'solana' ? 'solana' : 'all-evm'
  );
  const [selectedEvmChain, setSelectedEvmChain] = useState<Chain | null>(null);
  const [chainSelectorOpen, setChainSelectorOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [showNFTs, setShowNFTs] = useState(false);
  const [hideBalances, setHideBalances] = useState(false);

  // Build chain query
  const chainsToFetch = useMemo(() => {
    if (chainFilter === 'all-evm') {
      return evmChains.map(c => c.chainIndex).join(',');
    } else if (chainFilter === 'solana') {
      return '501';
    } else if (chainFilter === 'evm-chain' && selectedEvmChain) {
      return selectedEvmChain.chainIndex;
    }
    return activeChain?.chainIndex || '1';
  }, [chainFilter, selectedEvmChain, activeChain]);

  // Fetch balances via React Query
  const { data: balances = [], isLoading, error, refetch } = useQuery({
    queryKey: ['okx-portfolio', activeAddress, chainsToFetch],
    queryFn: async () => {
      if (!activeAddress) return [];
      const result = await okxDexService.getWalletBalances(activeAddress, chainsToFetch);
      // Save snapshot for P&L
      const total = result.reduce((sum, b) => 
        sum + (parseFloat(b.tokenPrice || '0') * parseFloat(b.balance || '0')), 0
      );
      const primaryChainIndex = chainFilter === 'all-evm' ? '1' : 
                                chainFilter === 'solana' ? '501' : 
                                selectedEvmChain?.chainIndex || '1';
      await saveSnapshot(total, primaryChainIndex);
      return result;
    },
    enabled: isConnected && !!activeAddress,
    staleTime: 30 * 1000,
  });

  // Calculate totals
  const totalValue = useMemo(() => 
    balances.reduce((sum, b) => sum + (parseFloat(b.tokenPrice || '0') * parseFloat(b.balance || '0')), 0)
  , [balances]);

  const pnlMetrics = useMemo(() => getPnLMetrics(1), [getPnLMetrics, totalValue]);

  // Chain balances for allocation chart
  const chainBalancesForChart = useMemo(() => {
    const grouped: Record<string, number> = {};
    balances.forEach(b => {
      const key = b.chainIndex || '1';
      const value = parseFloat(b.tokenPrice || '0') * parseFloat(b.balance || '0');
      grouped[key] = (grouped[key] || 0) + value;
    });
    
    return Object.entries(grouped).map(([chainIndex, total]) => {
      const chainInfo = SUPPORTED_CHAINS.find(c => c.chainIndex === chainIndex);
      return {
        chain: { 
          name: chainInfo?.name || 'Unknown', 
          shortName: chainInfo?.shortName || chainIndex 
        },
        total,
      };
    }).sort((a, b) => b.total - a.total);
  }, [balances]);

  // NFT data
  const { 
    collections: nftCollections, 
    totalFloorValue: nftFloorValue,
    totalCount: nftCount,
    isLoading: nftsLoading 
  } = useOkxNFTs();

  // Sync chain filter with wallet
  useEffect(() => {
    if (activeChainType === 'solana') {
      setChainFilter('solana');
      setSelectedEvmChain(null);
    } else if (activeChainType === 'evm' && chainFilter === 'solana') {
      setChainFilter('all-evm');
    }
  }, [activeChainType, chainFilter]);

  // Handle chain filter change
  const handleChainFilterChange = useCallback(async (newFilter: ChainFilter, chain?: Chain) => {
    setChainFilter(newFilter);
    setSelectedEvmChain(chain || null);
    setChainSelectorOpen(false);
    
    if (newFilter === 'solana') {
      setGlobalChainFilter('501');
    } else if (newFilter === 'evm-chain' && chain) {
      setGlobalChainFilter(chain.chainIndex);
    } else {
      setGlobalChainFilter('all-evm');
    }
    
    const targetChain = newFilter === 'solana'
      ? SUPPORTED_CHAINS.find(c => c.chainIndex === '501')
      : newFilter === 'evm-chain' && chain
        ? chain
        : SUPPORTED_CHAINS.find(c => c.chainIndex === '1');
    
    if (!targetChain) return;
    setActiveChain(targetChain);
    
    if (isOkxConnected) {
      try {
        setIsSwitching(true);
        await switchChainByIndex(targetChain.chainIndex);
      } catch (err) {
        console.warn('[OkxPortfolioTab] Chain switch failed:', err);
      } finally {
        setIsSwitching(false);
      }
    }
  }, [setActiveChain, switchChainByIndex, isOkxConnected, setGlobalChainFilter]);

  const handleRefresh = useCallback(async () => {
    await refetch();
    toast.success('Portfolio refreshed');
  }, [refetch]);

  const isWalletSynced = activeChainType === 'evm' || activeChainType === chainFilter;

  return (
    <div className="space-y-4">
      {/* Chain Filter Controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          {/* All EVM Button */}
          <Button
            variant={chainFilter === 'all-evm' ? "default" : "ghost"}
            size="sm"
            onClick={() => handleChainFilterChange('all-evm')}
            disabled={isSwitching}
            className={cn("h-8 px-2.5 text-xs gap-1", chainFilter === 'all-evm' && "bg-primary text-primary-foreground")}
          >
            <Cpu className="w-3 h-3" />
            All EVM
          </Button>
          
          {/* EVM Chain Selector */}
          <Popover open={chainSelectorOpen} onOpenChange={setChainSelectorOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={chainFilter === 'evm-chain' ? "default" : "ghost"}
                size="sm"
                disabled={isSwitching}
                className={cn("h-8 px-2.5 text-xs gap-1", chainFilter === 'evm-chain' && "bg-primary text-primary-foreground")}
              >
                {selectedEvmChain ? (
                  <>
                    <ChainImage src={selectedEvmChain.icon} alt={selectedEvmChain.shortName} fallbackText={selectedEvmChain.shortName} className="w-4 h-4" />
                    <span className="hidden xs:inline">{selectedEvmChain.shortName}</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-3 h-3" />
                    Chain
                  </>
                )}
                <ChevronDown className="w-3 h-3 ml-0.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-1 max-h-[300px] overflow-hidden" sideOffset={4}>
              <ScrollArea className="h-[280px]">
                <div className="space-y-0.5 p-1">
                  {evmChains.slice(0, 20).map((chain) => (
                    <button
                      key={chain.chainIndex}
                      onClick={() => handleChainFilterChange('evm-chain', chain)}
                      className={cn(
                        "flex items-center gap-2 w-full px-2 py-1.5 rounded text-left text-xs hover:bg-accent/50",
                        selectedEvmChain?.chainIndex === chain.chainIndex && "bg-accent"
                      )}
                    >
                      <ChainImage src={chain.icon} alt={chain.shortName} fallbackText={chain.shortName} className="w-4 h-4" />
                      <span className="flex-1 truncate">{chain.name}</span>
                      {selectedEvmChain?.chainIndex === chain.chainIndex && (
                        <Check className="w-3 h-3 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
                <ScrollBar orientation="vertical" />
              </ScrollArea>
            </PopoverContent>
          </Popover>
          
          {/* Solana Button */}
          <Button
            variant={chainFilter === 'solana' ? "default" : "ghost"}
            size="sm"
            onClick={() => handleChainFilterChange('solana')}
            disabled={isSwitching}
            className={cn("h-8 px-2.5 text-xs gap-1", chainFilter === 'solana' && "bg-primary text-primary-foreground")}
          >
            <Zap className="w-3 h-3" />
            SOL
          </Button>
        </div>
        
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" onClick={() => setHideBalances(!hideBalances)} className="h-8 w-8">
            {hideBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isLoading} className="h-8 w-8">
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Sync Warning */}
      {!isWalletSynced && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/10 border border-warning/20 text-xs text-warning">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          <span>Wallet is on a different network</span>
        </div>
      )}

      {/* Account Summary */}
      <AccountSummaryCard
        totalValue={hideBalances ? 0 : totalValue}
        change24h={pnlMetrics?.absoluteChange}
        changePercent24h={pnlMetrics?.percentChange}
        chainName={activeChain?.name || 'Ethereum'}
        chainIcon={activeChain?.icon}
        address={activeAddress || ''}
        isLoading={isLoading}
      />

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-2">
        <Button variant="outline" className="h-12 flex-col gap-1 glass-subtle hover-lift" onClick={() => navigate('/swap')}>
          <ArrowRightLeft className="w-4 h-4 text-primary" />
          <span className="text-xs">Swap</span>
        </Button>
        <Button variant="outline" className="h-12 flex-col gap-1 glass-subtle hover-lift" onClick={() => navigate('/bridge')}>
          <Layers className="w-4 h-4 text-primary" />
          <span className="text-xs">Bridge</span>
        </Button>
        <Button variant="outline" className="h-12 flex-col gap-1 glass-subtle hover-lift" onClick={() => navigate('/orders')}>
          <Coins className="w-4 h-4 text-primary" />
          <span className="text-xs">Orders</span>
        </Button>
      </div>

      {/* Holdings List */}
      <Card className="glass border-border/50">
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <h3 className="font-medium flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              Holdings
              <Badge variant="outline" className="text-[10px] py-0">OKX</Badge>
            </h3>
            <Badge variant="secondary" className="text-xs">
              {balances.length} tokens
            </Badge>
          </div>
          <ScrollArea className="h-[280px]">
            <PortfolioHoldingsTable 
              balances={balances} 
              isLoading={isLoading}
              className="border-0 shadow-none"
            />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Allocation Chart - Collapsible */}
      <Collapsible open={showChart} onOpenChange={setShowChart}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between h-12 glass-subtle">
            <span className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-primary" />
              Chain Distribution
            </span>
            <ChevronDown className={cn("w-4 h-4 transition-transform", showChart && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <PortfolioAllocationChart chainBalances={chainBalancesForChart} totalValue={totalValue} />
        </CollapsibleContent>
      </Collapsible>

      {/* Performance Chart - Collapsible */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between h-12 glass-subtle">
            <span className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Performance History
            </span>
            <ChevronDown className="w-4 h-4 transition-transform data-[state=open]:rotate-180" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <Card className="glass border-border/50">
            <CardContent className="pt-4">
              <Suspense fallback={<div className="h-48 skeleton-shimmer rounded-lg" />}>
                <PortfolioPnLChart />
              </Suspense>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* NFTs - Collapsible */}
      <Collapsible open={showNFTs} onOpenChange={setShowNFTs}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between h-12 glass-subtle">
            <span className="flex items-center gap-2">
              <Image className="w-4 h-4 text-primary" />
              NFTs
              {nftCount > 0 && <Badge variant="secondary" className="text-xs">{nftCount}</Badge>}
            </span>
            <ChevronDown className={cn("w-4 h-4 transition-transform", showNFTs && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <NFTGallery 
            collections={nftCollections as any || []}
            isLoading={nftsLoading}
            totalFloorValue={nftFloorValue}
            totalCount={nftCount}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Error state */}
      {error && (
        <Card className="glass border-destructive/20">
          <CardContent className="py-4 text-center">
            <p className="text-sm text-destructive">{String(error)}</p>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2">
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

export default OkxPortfolioTab;
