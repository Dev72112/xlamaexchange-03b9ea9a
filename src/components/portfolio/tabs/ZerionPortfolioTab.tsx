/**
 * Zerion Portfolio Tab
 * DeFi positions, NFTs, and advanced PnL tracking
 */

import { memo, useState, useMemo, Suspense, lazy, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Wallet, 
  TrendingUp, 
  PieChart, 
  Layers, 
  Image, 
  RefreshCw,
  ArrowRightLeft,
  ChevronDown,
  Coins,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { useZerionPortfolio } from '@/hooks/useZerionPortfolio';
import { useZerionNFTs } from '@/hooks/useZerionNFTs';
import { AccountSummaryCard } from '@/components/portfolio/AccountSummaryCard';
import { PortfolioHoldingsTable } from '@/components/portfolio/PortfolioHoldingsTable';
import { PortfolioAllocationChart } from '@/components/portfolio/PortfolioAllocationChart';
import { NFTGallery } from '@/components/portfolio/NFTGallery';
import { DeFiPositions } from '@/components/portfolio/DeFiPositions';
import { ProtocolBreakdown } from '@/components/analytics/ProtocolBreakdown';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { WalletTokenBalance } from '@/services/okxdex';

// Lazy load chart components
const PortfolioPnLChart = lazy(() => import('@/components/PortfolioPnLChart').then(m => ({ default: m.PortfolioPnLChart })));

export const ZerionPortfolioTab = memo(function ZerionPortfolioTab() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeAddress, activeChain, activeChainType } = useMultiWallet();

  // UI state
  const [showChart, setShowChart] = useState(false);
  const [showNFTs, setShowNFTs] = useState(false);
  const [showDeFi, setShowDeFi] = useState(true);
  const [showProtocols, setShowProtocols] = useState(false);
  const [hideBalances, setHideBalances] = useState(false);

  // Zerion data
  const { 
    positions, 
    portfolio,
    defiPositions, 
    isLoading, 
    isError,
    refetch 
  } = useZerionPortfolio();
  
  // Calculate total value from portfolio or positions
  const totalValue = useMemo(() => {
    if (portfolio?.totalValue) return portfolio.totalValue;
    return positions.reduce((sum, pos) => sum + (pos.value || 0), 0);
  }, [portfolio, positions]);

  const { 
    collections: nftCollections, 
    totalFloorValue: nftFloorValue,
    totalCount: nftCount,
    isLoading: nftsLoading 
  } = useZerionNFTs();

  // Convert Zerion positions to WalletTokenBalance format for the table
  const balances = useMemo((): WalletTokenBalance[] => {
    return positions.filter(pos => pos.positionType === 'wallet').map(pos => ({
      chainIndex: pos.chainId || '1',
      tokenContractAddress: pos.tokenAddress || '',
      address: pos.tokenAddress || '',
      symbol: pos.tokenSymbol,
      balance: String(pos.quantity || 0),
      tokenPrice: String(pos.price || 0),
      isRiskToken: false,
    }));
  }, [positions]);

  // Chain balances for allocation chart
  const chainBalancesForChart = useMemo(() => {
    const grouped: Record<string, number> = {};
    positions.forEach(pos => {
      const chainName = pos.chainName || 'Unknown';
      const value = pos.value || 0;
      grouped[chainName] = (grouped[chainName] || 0) + value;
    });
    
    return Object.entries(grouped).map(([chain, total]) => ({
      chain: { name: chain, shortName: chain.slice(0, 3).toUpperCase() },
      total,
    })).sort((a, b) => b.total - a.total);
  }, [positions]);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['zerion'] });
    refetch();
    toast.success('Portfolio refreshed');
  }, [queryClient, refetch]);

  // Only show for EVM wallets
  if (activeChainType !== 'evm') {
    return (
      <Card className="glass border-border/50">
        <CardContent className="py-12 text-center">
          <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">EVM Only</h3>
          <p className="text-sm text-muted-foreground">
            Zerion data is only available for EVM wallets. Switch to an EVM chain to view DeFi positions and advanced analytics.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-end gap-1.5">
        <Button variant="ghost" size="icon" onClick={() => setHideBalances(!hideBalances)} className="h-8 w-8">
          {hideBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isLoading} className="h-8 w-8">
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
        </Button>
      </div>

      {/* Account Summary */}
      <AccountSummaryCard
        totalValue={hideBalances ? 0 : totalValue}
        chainName="All EVM (Zerion)"
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

      {/* DeFi Positions - Prominent for Zerion */}
      <Collapsible open={showDeFi} onOpenChange={setShowDeFi}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between h-12 glass-subtle">
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              DeFi Positions
              {defiPositions.length > 0 && <Badge variant="secondary" className="text-xs">{defiPositions.length}</Badge>}
            </span>
            <ChevronDown className={cn("w-4 h-4 transition-transform", showDeFi && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <DeFiPositions positions={defiPositions} isLoading={isLoading} />
        </CollapsibleContent>
      </Collapsible>

      {/* Holdings List */}
      <Card className="glass border-border/50">
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <h3 className="font-medium flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              Holdings
              <Badge variant="outline" className="text-[10px] py-0">Zerion</Badge>
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

      {/* Protocol Breakdown - Collapsible */}
      <Collapsible open={showProtocols} onOpenChange={setShowProtocols}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between h-12 glass-subtle">
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Protocol Breakdown
            </span>
            <ChevronDown className={cn("w-4 h-4 transition-transform", showProtocols && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <ProtocolBreakdown positions={defiPositions} isLoading={isLoading} />
        </CollapsibleContent>
      </Collapsible>

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
            collections={nftCollections || []}
            isLoading={nftsLoading}
            totalFloorValue={nftFloorValue}
            totalCount={nftCount}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Error state */}
      {isError && (
        <Card className="glass border-destructive/20">
          <CardContent className="py-4 text-center">
            <p className="text-sm text-destructive">Failed to load Zerion data</p>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2">
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

export default ZerionPortfolioTab;
