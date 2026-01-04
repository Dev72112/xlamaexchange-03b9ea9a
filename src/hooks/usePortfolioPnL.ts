import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMultiWallet } from '@/contexts/MultiWalletContext';

interface PortfolioSnapshot {
  id: string;
  user_address: string;
  chain_index: string;
  total_value_usd: number;
  snapshot_date: string;
  created_at: string;
}

interface PnLData {
  date: string;
  value: number;
}

interface PnLMetrics {
  absoluteChange: number;
  percentChange: number;
  startValue: number;
  endValue: number;
}

export function usePortfolioPnL() {
  const { activeAddress, isConnected } = useMultiWallet();
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch historical snapshots
  const fetchSnapshots = useCallback(async () => {
    if (!activeAddress) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('portfolio_snapshots')
        .select('*')
        .eq('user_address', activeAddress.toLowerCase())
        .order('snapshot_date', { ascending: true });
      
      if (fetchError) throw fetchError;
      
      setSnapshots(data || []);
    } catch (err) {
      console.error('Failed to fetch portfolio snapshots:', err);
      setError('Failed to load history');
    } finally {
      setIsLoading(false);
    }
  }, [activeAddress]);

  // Save a new snapshot
  const saveSnapshot = useCallback(async (totalValue: number, chainIndex: string = 'all') => {
    if (!activeAddress || totalValue <= 0) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    try {
      // Upsert to avoid duplicates for same day
      const { error: upsertError } = await supabase
        .from('portfolio_snapshots')
        .upsert({
          user_address: activeAddress.toLowerCase(),
          chain_index: chainIndex,
          total_value_usd: totalValue,
          snapshot_date: today,
        }, {
          onConflict: 'user_address,chain_index,snapshot_date',
        });
      
      if (upsertError) throw upsertError;
      
      // Refresh snapshots
      fetchSnapshots();
    } catch (err) {
      console.error('Failed to save portfolio snapshot:', err);
    }
  }, [activeAddress, fetchSnapshots]);

  useEffect(() => {
    if (isConnected && activeAddress) {
      fetchSnapshots();
    } else {
      setSnapshots([]);
    }
  }, [isConnected, activeAddress, fetchSnapshots]);

  // Aggregate snapshots by date (sum across chains)
  const dailyData = useMemo((): PnLData[] => {
    const dateMap = new Map<string, number>();
    
    snapshots.forEach(s => {
      const current = dateMap.get(s.snapshot_date) || 0;
      dateMap.set(s.snapshot_date, current + Number(s.total_value_usd));
    });
    
    return Array.from(dateMap.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [snapshots]);

  // Calculate P&L metrics for different timeframes
  const getPnLMetrics = useCallback((days: number): PnLMetrics | null => {
    if (dailyData.length < 2) return null;
    
    const endValue = dailyData[dailyData.length - 1].value;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    
    // Find the first snapshot on or after cutoff
    const startSnapshot = dailyData.find(d => d.date >= cutoffStr) || dailyData[0];
    const startValue = startSnapshot.value;
    
    const absoluteChange = endValue - startValue;
    const percentChange = startValue > 0 ? ((endValue - startValue) / startValue) * 100 : 0;
    
    return {
      absoluteChange,
      percentChange,
      startValue,
      endValue,
    };
  }, [dailyData]);

  // Filter data by timeframe
  const getFilteredData = useCallback((days: number): PnLData[] => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    
    return dailyData.filter(d => d.date >= cutoffStr);
  }, [dailyData]);

  return {
    snapshots,
    dailyData,
    isLoading,
    error,
    saveSnapshot,
    getPnLMetrics,
    getFilteredData,
    refetch: fetchSnapshots,
  };
}
