import { useState, useEffect, useCallback } from 'react';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { OkxToken } from '@/services/okxdex';
import { NATIVE_TOKEN_ADDRESS, Chain } from '@/data/chains';
import { Connection, PublicKey } from '@solana/web3.js';

// ERC20 balanceOf function signature
const BALANCE_OF_ABI = '0x70a08231';

// Native token addresses for non-EVM chains
// CRITICAL: Solana addresses are base58 (like FdKwV...), NOT 0x like EVM!
const SOLANA_NATIVE_ADDRESS = 'So11111111111111111111111111111111111111112';
const WRAPPED_SOL_ADDRESS = 'So11111111111111111111111111111111111111112'; // wSOL is the same
const SUI_NATIVE_ADDRESS = '0x2::sui::SUI';
const TRON_NATIVE_ADDRESS = 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb'; // TRX
const TON_NATIVE_ADDRESS = 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c'; // TON

// Helper to check if an address represents native SOL
// Note: OKX DEX uses the actual Solana address format (base58), NOT 0x...
function isSolanaNativeToken(address: string): boolean {
  if (!address) return false;
  
  // Case-sensitive check for Solana addresses (they're base58, case matters!)
  if (address === SOLANA_NATIVE_ADDRESS || address === WRAPPED_SOL_ADDRESS) {
    return true;
  }
  
  // Check symbol-based identification (from OKX token data)
  // Some APIs might return 'SOL' token with special addresses
  const upper = address.toUpperCase();
  if (upper === 'SOL' || upper === 'WSOL') {
    return true;
  }
  
  // Also check for the EVM-style native address that some bridges use
  // BUT only for actual 0x-prefixed addresses (not Solana base58)
  const lower = address.toLowerCase();
  if (lower === NATIVE_TOKEN_ADDRESS.toLowerCase() && address.startsWith('0x')) {
    return true;
  }
  
  return false;
}

interface TokenBalance {
  balance: string;
  formatted: string;
  loading: boolean;
}

export function useTokenBalance(token: OkxToken | null, chainOrIndex?: Chain | string | null) {
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
    ? undefined // We'll use activeChainType for string index
    : chainOrIndex;
  
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
      // Determine chain type
      const isEvm = chain?.isEvm ?? activeChainType === 'evm';
      const chainName = chain?.name?.toLowerCase() || '';
      
      let rawBalance: string = '0';
      let decimals = parseInt(token.decimals);

      if (isEvm) {
        // EVM balance fetch
        rawBalance = await fetchEvmBalance(token, address, getEvmProvider);
      } else if (chainName.includes('solana') || activeChainType === 'solana') {
        // Solana balance fetch
        rawBalance = await fetchSolanaBalance(token, address, getSolanaConnection);
      } else if (chainName.includes('sui') || activeChainType === 'sui') {
        // Sui balance fetch
        rawBalance = await fetchSuiBalance(token, address, getSuiClient);
      } else if (chainName.includes('tron') || activeChainType === 'tron') {
        // Tron balance fetch
        rawBalance = await fetchTronBalance(token, address, getTronWeb);
      } else if (chainName.includes('ton') || activeChainType === 'ton') {
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
  }, [isConnected, address, token, chain, chainOrIndex, activeChainType, getEvmProvider, getSolanaConnection, getSuiClient, getTronWeb]);

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

// Solana balance fetching
async function fetchSolanaBalance(token: OkxToken, address: string, getSolanaConnection: () => any): Promise<string> {
  const connection = getSolanaConnection();
  if (!connection) {
    // Fallback to public RPC
    const fallbackConnection = new Connection('https://api.mainnet-beta.solana.com');
    return fetchSolanaBalanceWithConnection(token, address, fallbackConnection);
  }
  return fetchSolanaBalanceWithConnection(token, address, connection);
}

async function fetchSolanaBalanceWithConnection(token: OkxToken, address: string, connection: Connection): Promise<string> {
  try {
    const pubkey = new PublicKey(address);
    const isNative = isSolanaNativeToken(token.tokenContractAddress);

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
