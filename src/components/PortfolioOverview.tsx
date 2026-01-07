import { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { useExchangeMode } from '@/contexts/ExchangeModeContext';
import { okxDexService, WalletTokenBalance } from '@/services/okxdex';
import { SUPPORTED_CHAINS, Chain, getEvmChains } from '@/data/chains';
import { cn } from '@/lib/utils';
import { PortfolioSummaryCard } from './portfolio/PortfolioSummaryCard';
import { PortfolioAllocationChart } from './portfolio/PortfolioAllocationChart';
import { PortfolioHoldingsTable } from './portfolio/PortfolioHoldingsTable';
import { usePortfolioPnL } from '@/hooks/usePortfolioPnL';
import { toast } from 'sonner';
import { UnifiedChainSelector, ChainFilterValue } from './ui/UnifiedChainSelector';

interface PortfolioOverviewProps {
  className?: string;
}

export function PortfolioOverview({ className }: PortfolioOverviewProps) {
  const { 
    isConnected, 
    activeAddress, 
    activeChainType,
    isOkxConnected,
    evmAddress,
    solanaAddress,
    tronAddress,
    suiAddress,
    tonAddress 
  } = useMultiWallet();
  const { globalChainFilter, setGlobalChainFilter } = useExchangeMode();
  const { saveSnapshot, getPnLMetrics } = usePortfolioPnL();
  const [totalValue, setTotalValue] = useState<number>(0);
  const [allBalances, setAllBalances] = useState<WalletTokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Dynamic chain selection based on connected wallet type and global filter
  // When a specific chain is selected, only query that chain for faster/accurate results
  const chainIndices = useMemo(() => {
    // If a specific chain is selected, only query that chain
    if (globalChainFilter && globalChainFilter !== 'all' && globalChainFilter !== 'all-evm') {
      return globalChainFilter;
    }
    
    // OKX connected: can fetch from all chains the user has addresses for
    if (isOkxConnected) {
      const indexes: string[] = [];
      // Add EVM chains if EVM address exists
      if (evmAddress) {
        indexes.push(...SUPPORTED_CHAINS.filter(c => c.isEvm).slice(0, 15).map(c => c.chainIndex));
      }
      // Add non-EVM chain indexes if those addresses exist
      if (solanaAddress) indexes.push('501');
      if (tronAddress) indexes.push('195');
      if (suiAddress) indexes.push('784');
      if (tonAddress) indexes.push('607');
      return indexes.join(',');
    }
    
    // Non-OKX: existing logic based on activeChainType
    switch (activeChainType) {
      case 'solana':
        return '501';
      case 'tron':
        return '195';
      case 'sui':
        return '784';
      case 'ton':
        return '607';
      case 'evm':
      default:
        // First 15 EVM chains for EVM wallets
        return SUPPORTED_CHAINS.filter(c => c.isEvm).slice(0, 15).map(c => c.chainIndex).join(',');
    }
  }, [globalChainFilter, activeChainType, isOkxConnected, evmAddress, solanaAddress, tronAddress, suiAddress, tonAddress]);

  // Chain options for the filter - only EVM chains since non-EVM are single-chain
  const evmChains = useMemo(() => getEvmChains(), []);

  // Get readable chain type name
  const activeChainName = useMemo(() => {
    switch (activeChainType) {
      case 'solana': return 'Solana';
      case 'tron': return 'TRON';
      case 'sui': return 'SUI';
      case 'ton': return 'TON';
      default: return 'EVM';
    }
  }, [activeChainType]);

  const fetchPortfolio = useCallback(async () => {
    if (!activeAddress) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      let allBalances: WalletTokenBalance[] = [];
      let computedTotal = 0;
      
      // For OKX with multi-chain, fetch from each chain type with its correct address
      if (isOkxConnected) {
        const fetches: Promise<WalletTokenBalance[]>[] = [];
        
        // Add EVM chains fetch if EVM address exists
        if (evmAddress) {
          const evmChains = SUPPORTED_CHAINS.filter(c => c.isEvm).slice(0, 15).map(c => c.chainIndex).join(',');
          // If filtering to a specific EVM chain, only fetch that one
          if (globalChainFilter && globalChainFilter !== 'all' && globalChainFilter !== 'all-evm') {
            const chain = SUPPORTED_CHAINS.find(c => c.chainIndex === globalChainFilter);
            if (chain?.isEvm) {
              fetches.push(okxDexService.getWalletBalances(evmAddress, globalChainFilter));
            }
          } else {
            fetches.push(okxDexService.getWalletBalances(evmAddress, evmChains));
          }
        }
        
        // Add non-EVM chain fetches only if not filtering to a specific EVM chain
        const isEvmChainFilter = globalChainFilter && 
          globalChainFilter !== 'all' && 
          globalChainFilter !== 'all-evm' && 
          SUPPORTED_CHAINS.find(c => c.chainIndex === globalChainFilter)?.isEvm;
        
        if (!isEvmChainFilter) {
          if (solanaAddress && (!globalChainFilter || globalChainFilter === 'all' || globalChainFilter === '501')) {
            fetches.push(okxDexService.getWalletBalances(solanaAddress, '501'));
          }
          if (tronAddress && (!globalChainFilter || globalChainFilter === 'all' || globalChainFilter === '195')) {
            fetches.push(okxDexService.getWalletBalances(tronAddress, '195'));
          }
          if (suiAddress && (!globalChainFilter || globalChainFilter === 'all' || globalChainFilter === '784')) {
            fetches.push(okxDexService.getWalletBalances(suiAddress, '784'));
          }
          if (tonAddress && (!globalChainFilter || globalChainFilter === 'all' || globalChainFilter === '607')) {
            fetches.push(okxDexService.getWalletBalances(tonAddress, '607'));
          }
        }
        
        const results = await Promise.all(fetches);
        allBalances = results.flat();
      } else {
        // Single address mode - use existing logic
        const [valueResult, balancesResult] = await Promise.all([
          okxDexService.getPortfolioValue(activeAddress, chainIndices),
          okxDexService.getWalletBalances(activeAddress, chainIndices),
        ]);
        
        allBalances = balancesResult;
        
        if (valueResult?.totalValue && parseFloat(valueResult.totalValue) > 0) {
          computedTotal = parseFloat(valueResult.totalValue);
        }
      }

      // Store all balances
      setAllBalances(allBalances);

      // Compute total from individual token balances if not already set
      if (computedTotal === 0) {
        computedTotal = allBalances.reduce((sum, b) => {
          const value = parseFloat(b.tokenPrice || '0') * parseFloat(b.balance || '0');
          return sum + value;
        }, 0);
      }
      
      setTotalValue(computedTotal);
      
      // Save snapshot for P&L tracking
      if (computedTotal > 0) {
        saveSnapshot(computedTotal, 'all');
      }
      
      setLastFetched(new Date());
    } catch (err) {
      console.error('Failed to fetch portfolio:', err);
      setError('Failed to load portfolio. Please try again.');
      toast.error('Failed to load portfolio');
    } finally {
      setIsLoading(false);
    }
  }, [activeAddress, chainIndices, saveSnapshot, isOkxConnected, evmAddress, solanaAddress, tronAddress, suiAddress, tonAddress, globalChainFilter]);

  // Re-fetch when chain filter changes or when connected
  useEffect(() => {
    if (isConnected && activeAddress) {
      fetchPortfolio();
    } else {
      setTotalValue(0);
      setAllBalances([]);
      setError(null);
    }
  }, [isConnected, activeAddress, fetchPortfolio, chainIndices]);

  // Filter balances based on chain filter selection
  // Since we now fetch specifically for the selected chain, this is mostly for UI consistency
  const filteredBalances = useMemo(() => {
    // If fetching for a specific chain, return all (already filtered by API)
    if (globalChainFilter && globalChainFilter !== 'all' && globalChainFilter !== 'all-evm') {
      return allBalances;
    }
    // For "all" or "all-evm", return all fetched balances
    return allBalances;
  }, [allBalances, globalChainFilter]);

  // Compute filtered total value
  const filteredTotalValue = useMemo(() => {
    return filteredBalances.reduce((sum, b) => {
      const value = parseFloat(b.tokenPrice || '0') * parseFloat(b.balance || '0');
      return sum + value;
    }, 0);
  }, [filteredBalances]);

  // Group filtered balances by chain for allocation chart
  const chainBalances = useMemo(() => {
    const grouped: Record<string, { chain: Chain; total: number; tokens: WalletTokenBalance[] }> = {};
    
    filteredBalances.forEach(b => {
      const chain = SUPPORTED_CHAINS.find(c => c.chainIndex === b.chainIndex);
      if (!chain) return;
      
      const value = parseFloat(b.tokenPrice || '0') * parseFloat(b.balance || '0');
      if (!grouped[b.chainIndex]) {
        grouped[b.chainIndex] = { chain, total: 0, tokens: [] };
      }
      grouped[b.chainIndex].total += value;
      grouped[b.chainIndex].tokens.push(b);
    });

    return Object.values(grouped)
      .sort((a, b) => b.total - a.total);
  }, [filteredBalances]);

  // Get previous day value for 24h change
  const previousValue = useMemo(() => {
    const metrics = getPnLMetrics(1);
    return metrics?.startValue;
  }, [getPnLMetrics]);

  if (!isConnected) return null;

  return (
    <section className={cn("space-y-4", className)}>
      {/* Header with chain filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Overview</h2>
          {activeChainType !== 'evm' && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {activeChainName} Wallet
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Chain Filter - show unified selector for all wallet types */}
          <UnifiedChainSelector
            value={globalChainFilter}
            onChange={(value) => setGlobalChainFilter(value)}
            showAllOption={true}
            showEvmOnlyOption={activeChainType === 'evm'}
            compact={true}
            triggerClassName="h-9"
          />

          {lastFetched && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Updated {lastFetched.toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchPortfolio}
            disabled={isLoading}
            className="h-8 w-8 shrink-0"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
            <p className="text-sm flex-1">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchPortfolio}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <PortfolioSummaryCard
        totalValue={filteredTotalValue > 0 ? filteredTotalValue : totalValue}
        previousValue={previousValue}
        balances={filteredBalances}
        isLoading={isLoading}
      />

      {/* Two column layout for chart + holdings on larger screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PortfolioAllocationChart
          chainBalances={chainBalances}
          totalValue={filteredTotalValue > 0 ? filteredTotalValue : totalValue}
        />
        <PortfolioHoldingsTable
          balances={filteredBalances}
          isLoading={isLoading}
        />
      </div>
    </section>
  );
}
