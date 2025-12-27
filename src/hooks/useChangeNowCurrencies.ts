import { useQuery } from '@tanstack/react-query';
import { changeNowService, ApiCurrency } from '@/services/changenow';

export interface FormattedCurrency {
  ticker: string;
  name: string;
  image: string;
  network?: string;
  isStable: boolean;
  isFiat: boolean;
}

export function useChangeNowCurrencies() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['changenow-currencies'],
    queryFn: async (): Promise<FormattedCurrency[]> => {
      const currencies = await changeNowService.getCurrencies();
      
      // Filter out fiat currencies and format
      return currencies
        .filter(c => !c.isFiat)
        .map(c => ({
          ticker: c.ticker,
          name: c.name,
          image: c.image || `https://ui-avatars.com/api/?name=${c.ticker}&background=random`,
          network: extractNetwork(c.ticker, c.name),
          isStable: c.isStable,
          isFiat: c.isFiat,
        }));
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });

  return {
    currencies: data || [],
    isLoading,
    error,
    refetch,
  };
}

// Extract network from ticker or name
function extractNetwork(ticker: string, name: string): string | undefined {
  const tickerLower = ticker.toLowerCase();
  
  if (tickerLower.includes('erc20')) return 'ERC20';
  if (tickerLower.includes('trc20')) return 'TRC20';
  if (tickerLower.includes('bep20')) return 'BEP20';
  if (tickerLower.includes('bep2')) return 'BEP2';
  if (tickerLower.includes('mainnet')) return 'Mainnet';
  if (tickerLower.includes('polygon')) return 'Polygon';
  if (tickerLower.includes('avaxc')) return 'Avalanche';
  if (tickerLower.includes('sol') && name.toLowerCase().includes('solana')) return 'Solana';
  if (tickerLower.includes('arb') || name.toLowerCase().includes('arbitrum')) return 'Arbitrum';
  if (tickerLower.includes('op') && name.toLowerCase().includes('optimism')) return 'Optimism';
  
  return undefined;
}
