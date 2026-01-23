import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { OkxToken } from '@/services/okxdex';
import { NATIVE_TOKEN_ADDRESS, Chain } from '@/data/chains';
import { Connection, PublicKey } from '@solana/web3.js';
import { getSolanaConnection, withSolanaRpcFailover } from '@/lib/solanaRpc';

// ERC20 balanceOf function signature
const BALANCE_OF_ABI = '0x70a08231';

// Native token addresses for non-EVM chains
// CRITICAL: Solana addresses are base58 (like FdKwV...), NOT 0x like EVM!
const SOLANA_NATIVE_ADDRESS = 'So11111111111111111111111111111111111111112';
const WRAPPED_SOL_ADDRESS = 'So11111111111111111111111111111111111111112'; // wSOL is the same
const SUI_NATIVE_ADDRESS = '0x2::sui::SUI';
const TRON_NATIVE_ADDRESS = 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb'; // TRX
const TON_NATIVE_ADDRESS = 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c'; // TON

/**
 * Check if a token address represents native SOL on Solana
 * 
 * CRITICAL LOGIC:
 * - OKX DEX uses the actual Solana wrapped SOL address (So11111111111111111111111111111111111111112)
 * - Solana addresses are base58 format (like FdKwV...), NOT 0x prefixed like EVM
 * - We MUST check the chain context to avoid confusing EVM native with Solana native
 */
export function isSolanaNativeToken(address: string, chainIndex?: string): boolean {
  if (!address) return false;
  
  // If we know we're on Solana chain (chainIndex 501), check Solana addresses
  const isOnSolana = chainIndex === '501';
  
  // Case-sensitive check for Solana addresses (they're base58, case matters!)
  if (address === SOLANA_NATIVE_ADDRESS || address === WRAPPED_SOL_ADDRESS) {
    return true;
  }
  
  // Check for lowercase variant (some APIs normalize to lowercase)
  const lower = address.toLowerCase();
  if (lower === 'so11111111111111111111111111111111111111112') {
    return true;
  }
  
  // Check symbol-based identification (from OKX token data)
  // Only treat 'SOL' as native if we're explicitly on Solana chain
  if (isOnSolana) {
    const upper = address.toUpperCase();
    if (upper === 'SOL' || upper === 'WSOL') {
      return true;
    }
  }
  
  // IMPORTANT: EVM native address (0xeee...) should NOT match for Solana
  // This is the key fix - EVM uses 0xeee... for native, Solana uses So111...
  // We explicitly do NOT check NATIVE_TOKEN_ADDRESS here for Solana
  
  return false;
}

interface TokenBalance {
  balance: string;
  formatted: string;
  loading: boolean;
}

