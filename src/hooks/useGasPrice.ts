import { useState, useEffect, useCallback } from 'react';
import { Chain } from '@/data/chains';
import { getRpcUrl } from '@/config/rpc';

interface GasPriceData {
  gasPriceGwei: number;
  gasPriceWei: bigint;
  lastUpdated: Date | null;
}

// Fetch gas price from RPC endpoint
async function fetchGasPrice(rpcUrl: string): Promise<bigint | null> {
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_gasPrice',
        params: [],
        id: 1,
      }),
    });
    
    const data = await response.json();
    if (data.result) {
      return BigInt(data.result);
    }
    return null;
  } catch (err) {
    console.error('Failed to fetch gas price:', err);
    return null;
  }
}

export function useGasPrice(chain: Chain | null) {
  const [gasData, setGasData] = useState<GasPriceData>({
    gasPriceGwei: 0,
    gasPriceWei: BigInt(0),
    lastUpdated: null,
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchGasPriceData = useCallback(async () => {
    if (!chain || !chain.isEvm) return;
    
    setIsLoading(true);
    try {
      const rpcUrl = getRpcUrl(chain.chainIndex, chain.rpcUrl);
      const gasPriceWei = await fetchGasPrice(rpcUrl);
      if (gasPriceWei !== null) {
        const gasPriceGwei = Number(gasPriceWei) / 1e9;
        setGasData({
          gasPriceGwei,
          gasPriceWei,
          lastUpdated: new Date(),
        });
      }
    } catch (err) {
      console.error('Gas price fetch failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [chain?.rpcUrl, chain?.isEvm]);

  // Initial fetch
  useEffect(() => {
    fetchGasPriceData();
  }, [fetchGasPriceData]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(fetchGasPriceData, 15000);
    return () => clearInterval(interval);
  }, [fetchGasPriceData]);

  // Calculate estimated gas cost from gas units
  const calculateGasCost = useCallback((gasUnits: string | number): { 
    costInNative: string; 
    costWei: bigint;
  } => {
    const units = typeof gasUnits === 'string' ? parseInt(gasUnits) : gasUnits;
    if (isNaN(units) || units <= 0 || gasData.gasPriceWei === BigInt(0)) {
      return { costInNative: '0', costWei: BigInt(0) };
    }
    
    const costWei = gasData.gasPriceWei * BigInt(units);
    const costInNative = Number(costWei) / 1e18;
    
    // Format with appropriate precision
    if (costInNative < 0.000001) {
      return { costInNative: '< 0.000001', costWei };
    }
    
    return { 
      costInNative: costInNative.toFixed(6).replace(/\.?0+$/, ''),
      costWei,
    };
  }, [gasData.gasPriceWei]);

  return {
    gasPriceGwei: gasData.gasPriceGwei,
    gasPriceWei: gasData.gasPriceWei,
    lastUpdated: gasData.lastUpdated,
    isLoading,
    refetch: fetchGasPriceData,
    calculateGasCost,
  };
}
