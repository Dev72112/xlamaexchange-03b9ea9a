import { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, Layers, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { okxDexService, WalletTokenBalance } from '@/services/okxdex';
import { SUPPORTED_CHAINS, Chain, getEvmChains, getChainIcon } from '@/data/chains';
import { cn } from '@/lib/utils';
import { PortfolioSummaryCard } from './portfolio/PortfolioSummaryCard';
import { PortfolioAllocationChart } from './portfolio/PortfolioAllocationChart';
import { PortfolioHoldingsTable } from './portfolio/PortfolioHoldingsTable';
import { usePortfolioPnL } from '@/hooks/usePortfolioPnL';
import { toast } from 'sonner';
import { ChainImage } from './ui/token-image';

interface PortfolioOverviewProps {
  className?: string;
}

export function PortfolioOverview({ className }: PortfolioOverviewProps) {
  const { isConnected, activeAddress, activeChainType } = useMultiWallet();
  const { saveSnapshot, getPnLMetrics } = usePortfolioPnL();
  const [totalValue, setTotalValue] = useState<number>(0);
  const [allBalances, setAllBalances] = useState<WalletTokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [chainFilter, setChainFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  // Dynamic chain selection based on connected wallet type
  // Each address type can only query its matching chain type
  const chainIndices = useMemo(() => {
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
  }, [activeChainType]);

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
      setError('Failed to load portfolio. Please try again.');
      toast.error('Failed to load portfolio');
    } finally {
      setIsLoading(false);
    }
  }, [activeAddress, chainIndices, saveSnapshot]);

  useEffect(() => {
    if (isConnected && activeAddress) {
      fetchPortfolio();
    } else {
      setTotalValue(0);
      setAllBalances([]);
      setError(null);
    }
  }, [isConnected, activeAddress, fetchPortfolio]);

  // Filter balances based on chain filter selection (only applies to EVM wallets)
  const filteredBalances = useMemo(() => {
    if (chainFilter === 'all' || activeChainType !== 'evm') return allBalances;
    return allBalances.filter(b => b.chainIndex === chainFilter);
  }, [allBalances, chainFilter, activeChainType]);

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
          {/* Chain Filter - only show for EVM wallets with multiple chains */}
          {activeChainType === 'evm' && (
            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              <Layers className="w-4 h-4 text-muted-foreground shrink-0" />
              <Select value={chainFilter} onValueChange={setChainFilter}>
                <SelectTrigger className="w-full sm:w-[180px] h-9">
                  <SelectValue placeholder="All Chains" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="all">All EVM Chains</SelectItem>
                  
                  <SelectGroup>
                    <SelectLabel>Individual Chains</SelectLabel>
                    {evmChains.slice(0, 10).map((chain) => (
                      <SelectItem key={chain.chainIndex} value={chain.chainIndex}>
                        <div className="flex items-center gap-2">
                          <ChainImage
                            src={getChainIcon(chain)}
                            alt={chain.name}
                            fallbackText={chain.shortName}
                            className="w-4 h-4"
                          />
                          <span>{chain.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}

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
        totalValue={chainFilter === 'all' ? totalValue : filteredTotalValue}
        previousValue={previousValue}
        balances={filteredBalances}
        isLoading={isLoading}
      />

      {/* Two column layout for chart + holdings on larger screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PortfolioAllocationChart
          chainBalances={chainBalances}
          totalValue={chainFilter === 'all' ? totalValue : filteredTotalValue}
        />
        <PortfolioHoldingsTable
          balances={filteredBalances}
          isLoading={isLoading}
        />
      </div>
    </section>
  );
}
