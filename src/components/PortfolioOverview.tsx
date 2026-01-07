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
import { SUPPORTED_CHAINS, Chain, getEvmChains, getNonEvmChains, getChainIcon, isNonEvmChain } from '@/data/chains';
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

// Detect address type and return applicable chains
function getApplicableChainsForAddress(address: string): Chain[] {
  if (!address) return [];
  
  const trimmed = address.trim();
  
  // EVM address (0x + 40 hex chars)
  if (/^0x[a-fA-F0-9]{40}$/i.test(trimmed)) {
    return SUPPORTED_CHAINS.filter(c => c.isEvm);
  }
  
  // TRON address (starts with T, 34 chars base58)
  if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(trimmed)) {
    return SUPPORTED_CHAINS.filter(c => c.chainIndex === '195');
  }
  
  // Solana address (32-44 chars base58, not starting with T)
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed) && !trimmed.startsWith('T')) {
    return SUPPORTED_CHAINS.filter(c => c.chainIndex === '501');
  }
  
  // TON address (EQ or UQ prefix)
  if (/^(EQ|UQ)[A-Za-z0-9_-]{46}$/.test(trimmed) || /^0:[a-fA-F0-9]{64}$/.test(trimmed)) {
    return SUPPORTED_CHAINS.filter(c => c.chainIndex === '607');
  }
  
  // SUI address (0x + 64 hex chars)
  if (/^0x[a-fA-F0-9]{64}$/i.test(trimmed)) {
    return SUPPORTED_CHAINS.filter(c => c.chainIndex === '784');
  }
  
  // Default to EVM chains if unknown
  return SUPPORTED_CHAINS.filter(c => c.isEvm);
}

export function PortfolioOverview({ className }: PortfolioOverviewProps) {
  const { isConnected, activeAddress } = useMultiWallet();
  const { saveSnapshot, getPnLMetrics } = usePortfolioPnL();
  const [totalValue, setTotalValue] = useState<number>(0);
  const [allBalances, setAllBalances] = useState<WalletTokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [chainFilter, setChainFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  // Get applicable chains based on wallet address type
  const applicableChains = useMemo(() => 
    getApplicableChainsForAddress(activeAddress || ''),
    [activeAddress]
  );

  // Get chain indices for fetching - only applicable chains for this address type
  const chainIndices = useMemo(() => 
    applicableChains.map(c => c.chainIndex).join(','), 
    [applicableChains]
  );

  // Chain options for the filter dropdown
  const evmChains = useMemo(() => getEvmChains(), []);
  const nonEvmChains = useMemo(() => getNonEvmChains(), []);

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

  // Filter balances based on chain filter selection
  const filteredBalances = useMemo(() => {
    if (chainFilter === 'all') return allBalances;
    if (chainFilter === 'evm-only') {
      return allBalances.filter(b => !isNonEvmChain(b.chainIndex));
    }
    if (chainFilter === 'non-evm-only') {
      return allBalances.filter(b => isNonEvmChain(b.chainIndex));
    }
    return allBalances.filter(b => b.chainIndex === chainFilter);
  }, [allBalances, chainFilter]);

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
        <h2 className="text-lg font-semibold">Overview</h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Chain Filter */}
          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            <Layers className="w-4 h-4 text-muted-foreground shrink-0" />
            <Select value={chainFilter} onValueChange={setChainFilter}>
              <SelectTrigger className="w-full sm:w-[180px] h-9">
                <SelectValue placeholder="All Chains" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="all">All Chains</SelectItem>
                <SelectItem value="evm-only">EVM Only</SelectItem>
                <SelectItem value="non-evm-only">Non-EVM Only</SelectItem>
                
                <SelectGroup>
                  <SelectLabel>EVM Chains</SelectLabel>
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
                
                {nonEvmChains.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Non-EVM Chains</SelectLabel>
                    {nonEvmChains.map((chain) => (
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
                )}
              </SelectContent>
            </Select>
          </div>

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
