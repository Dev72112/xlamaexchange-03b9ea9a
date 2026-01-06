import { useMemo } from 'react';
import { useDexTransactionHistory } from './useDexTransactionHistory';
import { SUPPORTED_CHAINS } from '@/data/chains';

export interface GasDataPoint {
  date: string;
  gasUsd: number;
  txCount: number;
}

export interface ChainGasBreakdown {
  chainIndex: string;
  chainName: string;
  gasUsd: number;
  txCount: number;
  percentage: number;
}

export interface GasAnalytics {
  totalGasUsd: number;
  avgGasPerTrade: number;
  gasPerChain: ChainGasBreakdown[];
  gasOverTime: GasDataPoint[];
  highestGasDay: GasDataPoint | null;
  lowestGasDay: GasDataPoint | null;
}

export function useGasAnalytics(chainFilter?: string): GasAnalytics {
  const { transactions } = useDexTransactionHistory();

  const analytics = useMemo((): GasAnalytics => {
    // Filter to swaps only
    let swaps = transactions.filter(tx => tx.type === 'swap' && tx.status === 'confirmed');
    
    // Apply chain filter if specified
    if (chainFilter && chainFilter !== 'all') {
      swaps = swaps.filter(tx => tx.chainId === chainFilter);
    }

    // For now, estimate gas costs based on transaction data
    // In future, we can fetch actual gas costs from the OKX API
    const gasEstimates: Map<string, number> = new Map([
      ['1', 5], // Ethereum - avg ~$5
      ['56', 0.15], // BSC - avg ~$0.15
      ['137', 0.02], // Polygon - avg ~$0.02
      ['42161', 0.25], // Arbitrum - avg ~$0.25
      ['10', 0.15], // Optimism - avg ~$0.15
      ['8453', 0.05], // Base - avg ~$0.05
      ['324', 0.15], // zkSync - avg ~$0.15
      ['43114', 0.20], // Avalanche - avg ~$0.20
      ['250', 0.01], // Fantom - avg ~$0.01
      ['59144', 0.10], // Linea - avg ~$0.10
      ['534352', 0.08], // Scroll - avg ~$0.08
      ['5000', 0.05], // Mantle - avg ~$0.05
      ['169', 0.05], // Manta - avg ~$0.05
      ['81457', 0.08], // Blast - avg ~$0.08
      ['196', 0.05], // X Layer - avg ~$0.05
    ]);

    // Calculate gas per chain
    const chainGas = new Map<string, { gasUsd: number; txCount: number }>();
    let totalGasUsd = 0;

    swaps.forEach(tx => {
      const chainIndex = tx.chainId;
      const estimatedGas = gasEstimates.get(chainIndex) || 0.10; // Default estimate
      
      const current = chainGas.get(chainIndex) || { gasUsd: 0, txCount: 0 };
      chainGas.set(chainIndex, {
        gasUsd: current.gasUsd + estimatedGas,
        txCount: current.txCount + 1,
      });
      
      totalGasUsd += estimatedGas;
    });

    // Build chain breakdown with percentages
    const gasPerChain: ChainGasBreakdown[] = Array.from(chainGas.entries())
      .map(([chainIndex, data]) => {
        const chainData = SUPPORTED_CHAINS.find(c => c.chainIndex === chainIndex);
        return {
          chainIndex,
          chainName: chainData?.name || `Chain ${chainIndex}`,
          gasUsd: data.gasUsd,
          txCount: data.txCount,
          percentage: totalGasUsd > 0 ? (data.gasUsd / totalGasUsd) * 100 : 0,
        };
      })
      .sort((a, b) => b.gasUsd - a.gasUsd);

    // Calculate gas over time
    const gasByDay = new Map<string, { gasUsd: number; txCount: number }>();
    swaps.forEach(tx => {
      const date = new Date(tx.timestamp).toISOString().split('T')[0];
      const chainIndex = tx.chainId;
      const estimatedGas = gasEstimates.get(chainIndex) || 0.10;
      
      const current = gasByDay.get(date) || { gasUsd: 0, txCount: 0 };
      gasByDay.set(date, {
        gasUsd: current.gasUsd + estimatedGas,
        txCount: current.txCount + 1,
      });
    });

    const gasOverTime: GasDataPoint[] = Array.from(gasByDay.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-90); // Last 90 days

    // Find highest and lowest gas days
    const highestGasDay = gasOverTime.length > 0
      ? gasOverTime.reduce((max, day) => day.gasUsd > max.gasUsd ? day : max)
      : null;
    
    const lowestGasDay = gasOverTime.length > 0
      ? gasOverTime.reduce((min, day) => day.gasUsd < min.gasUsd ? day : min)
      : null;

    const avgGasPerTrade = swaps.length > 0 ? totalGasUsd / swaps.length : 0;

    return {
      totalGasUsd,
      avgGasPerTrade,
      gasPerChain,
      gasOverTime,
      highestGasDay,
      lowestGasDay,
    };
  }, [transactions, chainFilter]);

  return analytics;
}