export function useTokenBalance(
  token: OkxToken | null, 
  chainOrIndex?: Chain | string | null,
  explicitAddress?: string // Allow passing explicit address for cross-chain scenarios
) {
  const { 
    activeAddress: contextAddress, 
    isConnected, 
    getEvmProvider, 
    getSolanaConnection,
    getSuiClient,
    getTronWeb,
    evmChainId: chainId,
    activeChainType,
    solanaAddress,
    suiAddress,
    tronAddress,
    tonAddress,
    evmAddress,
  } = useMultiWallet();
  
  // Resolve chain index and chain type
  const chainIndex = typeof chainOrIndex === 'string' ? chainOrIndex : chainOrIndex?.chainIndex;
  const chain = typeof chainOrIndex === 'string' ? undefined : chainOrIndex;
  
  // Determine which chain type we're fetching for
  const targetChainType = useMemo(() => {
    if (chainIndex === '501') return 'solana';
    if (chainIndex === '784') return 'sui';
    if (chainIndex === '195') return 'tron';
    if (chainIndex === '607') return 'ton';
    if (chain && !chain.isEvm) {
      const name = chain.name.toLowerCase();
      if (name.includes('solana')) return 'solana';
      if (name.includes('sui')) return 'sui';
      if (name.includes('tron')) return 'tron';
      if (name.includes('ton')) return 'ton';
    }
    return 'evm';
  }, [chainIndex, chain]);
  
  // Get the correct address for the target chain
  const address = useMemo(() => {
    if (explicitAddress) return explicitAddress;
    
    switch (targetChainType) {
      case 'solana': return solanaAddress;
      case 'sui': return suiAddress;
      case 'tron': return tronAddress;
      case 'ton': return tonAddress;
      default: return evmAddress || contextAddress;
    }
  }, [explicitAddress, targetChainType, solanaAddress, suiAddress, tronAddress, tonAddress, evmAddress, contextAddress]);
  
  const [balance, setBalance] = useState<TokenBalance>({
    balance: '0',
    formatted: '0',
    loading: false,
  });

  // Track previous address/chain to detect real changes
  const prevDepsRef = useRef<{ address: string | null; token: string | null; chainType: string | null }>({
    address: null,
    token: null,
    chainType: null,
  });

  const fetchBalance = useCallback(async () => {
    // Must have address for the specific chain to fetch balance
    if (!address || !token) {
      setBalance({ balance: '0', formatted: '0', loading: false });
      return;
    }

    setBalance(prev => ({ ...prev, loading: true }));

    try {
      let rawBalance: string = '0';
      let decimals = parseInt(token.decimals);

      // Use targetChainType instead of activeChainType for balance fetching
      if (targetChainType === 'evm') {
        rawBalance = await fetchEvmBalance(token, address, getEvmProvider);
      } else if (targetChainType === 'solana') {
        rawBalance = await fetchSolanaBalance(token, address, getSolanaConnection);
      } else if (targetChainType === 'sui') {
        rawBalance = await fetchSuiBalance(token, address, getSuiClient);
      } else if (targetChainType === 'tron') {
        rawBalance = await fetchTronBalance(token, address, getTronWeb);
      } else if (targetChainType === 'ton') {
        // TON - currently no direct balance fetch, would need TonClient
        rawBalance = '0';
      }

      // Format balance
      const formatted = formatBalance(rawBalance, decimals);

      setBalance({
        balance: rawBalance,
        formatted,
        loading: false,
      });
    } catch (err) {
      console.error('Error fetching token balance:', err);
      setBalance({ balance: '0', formatted: '0', loading: false });
    }
  }, [address, token, chain, chainIndex, targetChainType, getEvmProvider, getSolanaConnection, getSuiClient, getTronWeb]);

  // Real-time Solana balance subscription (WebSocket)
  const subscriptionRef = useRef<number | null>(null);
  
  // Detect when we need to refetch due to address/chain/token changes
  useEffect(() => {
    const tokenAddress = token?.tokenContractAddress || null;
    const currentDeps = { address, token: tokenAddress, chainType: targetChainType };
    const prev = prevDepsRef.current;
    
    // Check if any critical dependency changed
    const hasChanged = 
      prev.address !== currentDeps.address ||
      prev.token !== currentDeps.token ||
      prev.chainType !== currentDeps.chainType;
    
    if (hasChanged) {
      console.log('[useTokenBalance] Dependencies changed, refetching:', {
        address: address?.slice(0, 8),
        token: token?.tokenSymbol,
        chainType: targetChainType,
        prevAddress: prev.address?.slice(0, 8),
      });
      prevDepsRef.current = currentDeps;
      fetchBalance();
    }
  }, [address, token, targetChainType, fetchBalance]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchBalance();
    
    // Set up WebSocket subscription for Solana tokens
    const isSolana = targetChainType === 'solana';
    
    if (isSolana && token && address) {
      try {
        const connection = getSolanaConnection();
        if (connection) {
          const pubkey = new PublicKey(address);
          
          // Subscribe to account changes for instant balance updates
          subscriptionRef.current = connection.onAccountChange(
            pubkey,
            () => {
              console.log('[Solana] Account changed, refetching balance');
              fetchBalance();
            },
            'confirmed'
          );
          
          console.log('[Solana] WebSocket subscription active for:', address.slice(0, 8));
        }
      } catch (err) {
        console.warn('[Solana] WebSocket subscription failed, using polling:', err);
      }
    }
    
    return () => {
      // Cleanup WebSocket subscription
      if (subscriptionRef.current !== null) {
        try {
          const connection = getSolanaConnection();
          if (connection) {
            connection.removeAccountChangeListener(subscriptionRef.current);
            console.log('[Solana] WebSocket subscription removed');
          }
        } catch (err) {
          // Ignore cleanup errors
        }
        subscriptionRef.current = null;
      }
    };
  }, [fetchBalance, chainId, token, address, targetChainType]);

  // Auto-refresh every 30 seconds (fallback for non-Solana or if WebSocket fails)
  useEffect(() => {
    if (!address || !token) return;
    
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [fetchBalance, address, token]);

  return {
    ...balance,
    refetch: fetchBalance,
  };
}

// Helper: Format balance from raw to readable
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

  // Handle very small balances
  if (balanceWei > 0n && parseFloat(formatted) === 0) {
    formatted = '< 0.000001';
  }

  return formatted;
}

// EVM balance fetching
async function fetchEvmBalance(token: OkxToken, address: string, getEvmProvider: () => Promise<any>): Promise<string> {
  const provider = await getEvmProvider();
  if (!provider) return '0';

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

  return BigInt(rawBalance || '0x0').toString();
}

// Solana balance fetching with RPC failover
async function fetchSolanaBalance(token: OkxToken, address: string, _getSolanaConnection: () => any): Promise<string> {
  // Use the RPC failover manager for resilience
  try {
    return await withSolanaRpcFailover(async (connection) => {
      return fetchSolanaBalanceWithConnection(token, address, connection);
    });
  } catch (err) {
    console.error('[Solana] All RPC endpoints failed for balance fetch:', err);
    return '0';
  }
}

