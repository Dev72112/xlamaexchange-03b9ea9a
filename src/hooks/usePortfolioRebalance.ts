import { useState, useCallback, useMemo } from 'react';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { useExchangeMode } from '@/contexts/ExchangeModeContext';
import { okxDexService, WalletTokenBalance } from '@/services/okxdex';
import { SUPPORTED_CHAINS } from '@/data/chains';
import { toast } from 'sonner';

export interface TokenAllocation {
  chainIndex: string;
  tokenAddress: string;
  symbol: string;
  currentValue: number;
  currentPercentage: number;
  targetPercentage: number;
  difference: number;
  action: 'buy' | 'sell' | 'hold';
  amountToTrade: number;
}

export interface RebalanceResult {
  allocations: TokenAllocation[];
  totalValue: number;
  trades: RebalanceTrade[];
}

export interface RebalanceTrade {
  fromToken: { address: string; symbol: string; chainIndex: string };
  toToken: { address: string; symbol: string; chainIndex: string };
  amount: number;
  amountUsd: number;
}

export function usePortfolioRebalance() {
  const { 
    activeAddress, 
    isConnected, 
    isOkxConnected,
    evmAddress,
    solanaAddress,
    tronAddress,
    suiAddress,
    tonAddress,
    activeChainType
  } = useMultiWallet();
  const { globalChainFilter } = useExchangeMode();
  
  const [isLoading, setIsLoading] = useState(false);
  const [balances, setBalances] = useState<WalletTokenBalance[]>([]);
  const [targetAllocations, setTargetAllocations] = useState<Record<string, number>>({});
  const [rebalanceResult, setRebalanceResult] = useState<RebalanceResult | null>(null);

  // Dynamic chain selection based on globalChainFilter and connected wallets
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
  }, [globalChainFilter, isOkxConnected, evmAddress, solanaAddress, tronAddress, suiAddress, tonAddress, activeChainType]);

  const fetchCurrentPortfolio = useCallback(async () => {
    if (!activeAddress) return [];
    
    setIsLoading(true);
    try {
      const result = await okxDexService.getWalletBalances(activeAddress, chainIndices);
      
      // Filter out dust and sort by value
      const filtered = result.filter(b => {
        const value = parseFloat(b.tokenPrice || '0') * parseFloat(b.balance || '0');
        return value >= 1; // At least $1
      }).sort((a, b) => {
        const valueA = parseFloat(a.tokenPrice || '0') * parseFloat(a.balance || '0');
        const valueB = parseFloat(b.tokenPrice || '0') * parseFloat(b.balance || '0');
        return valueB - valueA;
      });
      
      setBalances(filtered);
      return filtered;
    } catch (err) {
      console.error('Failed to fetch portfolio:', err);
      toast.error('Failed to fetch portfolio');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [activeAddress, chainIndices]);

  const calculateTotalValue = useCallback((tokens: WalletTokenBalance[]): number => {
    return tokens.reduce((sum, b) => {
      return sum + parseFloat(b.tokenPrice || '0') * parseFloat(b.balance || '0');
    }, 0);
  }, []);

  const setTargetAllocation = useCallback((tokenKey: string, percentage: number) => {
    setTargetAllocations(prev => ({
      ...prev,
      [tokenKey]: Math.max(0, Math.min(100, percentage)),
    }));
  }, []);

  const calculateRebalance = useCallback((): RebalanceResult | null => {
    if (balances.length === 0) return null;

    const totalValue = calculateTotalValue(balances);
    if (totalValue === 0) return null;

    // Calculate current allocations and differences
    const allocations: TokenAllocation[] = balances.map(b => {
      const tokenKey = `${b.chainIndex}-${b.tokenContractAddress}`;
      const currentValue = parseFloat(b.tokenPrice || '0') * parseFloat(b.balance || '0');
      const currentPercentage = (currentValue / totalValue) * 100;
      const targetPercentage = targetAllocations[tokenKey] ?? currentPercentage;
      const difference = targetPercentage - currentPercentage;
      const amountToTrade = Math.abs(difference / 100 * totalValue);

      return {
        chainIndex: b.chainIndex,
        tokenAddress: b.tokenContractAddress,
        symbol: b.symbol,
        currentValue,
        currentPercentage,
        targetPercentage,
        difference,
        action: difference > 0.5 ? 'buy' : difference < -0.5 ? 'sell' : 'hold',
        amountToTrade,
      };
    });

    // Generate trades needed
    const sellOrders = allocations
      .filter(a => a.action === 'sell')
      .sort((a, b) => b.amountToTrade - a.amountToTrade);
    
    const buyOrders = allocations
      .filter(a => a.action === 'buy')
      .sort((a, b) => b.amountToTrade - a.amountToTrade);

    const trades: RebalanceTrade[] = [];
    
    // Match sells with buys
    let sellIndex = 0;
    let buyIndex = 0;
    let remainingSell = sellOrders[sellIndex]?.amountToTrade || 0;
    let remainingBuy = buyOrders[buyIndex]?.amountToTrade || 0;

    while (sellIndex < sellOrders.length && buyIndex < buyOrders.length) {
      const tradeAmount = Math.min(remainingSell, remainingBuy);
      
      if (tradeAmount > 0) {
        trades.push({
          fromToken: {
            address: sellOrders[sellIndex].tokenAddress,
            symbol: sellOrders[sellIndex].symbol,
            chainIndex: sellOrders[sellIndex].chainIndex,
          },
          toToken: {
            address: buyOrders[buyIndex].tokenAddress,
            symbol: buyOrders[buyIndex].symbol,
            chainIndex: buyOrders[buyIndex].chainIndex,
          },
          amount: tradeAmount,
          amountUsd: tradeAmount,
        });
      }

      remainingSell -= tradeAmount;
      remainingBuy -= tradeAmount;

      if (remainingSell <= 0.01) {
        sellIndex++;
        remainingSell = sellOrders[sellIndex]?.amountToTrade || 0;
      }
      if (remainingBuy <= 0.01) {
        buyIndex++;
        remainingBuy = buyOrders[buyIndex]?.amountToTrade || 0;
      }
    }

    const result: RebalanceResult = {
      allocations,
      totalValue,
      trades,
    };

    setRebalanceResult(result);
    return result;
  }, [balances, targetAllocations, calculateTotalValue]);

  const applyEqualWeight = useCallback(() => {
    if (balances.length === 0) return;
    
    const equalPercentage = 100 / balances.length;
    const newAllocations: Record<string, number> = {};
    
    balances.forEach(b => {
      const tokenKey = `${b.chainIndex}-${b.tokenContractAddress}`;
      newAllocations[tokenKey] = equalPercentage;
    });
    
    setTargetAllocations(newAllocations);
  }, [balances]);

  const applyMarketCapWeight = useCallback(async () => {
    if (balances.length === 0) return;
    
    // Use current values as proxy for market cap weighting
    const totalValue = calculateTotalValue(balances);
    const newAllocations: Record<string, number> = {};
    
    balances.forEach(b => {
      const tokenKey = `${b.chainIndex}-${b.tokenContractAddress}`;
      const value = parseFloat(b.tokenPrice || '0') * parseFloat(b.balance || '0');
      newAllocations[tokenKey] = (value / totalValue) * 100;
    });
    
    setTargetAllocations(newAllocations);
  }, [balances, calculateTotalValue]);

  const resetTargets = useCallback(() => {
    setTargetAllocations({});
    setRebalanceResult(null);
  }, []);

  return {
    isConnected,
    isLoading,
    balances,
    targetAllocations,
    rebalanceResult,
    fetchCurrentPortfolio,
    setTargetAllocation,
    calculateRebalance,
    applyEqualWeight,
    applyMarketCapWeight,
    resetTargets,
  };
}
