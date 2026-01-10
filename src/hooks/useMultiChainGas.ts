import { useState, useEffect, useCallback, useMemo } from 'react';
import { Chain, SUPPORTED_CHAINS } from '@/data/chains';
import { getRpcUrl } from '@/config/rpc';

interface GasTier {
  label: 'Slow' | 'Standard' | 'Fast';
  gwei: number;
  time: string;
  multiplier: number;
}

interface ChainGasData {
  chainIndex: string;
  chainName: string;
  gasPriceGwei: number;
  gasPriceWei: bigint;
  tiers: GasTier[];
  lastUpdated: Date | null;
  trend: 'up' | 'down' | 'stable';
  nativeSymbol: string;
}

interface GasEstimate {
  gasUnits: number;
  costWei: bigint;
  costNative: string;
  costUsd: string;
  tier: GasTier;
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

// Calculate gas tiers based on current price
function calculateTiers(baseGwei: number): GasTier[] {
  return [
    { label: 'Slow', gwei: baseGwei * 0.8, time: '~5 min', multiplier: 0.8 },
    { label: 'Standard', gwei: baseGwei, time: '~2 min', multiplier: 1.0 },
    { label: 'Fast', gwei: baseGwei * 1.3, time: '~30 sec', multiplier: 1.3 },
  ];
}

export function useMultiChainGas(chains?: Chain[]) {
  const [gasData, setGasData] = useState<Map<string, ChainGasData>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [previousPrices, setPreviousPrices] = useState<Map<string, number>>(new Map());

  const targetChains = useMemo(() => {
    return (chains || SUPPORTED_CHAINS).filter(c => c.isEvm);
  }, [chains]);

  const fetchAllGasPrices = useCallback(async () => {
    setIsLoading(true);
    const newData = new Map<string, ChainGasData>();
    
    await Promise.all(
      targetChains.map(async (chain) => {
        try {
          const rpcUrl = getRpcUrl(chain.chainIndex, chain.rpcUrl);
          const gasPriceWei = await fetchGasPrice(rpcUrl);
          if (gasPriceWei !== null) {
            const gasPriceGwei = Number(gasPriceWei) / 1e9;
            const prevPrice = previousPrices.get(chain.chainIndex) || gasPriceGwei;
            
            let trend: 'up' | 'down' | 'stable' = 'stable';
            if (gasPriceGwei > prevPrice * 1.05) trend = 'up';
            else if (gasPriceGwei < prevPrice * 0.95) trend = 'down';
            
            newData.set(chain.chainIndex, {
              chainIndex: chain.chainIndex,
              chainName: chain.name,
              gasPriceGwei,
              gasPriceWei,
              tiers: calculateTiers(gasPriceGwei),
              lastUpdated: new Date(),
              trend,
              nativeSymbol: chain.nativeCurrency.symbol,
            });
            
            setPreviousPrices(prev => new Map(prev).set(chain.chainIndex, gasPriceGwei));
          }
        } catch (err) {
          console.error(`Gas fetch failed for ${chain.name}:`, err);
        }
      })
    );
    
    setGasData(newData);
    setIsLoading(false);
  }, [targetChains, previousPrices]);

  // Initial fetch
  useEffect(() => {
    fetchAllGasPrices();
  }, []);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(fetchAllGasPrices, 15000);
    return () => clearInterval(interval);
  }, [fetchAllGasPrices]);

  // Get gas data for a specific chain
  const getChainGas = useCallback((chainIndex: string): ChainGasData | null => {
    return gasData.get(chainIndex) || null;
  }, [gasData]);

  // Calculate gas cost for a specific chain and gas units
  const calculateGasCost = useCallback((
    chainIndex: string,
    gasUnits: number,
    tierLabel: 'Slow' | 'Standard' | 'Fast' = 'Standard',
    nativeUsdPrice?: number
  ): GasEstimate | null => {
    const chainGas = gasData.get(chainIndex);
    if (!chainGas || gasUnits <= 0) return null;

    const tier = chainGas.tiers.find(t => t.label === tierLabel) || chainGas.tiers[1];
    const gasPriceWei = BigInt(Math.floor(tier.gwei * 1e9));
    const costWei = gasPriceWei * BigInt(gasUnits);
    const costNativeNum = Number(costWei) / 1e18;

    let costNative = costNativeNum.toFixed(6);
    if (costNativeNum < 0.000001) costNative = '< 0.000001';

    const costUsd = nativeUsdPrice 
      ? `$${(costNativeNum * nativeUsdPrice).toFixed(4)}`
      : '';

    return {
      gasUnits,
      costWei,
      costNative: costNative.replace(/\.?0+$/, ''),
      costUsd,
      tier,
    };
  }, [gasData]);

  // Get cheapest chain for a swap
  const getCheapestChain = useCallback((gasUnits: number = 200000): { chain: Chain; cost: number } | null => {
    let cheapest: { chain: Chain; cost: number } | null = null;

    targetChains.forEach(chain => {
      const estimate = calculateGasCost(chain.chainIndex, gasUnits);
      if (estimate) {
        const costNum = Number(estimate.costWei);
        if (!cheapest || costNum < cheapest.cost) {
          cheapest = { chain, cost: costNum };
        }
      }
    });

    return cheapest;
  }, [targetChains, calculateGasCost]);

  return {
    gasData: Array.from(gasData.values()),
    isLoading,
    getChainGas,
    calculateGasCost,
    getCheapestChain,
    refetch: fetchAllGasPrices,
  };
}