async function fetchSolanaBalanceWithConnection(token: OkxToken, address: string, connection: Connection): Promise<string> {
  try {
    const pubkey = new PublicKey(address);
    
    // Check if this is native SOL - pass chainIndex '501' to indicate we're on Solana
    const isNative = isSolanaNativeToken(token.tokenContractAddress, '501') ||
                     token.tokenSymbol?.toUpperCase() === 'SOL' ||
                     token.tokenSymbol?.toUpperCase() === 'WSOL';

    console.log('[Solana] Balance check for:', {
      tokenAddress: token.tokenContractAddress?.slice(0, 12),
      symbol: token.tokenSymbol,
      isNative,
      walletAddress: address?.slice(0, 12),
    });

    if (isNative) {
      console.log('[Solana] Fetching native SOL balance for:', address);
      const balance = await connection.getBalance(pubkey);
      console.log('[Solana] Native SOL balance (lamports):', balance);
      return balance.toString();
    }

    // SPL Token balance
    const { TOKEN_PROGRAM_ID } = await import('@solana/spl-token');
    const tokenMint = new PublicKey(token.tokenContractAddress);
    
    const tokenAccounts = await connection.getTokenAccountsByOwner(pubkey, {
      mint: tokenMint,
    });

    if (tokenAccounts.value.length === 0) return '0';

    // Sum up all token account balances
    let totalBalance = BigInt(0);
    for (const account of tokenAccounts.value) {
      const data = account.account.data;
      // Token account data layout: first 64 bytes are mint + owner, next 8 bytes are balance
      const balanceBytes = data.slice(64, 72);
      const balance = new DataView(balanceBytes.buffer, balanceBytes.byteOffset).getBigUint64(0, true);
      totalBalance += balance;
    }

    return totalBalance.toString();
  } catch (err) {
    console.error('Solana balance fetch error:', err);
    return '0';
  }
}

// Sui balance fetching
async function fetchSuiBalance(token: OkxToken, address: string, getSuiClient: () => any): Promise<string> {
  const client = getSuiClient();
  if (!client) return '0';

  try {
    const isNative = token.tokenContractAddress === SUI_NATIVE_ADDRESS ||
                     token.tokenContractAddress.includes('::sui::SUI');
    
    const coinType = isNative ? '0x2::sui::SUI' : token.tokenContractAddress;
    
    const coins = await client.getCoins({ 
      owner: address, 
      coinType 
    });

    if (!coins.data || coins.data.length === 0) return '0';

    const total = coins.data.reduce((sum: bigint, c: any) => sum + BigInt(c.balance), BigInt(0));
    return total.toString();
  } catch (err) {
    console.error('Sui balance fetch error:', err);
    return '0';
  }
}

// Tron balance fetching
async function fetchTronBalance(token: OkxToken, address: string, getTronWeb: () => any): Promise<string> {
  const tronWeb = getTronWeb();
  if (!tronWeb) return '0';

  try {
    const isNative = token.tokenContractAddress.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase() ||
                     token.tokenContractAddress === TRON_NATIVE_ADDRESS ||
                     token.tokenSymbol?.toUpperCase() === 'TRX';

    if (isNative) {
      const balance = await tronWeb.trx.getBalance(address);
      return balance.toString();
    }

    // TRC20 token balance
    const contract = await tronWeb.contract().at(token.tokenContractAddress);
    const balance = await contract.balanceOf(address).call();
    return balance.toString();
  } catch (err) {
    console.error('Tron balance fetch error:', err);
    return '0';
  }
}

// Hook to get multiple token balances
export function useTokenBalances(tokens: OkxToken[], chainOrIndex?: Chain | string | null) {
  const { 
    activeAddress: address, 
    isConnected, 
    getEvmProvider, 
    getSolanaConnection,
    getSuiClient,
    getTronWeb,
    evmChainId: chainId,
    activeChainType
  } = useMultiWallet();
  
  // Resolve chain from chainIndex string if needed
  const chain = typeof chainOrIndex === 'string' 
    ? undefined 
    : chainOrIndex;
  
  const [balances, setBalances] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);

  const fetchBalances = useCallback(async () => {
    if (!isConnected || !address || tokens.length === 0) {
      setBalances(new Map());
      return;
    }

    setLoading(true);

    try {
      const isEvm = chain?.isEvm ?? activeChainType === 'evm';
      const newBalances = new Map<string, string>();

      // Fetch balances in parallel (batch of 10 at a time)
      const batchSize = 10;
      for (let i = 0; i < tokens.length; i += batchSize) {
        const batch = tokens.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (token) => {
          try {
            let rawBalance = '0';
            
            if (isEvm) {
              rawBalance = await fetchEvmBalance(token, address, getEvmProvider);
            } else if (activeChainType === 'solana') {
              rawBalance = await fetchSolanaBalance(token, address, getSolanaConnection);
            } else if (activeChainType === 'sui') {
              rawBalance = await fetchSuiBalance(token, address, getSuiClient);
            } else if (activeChainType === 'tron') {
              rawBalance = await fetchTronBalance(token, address, getTronWeb);
            }

            const formatted = formatBalance(rawBalance, parseInt(token.decimals));
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
  }, [isConnected, address, tokens, chain, activeChainType, getEvmProvider, getSolanaConnection, getSuiClient, getTronWeb]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances, chainId]);

  return { balances, loading, refetch: fetchBalances };
}
