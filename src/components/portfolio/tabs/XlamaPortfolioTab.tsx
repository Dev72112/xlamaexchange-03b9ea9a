/**
 * xLama Portfolio Tab
 * Unified analytics backend with OKX fallback
 */

import { memo, useState, useMemo, Suspense, lazy, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Wallet, 
  TrendingUp, 
  PieChart, 
  Layers, 
  RefreshCw,
  ArrowRightLeft,
  ChevronDown,
  Coins,
  Eye,
  EyeOff,
  LineChart,
  Search,
  Filter,
} from 'lucide-react';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { useXlamaPortfolio } from '@/hooks/useXlamaPortfolio';
import { XlamaSyncStatus } from '@/components/XlamaSyncStatus';
import { AccountSummaryCard } from '@/components/portfolio/AccountSummaryCard';
import { PortfolioHoldingsTable } from '@/components/portfolio/PortfolioHoldingsTable';
import { PortfolioAllocationChart } from '@/components/portfolio/PortfolioAllocationChart';
import { PortfolioEmptyState } from '@/components/portfolio/PortfolioEmptyState';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { WalletTokenBalance } from '@/services/okxdex';

// Lazy load chart components
const PortfolioPnLChart = lazy(() => import('@/components/PortfolioPnLChart').then(m => ({ default: m.PortfolioPnLChart })));

export const XlamaPortfolioTab = memo(function XlamaPortfolioTab() {
  const navigate = useNavigate();
  const { activeAddress, activeChain, isConnected } = useMultiWallet();

  // UI state
  const [showChart, setShowChart] = useState(false);
  const [hideBalances, setHideBalances] = useState(false);
  const [holdingsSearch, setHoldingsSearch] = useState('');
  const [hideDust, setHideDust] = useState(false);

  // xLama data with automatic OKX fallback
  const { 
    holdings, 
    totalValue, 
    chainBreakdown,
    isLoading, 
    isError,
    refetch 
  } = useXlamaPortfolio({ enabled: true });

  // Convert xLama holdings to WalletTokenBalance format for the table
  const balances = useMemo((): WalletTokenBalance[] => {
    return holdings.map(h => ({
      chainIndex: h.chain_id,
      tokenContractAddress: h.token_address,
      address: h.token_address,
      symbol: h.token_symbol,
      balance: h.balance,
      tokenPrice: String(h.price_usd),
      isRiskToken: false,
    }));
  }, [holdings]);

  // Filter by search term
  const filteredBalances = useMemo(() => {
    if (!holdingsSearch) return balances;
    const query = holdingsSearch.toLowerCase();
    return balances.filter(b => 
      b.symbol.toLowerCase().includes(query) ||
      b.tokenContractAddress.toLowerCase().includes(query)
    );
  }, [balances, holdingsSearch]);

  // Filter out dust (tokens worth less than $1)
  const visibleBalances = useMemo(() => {
    if (!hideDust) return filteredBalances;
    return filteredBalances.filter(b => {
      const value = parseFloat(b.balance) * parseFloat(b.tokenPrice || '0');
      return value >= 1;
    });
  }, [filteredBalances, hideDust]);

  const dustCount = filteredBalances.length - visibleBalances.length;
  const hasAnyBalances = balances.length > 0;

  // Determine which empty state to show
  const showEmptyState = !isLoading && visibleBalances.length === 0;
  const emptyStateProps = {
    isConnected: !!isConnected,
    hasAnyBalances,
    searchQuery: holdingsSearch,
    dustFilterActive: hideDust && hasAnyBalances && filteredBalances.length > 0,
    dustCount,
  };

  // Chain balances for allocation chart
  const chainBalancesForChart = useMemo(() => {
    return chainBreakdown.map(cb => ({
      chain: { 
        name: cb.chain, 
        shortName: cb.chain.slice(0, 3).toUpperCase() 
      },
      total: cb.value_usd,
    })).sort((a, b) => b.total - a.total);
  }, [chainBreakdown]);

  const handleRefresh = useCallback(async () => {
    await refetch();
    toast.success('Portfolio refreshed');
  }, [refetch]);

  return (
    <div className="space-y-4">
      {/* Controls with Sync Status */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <XlamaSyncStatus />
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" onClick={() => setHideBalances(!hideBalances)} className="h-8 w-8">
            {hideBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isLoading} className="h-8 w-8">
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Account Summary */}
      <AccountSummaryCard
        totalValue={hideBalances ? 0 : totalValue}
        chainName="xLama API"
        chainIcon={activeChain?.icon}
        address={activeAddress || ''}
        isLoading={isLoading}
      />

      {/* Quick Actions */}
      <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
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

      {/* Two-column layout for desktop */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

      {/* Holdings List */}
      <Card className="glass border-border/50">
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 px-4 py-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                Holdings
                <Badge variant="outline" className="text-[10px] py-0 bg-primary/10 text-primary border-primary/20">
                  <LineChart className="w-2.5 h-2.5 mr-1" />
                  xLama
                </Badge>
              </h3>
              <Badge variant="secondary" className="text-xs">
                {visibleBalances.length} tokens
                {dustCount > 0 && hideDust && (
                  <span className="text-muted-foreground ml-1">
                    ({dustCount} hidden)
                  </span>
                )}
              </Badge>
            </div>
            
            {/* Search and Dust Filter */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search tokens..."
                  value={holdingsSearch}
                  onChange={(e) => setHoldingsSearch(e.target.value)}
                  className="h-8 pl-8 text-sm"
                />
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground hidden sm:inline">Hide dust</span>
                <Switch
                  checked={hideDust}
                  onCheckedChange={setHideDust}
                  className="scale-90"
                />
              </div>
            </div>
          </div>
          
          {/* Holdings content or empty state */}
          {showEmptyState ? (
            <PortfolioEmptyState {...emptyStateProps} />
          ) : (
            <ScrollArea className="h-[280px] sm:h-[320px] lg:h-[400px] xl:h-[480px]">
              <PortfolioHoldingsTable 
                balances={visibleBalances} 
                isLoading={isLoading}
                className="border-0 shadow-none"
              />
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Charts column for desktop - visible only on xl+ */}
      <div className="hidden xl:block space-y-4">
        <PortfolioAllocationChart chainBalances={chainBalancesForChart} totalValue={totalValue} />
        <Card className="glass border-border/50">
          <CardContent className="pt-4">
            <Suspense fallback={<div className="h-48 skeleton-shimmer rounded-lg" />}>
              <PortfolioPnLChart />
            </Suspense>
          </CardContent>
        </Card>
      </div>
      </div>

      {/* Mobile/Tablet: Collapsible Charts */}
      <div className="xl:hidden space-y-2">

      {/* Chain Distribution - Collapsible */}
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
      </div>

      {/* Error state */}
      {isError && (
        <Card className="glass border-destructive/20">
          <CardContent className="py-4 text-center">
            <p className="text-sm text-destructive">Failed to load portfolio data</p>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2">
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

export default XlamaPortfolioTab;
