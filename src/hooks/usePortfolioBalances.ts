import { useState, useEffect, useCallback } from 'react';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { SUPPORTED_CHAINS, Chain, NATIVE_TOKEN_ADDRESS } from '@/data/chains';
import { OkxToken, okxDexService } from '@/services/okxdex';
import { cache } from '@/lib/cache';
import { Connection, PublicKey } from '@solana/web3.js';

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

const BALANCE_OF_ABI = '0x70a08231';
const SOLANA_NATIVE_ADDRESS = 'So11111111111111111111111111111111111111112';
const SUI_NATIVE_ADDRESS = '0x2::sui::SUI';
const TRON_NATIVE_ADDRESS = 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb';
const TON_NATIVE_ADDRESS = 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c';

// Chain index mapping
const CHAIN_INDICES = {
  solana: '501',
  sui: '784',
  tron: '195',
  ton: '607',
};

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
  
  try {
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
  } catch {
    return '0';
  }
}

export function usePortfolioBalances() {
  const { 
    activeAddress,
    isConnected,
    getEvmProvider,
    getSolanaConnection,
    getSuiClient,
    getTronWeb,
    activeChainType,
    evmAddress,
    solanaAddress,
    suiAddress,
    tronAddress,
    tonAddress,
  } = useMultiWallet();
  
  const [tokens, setTokens] = useState<PortfolioToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalValue, setTotalValue] = useState(0);

  const fetchPortfolio = useCallback(async () => {
    if (!isConnected) {
      setTokens([]);
      setTotalValue(0);
      return;
    }

    setLoading(true);
    const portfolioTokens: PortfolioToken[] = [];

    try {
      const fetchPromises: Promise<void>[] = [];

      // Fetch EVM balances if connected
      if (evmAddress) {
        const evmChains = SUPPORTED_CHAINS.filter(c => c.isEvm);
        fetchPromises.push(
          fetchEvmChainBalances(evmChains, evmAddress, getEvmProvider, portfolioTokens)
        );
      }

      // Fetch Solana balances if connected
      if (solanaAddress) {
        const solanaChain = SUPPORTED_CHAINS.find(c => c.chainIndex === CHAIN_INDICES.solana);
        if (solanaChain) {
          fetchPromises.push(
            fetchSolanaBalances(solanaChain, solanaAddress, getSolanaConnection, portfolioTokens)
          );
        }
      }

      // Fetch Sui balances if connected
      if (suiAddress) {
        const suiChain = SUPPORTED_CHAINS.find(c => c.chainIndex === CHAIN_INDICES.sui);
        if (suiChain) {
          fetchPromises.push(
            fetchSuiBalances(suiChain, suiAddress, getSuiClient, portfolioTokens)
          );
        }
      }

      // Fetch Tron balances if connected
      if (tronAddress) {
        const tronChain = SUPPORTED_CHAINS.find(c => c.chainIndex === CHAIN_INDICES.tron);
        if (tronChain) {
          fetchPromises.push(
            fetchTronBalances(tronChain, tronAddress, getTronWeb, portfolioTokens)
          );
        }
      }

      // Fetch TON balances if connected (native only for now)
      if (tonAddress) {
        const tonChain = SUPPORTED_CHAINS.find(c => c.chainIndex === CHAIN_INDICES.ton);
        if (tonChain) {
          fetchPromises.push(
            fetchTonBalances(tonChain, tonAddress, portfolioTokens)
          );
        }
      }

      await Promise.all(fetchPromises);

      // Sort by USD value descending
      portfolioTokens.sort((a, b) => b.usdValue - a.usdValue);
      
      setTokens(portfolioTokens);
      setTotalValue(portfolioTokens.reduce((sum, t) => sum + t.usdValue, 0));
    } catch (err) {
      console.error('Portfolio fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [isConnected, evmAddress, solanaAddress, suiAddress, tronAddress, tonAddress, getEvmProvider, getSolanaConnection, getSuiClient, getTronWeb]);

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

// EVM chain balance fetching
async function fetchEvmChainBalances(
  chains: Chain[],
  address: string,
  getEvmProvider: () => Promise<any>,
  portfolioTokens: PortfolioToken[]
): Promise<void> {
  const provider = await getEvmProvider();
  if (!provider) return;

  await Promise.all(chains.map(async (chain) => {
    try {
      // Get native token balance
      const nativeBalance = await fetchEvmNativeBalance(provider, address);
      if (nativeBalance && nativeBalance !== '0') {
        const decimals = chain.nativeCurrency.decimals;
        const balanceFormatted = formatBalance(nativeBalance, decimals);
        if (parseFloat(balanceFormatted) > 0) {
          const price = await getTokenPrice(chain.chainIndex, NATIVE_TOKEN_ADDRESS);
          const usdValue = parseFloat(balanceFormatted) * price;
          
          if (usdValue >= 0.01) {
            portfolioTokens.push({
              tokenContractAddress: NATIVE_TOKEN_ADDRESS,
              tokenSymbol: chain.nativeCurrency.symbol,
              tokenName: chain.nativeCurrency.name,
              decimals: decimals.toString(),
              tokenLogoUrl: chain.icon,
              chainIndex: chain.chainIndex,
              chainName: chain.name,
              chainIcon: chain.icon,
              balance: nativeBalance,
              balanceFormatted,
              usdValue,
              price,
              priceChange24h: 0,
            });
          }
        }
      }

      // Get custom tokens for this chain
      const customTokens = getCustomTokensForChain(chain.chainIndex, address);
      await fetchCustomTokenBalances(chain, address, customTokens, provider, portfolioTokens, 'evm');
    } catch (err) {
      console.error(`Failed to fetch EVM balances for ${chain.name}:`, err);
    }
  }));
}

// Solana balance fetching
async function fetchSolanaBalances(
  chain: Chain,
  address: string,
  getSolanaConnection: () => any,
  portfolioTokens: PortfolioToken[]
): Promise<void> {
  try {
    let connection = getSolanaConnection();
    if (!connection) {
      connection = new Connection('https://api.mainnet-beta.solana.com');
    }

    const pubkey = new PublicKey(address);
    
    // Get native SOL balance
    const lamports = await connection.getBalance(pubkey);
    if (lamports > 0) {
      const nativeBalance = lamports.toString();
      const balanceFormatted = formatBalance(nativeBalance, 9);
      const price = await getTokenPrice(chain.chainIndex, SOLANA_NATIVE_ADDRESS);
      const usdValue = parseFloat(balanceFormatted) * price;
      
      if (usdValue >= 0.01) {
        portfolioTokens.push({
          tokenContractAddress: SOLANA_NATIVE_ADDRESS,
          tokenSymbol: 'SOL',
          tokenName: 'Solana',
          decimals: '9',
          tokenLogoUrl: chain.icon,
          chainIndex: chain.chainIndex,
          chainName: chain.name,
          chainIcon: chain.icon,
          balance: nativeBalance,
          balanceFormatted,
          usdValue,
          price,
          priceChange24h: 0,
        });
      }
    }

    // Get custom SPL tokens
    const customTokens = getCustomTokensForChain(chain.chainIndex, address);
    for (const token of customTokens) {
      try {
        const { TOKEN_PROGRAM_ID } = await import('@solana/spl-token');
        const tokenMint = new PublicKey(token.tokenContractAddress);
        const tokenAccounts = await connection.getTokenAccountsByOwner(pubkey, { mint: tokenMint });
        
        if (tokenAccounts.value.length > 0) {
          let totalBalance = BigInt(0);
          for (const account of tokenAccounts.value) {
            const data = account.account.data;
            const balanceBytes = data.slice(64, 72);
            const balance = new DataView(balanceBytes.buffer, balanceBytes.byteOffset).getBigUint64(0, true);
            totalBalance += balance;
          }
          
          if (totalBalance > 0n) {
            const decimals = parseInt(token.decimals);
            const balanceFormatted = formatBalance(totalBalance.toString(), decimals);
            const price = await getTokenPrice(chain.chainIndex, token.tokenContractAddress);
            const usdValue = parseFloat(balanceFormatted) * price;
            
            if (usdValue >= 0.01) {
              portfolioTokens.push({
                ...token,
                chainIndex: chain.chainIndex,
                chainName: chain.name,
                chainIcon: chain.icon,
                balance: totalBalance.toString(),
                balanceFormatted,
                usdValue,
                price,
                priceChange24h: 0,
                isCustom: true,
              });
            }
          }
        }
      } catch {
        // Skip failed token fetches
      }
    }
  } catch (err) {
    console.error('Failed to fetch Solana balances:', err);
  }
}

// Sui balance fetching
async function fetchSuiBalances(
  chain: Chain,
  address: string,
  getSuiClient: () => any,
  portfolioTokens: PortfolioToken[]
): Promise<void> {
  try {
    const client = getSuiClient();
    if (!client) return;

    // Get native SUI balance
    const coins = await client.getCoins({ owner: address, coinType: SUI_NATIVE_ADDRESS });
    if (coins.data && coins.data.length > 0) {
      const total = coins.data.reduce((sum: bigint, c: any) => sum + BigInt(c.balance), BigInt(0));
      if (total > 0n) {
        const nativeBalance = total.toString();
        const balanceFormatted = formatBalance(nativeBalance, 9);
        const price = await getTokenPrice(chain.chainIndex, SUI_NATIVE_ADDRESS);
        const usdValue = parseFloat(balanceFormatted) * price;
        
        if (usdValue >= 0.01) {
          portfolioTokens.push({
            tokenContractAddress: SUI_NATIVE_ADDRESS,
            tokenSymbol: 'SUI',
            tokenName: 'Sui',
            decimals: '9',
            tokenLogoUrl: chain.icon,
            chainIndex: chain.chainIndex,
            chainName: chain.name,
            chainIcon: chain.icon,
            balance: nativeBalance,
            balanceFormatted,
            usdValue,
            price,
            priceChange24h: 0,
          });
        }
      }
    }

    // Get custom tokens
    const customTokens = getCustomTokensForChain(chain.chainIndex, address);
    for (const token of customTokens) {
      try {
        const tokenCoins = await client.getCoins({ owner: address, coinType: token.tokenContractAddress });
        if (tokenCoins.data && tokenCoins.data.length > 0) {
          const total = tokenCoins.data.reduce((sum: bigint, c: any) => sum + BigInt(c.balance), BigInt(0));
          if (total > 0n) {
            const decimals = parseInt(token.decimals);
            const balanceFormatted = formatBalance(total.toString(), decimals);
            const price = await getTokenPrice(chain.chainIndex, token.tokenContractAddress);
            const usdValue = parseFloat(balanceFormatted) * price;
            
            if (usdValue >= 0.01) {
              portfolioTokens.push({
                ...token,
                chainIndex: chain.chainIndex,
                chainName: chain.name,
                chainIcon: chain.icon,
                balance: total.toString(),
                balanceFormatted,
                usdValue,
                price,
                priceChange24h: 0,
                isCustom: true,
              });
            }
          }
        }
      } catch {
        // Skip failed token fetches
      }
    }
  } catch (err) {
    console.error('Failed to fetch Sui balances:', err);
  }
}

// Tron balance fetching
async function fetchTronBalances(
  chain: Chain,
  address: string,
  getTronWeb: () => any,
  portfolioTokens: PortfolioToken[]
): Promise<void> {
  try {
    const tronWeb = getTronWeb();
    if (!tronWeb) return;

    // Get native TRX balance
    const balance = await tronWeb.trx.getBalance(address);
    if (balance > 0) {
      const nativeBalance = balance.toString();
      const balanceFormatted = formatBalance(nativeBalance, 6);
      const price = await getTokenPrice(chain.chainIndex, TRON_NATIVE_ADDRESS);
      const usdValue = parseFloat(balanceFormatted) * price;
      
      if (usdValue >= 0.01) {
        portfolioTokens.push({
          tokenContractAddress: TRON_NATIVE_ADDRESS,
          tokenSymbol: 'TRX',
          tokenName: 'Tron',
          decimals: '6',
          tokenLogoUrl: chain.icon,
          chainIndex: chain.chainIndex,
          chainName: chain.name,
          chainIcon: chain.icon,
          balance: nativeBalance,
          balanceFormatted,
          usdValue,
          price,
          priceChange24h: 0,
        });
      }
    }

    // Get custom TRC20 tokens
    const customTokens = getCustomTokensForChain(chain.chainIndex, address);
    for (const token of customTokens) {
      try {
        const contract = await tronWeb.contract().at(token.tokenContractAddress);
        const tokenBalance = await contract.balanceOf(address).call();
        if (tokenBalance && tokenBalance.toString() !== '0') {
          const decimals = parseInt(token.decimals);
          const balanceFormatted = formatBalance(tokenBalance.toString(), decimals);
          const price = await getTokenPrice(chain.chainIndex, token.tokenContractAddress);
          const usdValue = parseFloat(balanceFormatted) * price;
          
          if (usdValue >= 0.01) {
            portfolioTokens.push({
              ...token,
              chainIndex: chain.chainIndex,
              chainName: chain.name,
              chainIcon: chain.icon,
              balance: tokenBalance.toString(),
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
    console.error('Failed to fetch Tron balances:', err);
  }
}

// TON balance fetching (native only for now)
async function fetchTonBalances(
  chain: Chain,
  address: string,
  portfolioTokens: PortfolioToken[]
): Promise<void> {
  try {
    // Use TON Center API to get balance
    const response = await fetch(`https://toncenter.com/api/v2/getAddressBalance?address=${address}`);
    const data = await response.json();
    
    if (data.ok && data.result) {
      const nativeBalance = data.result;
      if (nativeBalance && nativeBalance !== '0') {
        const balanceFormatted = formatBalance(nativeBalance, 9);
        const price = await getTokenPrice(chain.chainIndex, TON_NATIVE_ADDRESS);
        const usdValue = parseFloat(balanceFormatted) * price;
        
        if (usdValue >= 0.01) {
          portfolioTokens.push({
            tokenContractAddress: TON_NATIVE_ADDRESS,
            tokenSymbol: 'TON',
            tokenName: 'Toncoin',
            decimals: '9',
            tokenLogoUrl: chain.icon,
            chainIndex: chain.chainIndex,
            chainName: chain.name,
            chainIcon: chain.icon,
            balance: nativeBalance,
            balanceFormatted,
            usdValue,
            price,
            priceChange24h: 0,
          });
        }
      }
    }
  } catch (err) {
    console.error('Failed to fetch TON balances:', err);
  }
}

// Helper: Fetch EVM native balance
async function fetchEvmNativeBalance(provider: any, address: string): Promise<string> {
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

// Helper: Fetch ERC20 token balance
async function fetchErc20Balance(provider: any, address: string, tokenAddress: string): Promise<string> {
  try {
    const balanceData = BALANCE_OF_ABI + address.toLowerCase().replace('0x', '').padStart(64, '0');
    const balance = await provider.request({
      method: 'eth_call',
      params: [{ to: tokenAddress, data: balanceData }, 'latest'],
    });
    return BigInt(balance || '0x0').toString();
  } catch {
    return '0';
  }
}

// Helper: Fetch custom token balances for EVM
async function fetchCustomTokenBalances(
  chain: Chain,
  address: string,
  customTokens: OkxToken[],
  provider: any,
  portfolioTokens: PortfolioToken[],
  chainType: string
): Promise<void> {
  for (const token of customTokens) {
    try {
      const balance = await fetchErc20Balance(provider, address, token.tokenContractAddress);
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
