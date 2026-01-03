import { useState, useEffect, useCallback } from 'react';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { SUPPORTED_CHAINS, Chain, NATIVE_TOKEN_ADDRESS } from '@/data/chains';
import { OkxToken, okxDexService, WalletTokenBalance } from '@/services/okxdex';
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

// Native token addresses per chain
const NATIVE_ADDRESSES: Record<string, string> = {
  '501': 'So11111111111111111111111111111111111111112', // Solana
  '195': 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb', // Tron WTRX
  '784': '0x2::sui::SUI', // Sui
  '607': 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c', // TON
};

// Chains supported by OKX Wallet API (based on official docs)
// Some DEX-supported chains like ZetaChain, Sonic, Unichain are NOT wallet API supported
const WALLET_API_SUPPORTED_CHAINS: string[] = [
  '1',      // Ethereum
  '10',     // OP Mainnet
  '56',     // BNB Smart Chain
  '66',     // OKT Chain
  '196',    // X Layer
  '137',    // Polygon
  '42161',  // Arbitrum One
  '43114',  // Avalanche
  '324',    // zkSync Era
  '1101',   // Polygon zkEVM
  '8453',   // Base
  '59144',  // Linea
  '250',    // Fantom
  '5000',   // Mantle
  '1030',   // Conflux eSpace
  '1088',   // Metis
  '4200',   // Merlin Chain
  '81457',  // Blast
  '169',    // Manta Pacific
  '534352', // Scroll
  '25',     // Cronos
  // Non-EVM
  '195',    // Tron
  '501',    // Solana
  '784',    // Sui
  // Note: TON (607) wallet API is "Coming Soon" per OKX docs
];

// Get custom tokens from localStorage for a chain
function getCustomTokensForChain(chainIndex: string, walletAddress?: string): OkxToken[] {
  const tokens: OkxToken[] = [];
  const seenAddresses = new Set<string>();
  
  try {
    // Try with wallet address first
    if (walletAddress) {
      const keyWithWallet = `dex-custom-tokens-${chainIndex}-${walletAddress.toLowerCase()}`;
      const storedWithWallet = localStorage.getItem(keyWithWallet);
      if (storedWithWallet) {
        const data = JSON.parse(storedWithWallet);
        (data.tokens || []).forEach((t: OkxToken) => {
          const addr = t.tokenContractAddress.toLowerCase();
          if (!seenAddresses.has(addr)) {
            seenAddresses.add(addr);
            tokens.push(t);
          }
        });
      }
    }
    
    // Also check without wallet address
    const keyGeneral = `dex-custom-tokens-${chainIndex}`;
    const storedGeneral = localStorage.getItem(keyGeneral);
    if (storedGeneral) {
      const data = JSON.parse(storedGeneral);
      (data.tokens || []).forEach((t: OkxToken) => {
        const addr = t.tokenContractAddress.toLowerCase();
        if (!seenAddresses.has(addr)) {
          seenAddresses.add(addr);
          tokens.push(t);
        }
      });
    }
  } catch {
    // ignore
  }
  return tokens;
}

// Get chain info by chainIndex
function getChainInfo(chainIndex: string): { name: string; icon: string; nativeSymbol: string; nativeDecimals: number } | null {
  const chain = SUPPORTED_CHAINS.find(c => c.chainIndex === chainIndex);
  if (!chain) return null;
  return {
    name: chain.name,
    icon: chain.icon,
    nativeSymbol: chain.nativeCurrency.symbol,
    nativeDecimals: chain.nativeCurrency.decimals,
  };
}

