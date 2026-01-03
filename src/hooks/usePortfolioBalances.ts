import { useState, useEffect, useCallback } from 'react';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { SUPPORTED_CHAINS, Chain, NATIVE_TOKEN_ADDRESS } from '@/data/chains';
import { OkxToken, okxDexService } from '@/services/okxdex';
import { cache } from '@/lib/cache';

export interface PortfolioToken extends OkxToken {
  chainIndex: string;
  chainName: string;
  chainIcon: string;
  balance: string;
  balanceFormatted: string;
  usdValue: number;
  price: number;
  priceChange24h: number;
  isCustom?: boolean;
}

interface BalanceCache {
  [address: string]: string;
}

const BALANCE_OF_ABI = '0x70a08231';
const SOLANA_NATIVE_ADDRESS = 'So11111111111111111111111111111111111111112';

// Get custom tokens from localStorage for a chain
function getCustomTokensForChain(chainIndex: string, walletAddress: string): OkxToken[] {
  try {
    const key = `dex-custom-tokens-${chainIndex}-${walletAddress.toLowerCase()}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const data = JSON.parse(stored);
      return data.tokens || [];
    }
  } catch {
    // ignore
  }
  return [];
}

// Format balance from raw to readable
function formatBalance(rawBalance: string, decimals: number): string {
  if (!rawBalance || rawBalance === '0') return '0';
  
  const balanceWei = BigInt(rawBalance);
  const divisor = BigInt(10 ** decimals);
  
  const wholePart = balanceWei / divisor;
  const fractionalPart = balanceWei % divisor;
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0').slice(0, 6);
  
  let formatted = wholePart.toString();
  if (fractionalPart > 0n) {
    formatted += '.' + fractionalStr.replace(/0+$/, '');
  }

  return formatted;
}

export function usePortfolioBalances() {
  const { 
    activeAddress,
    isConnected,
    getEvmProvider,
    activeChainType
  } = useMultiWallet();
  
  const [tokens, setTokens] = useState<PortfolioToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalValue, setTotalValue] = useState(0);

  const fetchPortfolio = useCallback(async () => {
    if (!isConnected || !activeAddress) {
      setTokens([]);
      setTotalValue(0);
      return;
    }

    setLoading(true);
    const portfolioTokens: PortfolioToken[] = [];

    try {
      // Get EVM chains for now (can expand later)
      const evmChains = SUPPORTED_CHAINS.filter(c => c.isEvm);
      
      // Fetch balances for each EVM chain in parallel
      await Promise.all(evmChains.map(async (chain) => {
        try {
          const provider = await getEvmProvider();
          if (!provider) return;

          // Get native token balance
          const nativeBalance = await fetchNativeBalance(provider, activeAddress);
          if (nativeBalance && parseFloat(formatBalance(nativeBalance, 18)) > 0) {
            const price = await getTokenPrice(chain.chainIndex, NATIVE_TOKEN_ADDRESS);
            const balanceFormatted = formatBalance(nativeBalance, 18);
            const usdValue = parseFloat(balanceFormatted) * price;
            
            if (usdValue >= 0.01) { // Only show if worth at least 1 cent
              portfolioTokens.push({
                tokenContractAddress: NATIVE_TOKEN_ADDRESS,
                tokenSymbol: chain.nativeCurrency.symbol,
                tokenName: chain.nativeCurrency.name,
                decimals: '18',
                tokenLogoUrl: chain.icon,
                chainIndex: chain.chainIndex,
                chainName: chain.name,
                chainIcon: chain.icon,
                balance: nativeBalance,
                balanceFormatted,
                usdValue,
                price,
                priceChange24h: 0, // TODO: fetch from API
              });
            }
          }

          // Get custom tokens for this chain
          const customTokens = getCustomTokensForChain(chain.chainIndex, activeAddress);
          
          for (const token of customTokens) {
            try {
              const balance = await fetchErc20Balance(provider, activeAddress, token.tokenContractAddress);
              if (balance && balance !== '0') {
                const decimals = parseInt(token.decimals);
                const balanceFormatted = formatBalance(balance, decimals);
                const price = await getTokenPrice(chain.chainIndex, token.tokenContractAddress);
                const usdValue = parseFloat(balanceFormatted) * price;
                
                if (usdValue >= 0.01) {
                  portfolioTokens.push({
                    ...token,
                    chainIndex: chain.chainIndex,
                    chainName: chain.name,
                    chainIcon: chain.icon,
                    balance,
                    balanceFormatted,
                    usdValue,
                    price,
                    priceChange24h: 0,
                    isCustom: true,
                  });
                }
              }
            } catch {
              // Skip failed token fetches
            }
          }
        } catch (err) {
          console.error(`Failed to fetch balances for ${chain.name}:`, err);
        }
      }));

      // Sort by USD value descending
      portfolioTokens.sort((a, b) => b.usdValue - a.usdValue);
      
      setTokens(portfolioTokens);
      setTotalValue(portfolioTokens.reduce((sum, t) => sum + t.usdValue, 0));
    } catch (err) {
      console.error('Portfolio fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [isConnected, activeAddress, getEvmProvider, activeChainType]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(fetchPortfolio, 60000);
    return () => clearInterval(interval);
  }, [fetchPortfolio, isConnected]);

  return {
    tokens,
    loading,
    totalValue,
    refetch: fetchPortfolio,
  };
}

// Fetch native ETH/token balance
async function fetchNativeBalance(provider: any, address: string): Promise<string> {
  try {
    const balance = await provider.request({
      method: 'eth_getBalance',
      params: [address, 'latest'],
    });
    return BigInt(balance || '0x0').toString();
  } catch {
    return '0';
  }
}

// Fetch ERC20 token balance
async function fetchErc20Balance(provider: any, address: string, tokenAddress: string): Promise<string> {
  try {
    const balanceData = BALANCE_OF_ABI + address.toLowerCase().replace('0x', '').padStart(64, '0');
    const balance = await provider.request({
      method: 'eth_call',
      params: [{
        to: tokenAddress,
        data: balanceData,
      }, 'latest'],
    });
    return BigInt(balance || '0x0').toString();
  } catch {
    return '0';
  }
}

// Get token price with caching
async function getTokenPrice(chainIndex: string, tokenAddress: string): Promise<number> {
  const cacheKey = `price-${chainIndex}-${tokenAddress}`;
  const cached = cache.get<number>(cacheKey);
  if (cached.data !== null && !cached.isExpired) return cached.data;
  
  try {
    const result = await okxDexService.getTokenPrice(chainIndex, tokenAddress);
    const price = result?.price ? parseFloat(result.price) : 0;
    cache.set(cacheKey, price, { staleTime: 60000, maxAge: 120000 });
    return price;
  } catch {
    return 0;
  }
}
