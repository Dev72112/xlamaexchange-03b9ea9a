import { useState, useEffect, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { okxDexService, WalletTokenBalance } from '@/services/okxdex';
import { SUPPORTED_CHAINS, Chain } from '@/data/chains';
import { cn } from '@/lib/utils';
import { PortfolioSummaryCard } from './portfolio/PortfolioSummaryCard';
import { PortfolioAllocationChart } from './portfolio/PortfolioAllocationChart';
import { PortfolioHoldingsTable } from './portfolio/PortfolioHoldingsTable';
import { usePortfolioPnL } from '@/hooks/usePortfolioPnL';

interface PortfolioOverviewProps {
  className?: string;
}

export function PortfolioOverview({ className }: PortfolioOverviewProps) {
  const { isConnected, activeAddress } = useMultiWallet();
  const { saveSnapshot, getPnLMetrics } = usePortfolioPnL();
  const [totalValue, setTotalValue] = useState<number>(0);
  const [allBalances, setAllBalances] = useState<WalletTokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  // Get chain indices for fetching
  const chainIndices = useMemo(() => 
    SUPPORTED_CHAINS.slice(0, 10).map(c => c.chainIndex).join(','), 
    []
  );

  const fetchPortfolio = async () => {
    if (!activeAddress) return;
    
    setIsLoading(true);
    try {
      // Fetch portfolio value and balances in parallel
      const [valueResult, balancesResult] = await Promise.all([
        okxDexService.getPortfolioValue(activeAddress, chainIndices),
        okxDexService.getWalletBalances(activeAddress, chainIndices),
      ]);

      // Store all balances
      setAllBalances(balancesResult);

      // Use API total, or compute fallback from balances
      let computedTotal = 0;
      if (valueResult?.totalValue && parseFloat(valueResult.totalValue) > 0) {
        computedTotal = parseFloat(valueResult.totalValue);
      } else {
        // Fallback: compute total from individual token balances
        computedTotal = balancesResult.reduce((sum, b) => {
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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && activeAddress) {
      fetchPortfolio();
    } else {
      setTotalValue(0);
      setAllBalances([]);
    }
  }, [isConnected, activeAddress]);

  // Group all balances by chain for allocation chart
  const chainBalances = useMemo(() => {
    const grouped: Record<string, { chain: Chain; total: number; tokens: WalletTokenBalance[] }> = {};
    
    allBalances.forEach(b => {
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
  }, [allBalances]);

  // Get previous day value for 24h change
  const previousValue = useMemo(() => {
    const metrics = getPnLMetrics(1);
    return metrics?.startValue;
  }, [getPnLMetrics]);

  if (!isConnected) return null;

  return (
    <section className={cn("space-y-4", className)}>
      {/* Summary Card with key metrics */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Overview</h2>
        <div className="flex items-center gap-2">
          {lastFetched && (
            <span className="text-xs text-muted-foreground">
              Updated {lastFetched.toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchPortfolio}
            disabled={isLoading}
            className="h-8 w-8"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      <PortfolioSummaryCard
        totalValue={totalValue}
        previousValue={previousValue}
        balances={allBalances}
        isLoading={isLoading}
      />

      {/* Two column layout for chart + holdings on larger screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PortfolioAllocationChart
          chainBalances={chainBalances}
          totalValue={totalValue}
        />
        <PortfolioHoldingsTable
          balances={allBalances}
          isLoading={isLoading}
        />
      </div>
    </section>
  );
}
