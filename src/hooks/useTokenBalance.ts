import { useState, useEffect, useCallback } from 'react';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { OkxToken } from '@/services/okxdex';
import { NATIVE_TOKEN_ADDRESS } from '@/data/chains';

// ERC20 balanceOf function signature
const BALANCE_OF_ABI = '0x70a08231';

interface TokenBalance {
  balance: string;
  formatted: string;
  loading: boolean;
}

export function useTokenBalance(token: OkxToken | null, chainIndex?: string) {
  const { activeAddress: address, isConnected, getEvmProvider, evmChainId: chainId } = useMultiWallet();
  const [balance, setBalance] = useState<TokenBalance>({
    balance: '0',
    formatted: '0',
    loading: false,
  });

  const fetchBalance = useCallback(async () => {
    if (!isConnected || !address || !token) {
      setBalance({ balance: '0', formatted: '0', loading: false });
      return;
    }

    setBalance(prev => ({ ...prev, loading: true }));

    try {
      const provider = await getEvmProvider();
      if (!provider) {
        setBalance({ balance: '0', formatted: '0', loading: false });
        return;
      }

      const isNativeToken = token.tokenContractAddress.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase();
      let rawBalance: string;

      if (isNativeToken) {
        // Get native token balance
        rawBalance = await provider.request({
          method: 'eth_getBalance',
          params: [address, 'latest'],
        });
      } else {
        // Get ERC20 token balance
        const balanceData = BALANCE_OF_ABI + address.toLowerCase().replace('0x', '').padStart(64, '0');
        
        rawBalance = await provider.request({
          method: 'eth_call',
          params: [{
            to: token.tokenContractAddress,
            data: balanceData,
          }, 'latest'],
        });
      }

      // Convert from hex to decimal
      const balanceWei = BigInt(rawBalance || '0x0');
      const decimals = parseInt(token.decimals);
      const divisor = BigInt(10 ** decimals);
      
      // Format balance
      const wholePart = balanceWei / divisor;
      const fractionalPart = balanceWei % divisor;
      const fractionalStr = fractionalPart.toString().padStart(decimals, '0').slice(0, 6);
      
      let formatted = wholePart.toString();
      if (fractionalPart > 0n) {
        formatted += '.' + fractionalStr.replace(/0+$/, '');
      }

      // Handle very small balances
      if (balanceWei > 0n && parseFloat(formatted) === 0) {
        formatted = '< 0.000001';
      }

      setBalance({
        balance: balanceWei.toString(),
        formatted,
        loading: false,
      });
    } catch (err) {
      console.error('Error fetching token balance:', err);
      setBalance({ balance: '0', formatted: '0', loading: false });
    }
  }, [isConnected, address, token, getEvmProvider]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance, chainId]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!isConnected || !token) return;
    
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [fetchBalance, isConnected, token]);

  return {
    ...balance,
    refetch: fetchBalance,
  };
}

// Hook to get multiple token balances
export function useTokenBalances(tokens: OkxToken[]) {
  const { activeAddress: address, isConnected, getEvmProvider, evmChainId: chainId } = useMultiWallet();
  const [balances, setBalances] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);

  const fetchBalances = useCallback(async () => {
    if (!isConnected || !address || tokens.length === 0) {
      setBalances(new Map());
      return;
    }

    setLoading(true);

    try {
      const provider = await getEvmProvider();
      if (!provider) return;

      const newBalances = new Map<string, string>();

      // Fetch balances in parallel (batch of 10 at a time)
      const batchSize = 10;
      for (let i = 0; i < tokens.length; i += batchSize) {
        const batch = tokens.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (token) => {
          try {
            const isNativeToken = token.tokenContractAddress.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase();
            let rawBalance: string;

            if (isNativeToken) {
              rawBalance = await provider.request({
                method: 'eth_getBalance',
                params: [address, 'latest'],
              });
            } else {
              const balanceData = BALANCE_OF_ABI + address.toLowerCase().replace('0x', '').padStart(64, '0');
              rawBalance = await provider.request({
                method: 'eth_call',
                params: [{
                  to: token.tokenContractAddress,
                  data: balanceData,
                }, 'latest'],
              });
            }

            const balanceWei = BigInt(rawBalance || '0x0');
            const decimals = parseInt(token.decimals);
            const divisor = BigInt(10 ** decimals);
            const wholePart = balanceWei / divisor;
            const fractionalPart = balanceWei % divisor;
            const fractionalStr = fractionalPart.toString().padStart(decimals, '0').slice(0, 4);
            
            let formatted = wholePart.toString();
            if (fractionalPart > 0n) {
              formatted += '.' + fractionalStr.replace(/0+$/, '');
            }
            if (balanceWei > 0n && parseFloat(formatted) === 0) {
              formatted = '< 0.0001';
            }

            newBalances.set(token.tokenContractAddress.toLowerCase(), formatted);
          } catch {
            newBalances.set(token.tokenContractAddress.toLowerCase(), '0');
          }
        }));
      }

      setBalances(newBalances);
    } catch (err) {
      console.error('Error fetching token balances:', err);
    } finally {
      setLoading(false);
    }
  }, [isConnected, address, tokens, getEvmProvider]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances, chainId]);

  return { balances, loading, refetch: fetchBalances };
}