export function usePortfolioBalances() {
  const { 
    isConnected,
    evmAddress,
    solanaAddress,
    suiAddress,
    tronAddress,
    tonAddress,
  } = useMultiWallet();
  
  const [tokens, setTokens] = useState<PortfolioToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalValue, setTotalValue] = useState(0);
  const [selectedChain, setSelectedChain] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  // Check if any wallet is connected
  const isAnyConnected = !!(evmAddress || solanaAddress || suiAddress || tronAddress || tonAddress);

  const fetchPortfolio = useCallback(async () => {
    if (!isAnyConnected) {
      setTokens([]);
      setTotalValue(0);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const portfolioTokens: PortfolioToken[] = [];

    try {
      const fetchPromises: Promise<void>[] = [];

      // Fetch EVM balances via backend API - only use wallet API supported chains
      if (evmAddress) {
        const evmChainIndexes = SUPPORTED_CHAINS
          .filter(c => c.isEvm && WALLET_API_SUPPORTED_CHAINS.includes(c.chainIndex))
          .map(c => c.chainIndex);
        console.log('[Portfolio] Fetching EVM balances for chains:', evmChainIndexes);
        fetchPromises.push(
          fetchWalletBalancesViaBackend(evmAddress, evmChainIndexes, portfolioTokens)
        );
      }

      // Fetch Solana balances
      if (solanaAddress) {
        fetchPromises.push(
          fetchWalletBalancesViaBackend(solanaAddress, ['501'], portfolioTokens)
        );
      }

      // Fetch Sui balances
      if (suiAddress) {
        fetchPromises.push(
          fetchWalletBalancesViaBackend(suiAddress, ['784'], portfolioTokens)
        );
      }

      // Fetch Tron balances
      if (tronAddress) {
        fetchPromises.push(
          fetchWalletBalancesViaBackend(tronAddress, ['195'], portfolioTokens)
        );
      }

      // Fetch TON balances - Note: OKX Wallet API for TON is "Coming Soon"
      // For now, skip TON balance fetching via OKX and rely on custom tokens only
      if (tonAddress) {
        // Only fetch custom tokens for TON since wallet API not yet supported
        await fetchCustomTokensOnly(tonAddress, ['607'], portfolioTokens);
      }

      // Use allSettled so one chain failure doesn't break others
      const results = await Promise.allSettled(fetchPromises);
      
      // Check for failures and log them
      results.forEach((result, idx) => {
        if (result.status === 'rejected') {
          console.error(`[Portfolio] Fetch promise ${idx} failed:`, result.reason);
        }
      });

      console.log('[Portfolio] Fetched tokens:', portfolioTokens.length);

      // Sort by USD value descending, then by balance if no price
      portfolioTokens.sort((a, b) => {
        if (b.usdValue !== a.usdValue) return b.usdValue - a.usdValue;
        return parseFloat(b.balanceFormatted) - parseFloat(a.balanceFormatted);
      });
      
      setTokens(portfolioTokens);
      setTotalValue(portfolioTokens.reduce((sum, t) => sum + t.usdValue, 0));
    } catch (err) {
      console.error('[Portfolio] Fetch error:', err);
      setError('Failed to load portfolio. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isAnyConnected, evmAddress, solanaAddress, suiAddress, tronAddress, tonAddress]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!isAnyConnected) return;
    const interval = setInterval(fetchPortfolio, 60000);
    return () => clearInterval(interval);
  }, [fetchPortfolio, isAnyConnected]);

  // Filter tokens by selected chain
  const filteredTokens = selectedChain === 'all' 
    ? tokens 
    : tokens.filter(t => t.chainIndex === selectedChain);

  // Get unique chains that have tokens
  const chainsWithBalances = [...new Set(tokens.map(t => t.chainIndex))];

  return {
    tokens: filteredTokens,
    allTokens: tokens,
    loading,
    totalValue,
    refetch: fetchPortfolio,
    selectedChain,
    setSelectedChain,
    chainsWithBalances,
    error,
    isAnyConnected,
  };
}

// Fetch wallet balances via backend OKX API - bypasses CORS issues
async function fetchWalletBalancesViaBackend(
  address: string,
  chainIndexes: string[],
  portfolioTokens: PortfolioToken[]
): Promise<void> {
  try {
    console.log(`[Portfolio] Fetching balances for ${address} on chains:`, chainIndexes.join(','));
    
    const balances = await okxDexService.getWalletBalances(address, chainIndexes);
    
    if (!balances || balances.length === 0) {
      console.log(`[Portfolio] No balances returned for ${address}`);
      // Fall back to custom tokens only
      await fetchCustomTokensOnly(address, chainIndexes, portfolioTokens);
      return;
    }

    console.log(`[Portfolio] Got ${balances.length} token balances`);

    // Process each balance
    for (const balance of balances) {
      const chainInfo = getChainInfo(balance.chainIndex);
      if (!chainInfo) continue;

      const balanceNum = parseFloat(balance.balance);
      if (balanceNum <= 0) continue;

      const price = parseFloat(balance.tokenPrice) || 0;
      const usdValue = balanceNum * price;

      // Determine if this is a native token
      const isNative = !balance.tokenAddress || 
        balance.tokenAddress === '' || 
        balance.tokenType === '1' ||
        balance.tokenAddress === NATIVE_TOKEN_ADDRESS ||
        balance.tokenAddress === NATIVE_ADDRESSES[balance.chainIndex];

      portfolioTokens.push({
        tokenContractAddress: isNative ? (NATIVE_ADDRESSES[balance.chainIndex] || NATIVE_TOKEN_ADDRESS) : balance.tokenAddress,
        tokenSymbol: balance.symbol,
        tokenName: balance.symbol, // OKX wallet API doesn't return full name
        decimals: '18', // Default, actual precision handled by balance string
        tokenLogoUrl: chainInfo.icon, // Use chain icon as fallback
        chainIndex: balance.chainIndex,
        chainName: chainInfo.name,
        chainIcon: chainInfo.icon,
        balance: balance.balance,
        balanceFormatted: formatDisplayBalance(balance.balance),
        usdValue,
        price,
        priceChange24h: 0,
        isCustom: false,
      });
    }

    // Also fetch custom tokens that might not be in OKX's default list
    await fetchCustomTokensOnly(address, chainIndexes, portfolioTokens);

  } catch (err) {
    console.error(`[Portfolio] Backend balance fetch failed for ${address}:`, err);
    // Fall back to custom tokens only
    await fetchCustomTokensOnly(address, chainIndexes, portfolioTokens);
  }
}

// Fetch only custom tokens (for cases where backend API doesn't include them)
async function fetchCustomTokensOnly(
  address: string,
  chainIndexes: string[],
  portfolioTokens: PortfolioToken[]
): Promise<void> {
  for (const chainIndex of chainIndexes) {
    const customTokens = getCustomTokensForChain(chainIndex, address);
    const chainInfo = getChainInfo(chainIndex);
    
    if (!chainInfo || customTokens.length === 0) continue;

    for (const token of customTokens) {
      // Check if already in portfolio
      const exists = portfolioTokens.some(
        p => p.chainIndex === chainIndex && 
             p.tokenContractAddress.toLowerCase() === token.tokenContractAddress.toLowerCase()
      );
      if (exists) continue;

      // Get price for custom token
      const price = await getTokenPrice(chainIndex, token.tokenContractAddress);
      
      // Add with 0 balance (we can't fetch balance without RPC)
      // User will see it in list even if balance is unknown
      portfolioTokens.push({
        ...token,
        chainIndex,
        chainName: chainInfo.name,
        chainIcon: chainInfo.icon,
        balance: '0',
        balanceFormatted: '—', // Indicate balance unknown
        usdValue: 0,
        price,
        priceChange24h: 0,
        isCustom: true,
      });
    }
  }
}

// Format balance for display
function formatDisplayBalance(balance: string): string {
  const num = parseFloat(balance);
  if (isNaN(num) || num === 0) return '0';
  
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'K';
  }
  if (num >= 1) {
    return num.toFixed(4);
  }
  if (num >= 0.0001) {
    return num.toFixed(6);
  }
  return num.toExponential(2);
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
