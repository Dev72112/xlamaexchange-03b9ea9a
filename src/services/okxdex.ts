import { supabase } from '@/integrations/supabase/client';
import { withRetry, getUserFriendlyErrorMessage } from '@/lib/api-utils';

export interface OkxToken {
  tokenContractAddress: string;
  tokenSymbol: string;
  tokenName: string;
  decimals: string;
  tokenLogoUrl: string;
}

export interface OkxQuote {
  fromToken: OkxToken;
  toToken: OkxToken;
  fromTokenAmount: string;
  toTokenAmount: string;
  estimateGasFee: string;
  priceImpactPercentage: string;
  tradeFee: string;
  quoteCompareList: Array<{
    dexName: string;
    dexLogo: string;
    tradeFee: string;
    receiveAmount: string;
  }>;
  routerResult: {
    toTokenAmount: string;
    routes: Array<{
      percentage: string;
      subRoutes: Array<{
        dexName: string;
        fromToken: OkxToken;
        toToken: OkxToken;
      }>;
    }>;
  };
}

export interface OkxSwapData {
  routerResult: OkxQuote['routerResult'];
  tx: {
    from: string;
    to: string;
    value: string;
    data: string;
    gas: string;
    gasPrice: string;
  };
}

export interface OkxApproveData {
  data: string;
  dexContractAddress: string;
  gasLimit: string;
  gasPrice: string;
}

export interface OkxChain {
  chainId: string;
  chainName: string;
  dexTokenApproveAddress: string;
}

export interface WalletTokenBalance {
  chainIndex: string;
  tokenContractAddress: string;
  address: string;
  symbol: string;
  balance: string;
  rawBalance?: string;
  tokenPrice: string;
  isRiskToken?: boolean;
}

// v6 Token Price Info (enhanced)
export interface TokenPriceInfo {
  chainIndex: string;
  tokenContractAddress: string;
  time: string;
  price: string;
  marketCap: string;
  priceChange5M: string;
  priceChange1H: string;
  priceChange4H: string;
  priceChange24H: string;
  volume5M: string;
  volume1H: string;
  volume4H: string;
  volume24H: string;
  liquidity: string;
  holders: string;
}

// v6 Token Ranking
export interface TrendingTokenData {
  chainIndex: string;
  tokenSymbol: string;
  tokenLogoUrl: string;
  tokenContractAddress: string;
  marketCap: string;
  volume: string;
  firstTradeTime: string;
  change: string;
  liquidity: string;
  price: string;
  holders: string;
  uniqueTraders: string;
  txsBuy: string;
  txsSell: string;
  txs: string;
}

// v6 Token Search Result
export interface TokenSearchResult {
  chainIndex: string;
  tokenSymbol: string;
  tokenName: string;
  tokenContractAddress: string;
  tokenLogoUrl: string;
  decimal: string;
  price: string;
  change24H: string;
  marketCap: string;
  liquidity: string;
  holders: string;
  tagList?: { communityRecognized?: boolean };
}

// v6 Candlestick data
export interface CandlestickData {
  ts: string;
  o: string;
  h: string;
  l: string;
  c: string;
  vol: string;
  volUsd: string;
  confirm: string;
}

// v6 Transaction History
export interface TransactionHistoryItem {
  chainIndex: string;
  txHash: string;
  itype: string;
  methodId: string;
  nonce: string;
  txTime: string;
  from: Array<{ address: string; amount: string }>;
  to: Array<{ address: string; amount: string }>;
  tokenContractAddress: string;
  amount: string;
  symbol: string;
  txFee: string;
  txStatus: 'success' | 'fail' | 'pending';
  hitBlacklist: boolean;
}

class OkxDexService {
  private async callApi<T>(action: string, params: Record<string, any> = {}): Promise<T> {
    return withRetry(async () => {
      const { data, error } = await supabase.functions.invoke('okx-dex', {
        body: { action, params },
      });

      if (error) {
        throw new Error(getUserFriendlyErrorMessage(error));
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data as T;
    });
  }

  // ========== DEX Aggregator (v5) ==========
  async getSupportedChains(): Promise<OkxChain[]> {
    return this.callApi<OkxChain[]>('supported-chains');
  }

  async getTokens(chainIndex: string): Promise<OkxToken[]> {
    return this.callApi<OkxToken[]>('tokens', { chainIndex });
  }

  async getQuote(
    chainIndex: string,
    fromTokenAddress: string,
    toTokenAddress: string,
    amount: string,
    slippage: string = '0.5'
  ): Promise<OkxQuote> {
    const result = await this.callApi<OkxQuote[]>('quote', {
      chainIndex,
      fromTokenAddress,
      toTokenAddress,
      amount,
      slippage,
    });
    return Array.isArray(result) ? result[0] : result;
  }

  async getSwapData(
    chainIndex: string,
    fromTokenAddress: string,
    toTokenAddress: string,
    amount: string,
    userWalletAddress: string,
    slippage: string = '0.5'
  ): Promise<OkxSwapData> {
    const result = await this.callApi<OkxSwapData[]>('swap', {
      chainIndex,
      fromTokenAddress,
      toTokenAddress,
      amount,
      userWalletAddress,
      slippage,
    });
    return Array.isArray(result) ? result[0] : result;
  }

  async getApproveTransaction(
    chainIndex: string,
    tokenContractAddress: string,
    approveAmount?: string
  ): Promise<OkxApproveData> {
    const result = await this.callApi<OkxApproveData[]>('approve-transaction', {
      chainIndex,
      tokenContractAddress,
      approveAmount,
    });
    return Array.isArray(result) ? result[0] : result;
  }

  async getLiquidity(chainIndex: string): Promise<any[]> {
    return this.callApi<any[]>('liquidity', { chainIndex });
  }

  async getTokenInfo(chainIndex: string, tokenAddress: string): Promise<OkxToken | null> {
    const result = await this.callApi<OkxToken>('token-info', { chainIndex, tokenAddress });
    if (!result || !result.tokenSymbol) {
      return null;
    }
    return result;
  }

  async getCrossChainQuote(
    fromChainIndex: string,
    toChainIndex: string,
    fromTokenAddress: string,
    toTokenAddress: string,
    amount: string,
    slippage: string = '0.5',
    userWalletAddress?: string // Optional - allows quotes without wallet
  ): Promise<any> {
    const params: Record<string, string> = {
      fromChainIndex,
      toChainIndex,
      fromTokenAddress,
      toTokenAddress,
      amount,
      slippage,
    };
    // Only include userWalletAddress if provided
    if (userWalletAddress) {
      params.userWalletAddress = userWalletAddress;
    }
    return this.callApi<any>('cross-chain-quote', params);
  }

  async getCrossChainSwap(
    fromChainIndex: string,
    toChainIndex: string,
    fromTokenAddress: string,
    toTokenAddress: string,
    amount: string,
    slippage: string = '0.5',
    userWalletAddress: string,
    receiveAddress: string
  ): Promise<any> {
    return this.callApi<any>('cross-chain-swap', {
      fromChainIndex,
      toChainIndex,
      fromTokenAddress,
      toTokenAddress,
      amount,
      slippage,
      userWalletAddress,
      receiveAddress,
    });
  }

  // ========== Market API (v6) ==========
  async getTokenPrice(chainIndex: string, tokenAddress: string): Promise<{ price: string } | null> {
    try {
      const result = await this.callApi<{ price: string }>('token-price', { chainIndex, tokenAddress });
      return result;
    } catch {
      return null;
    }
  }

  async getTokenPriceInfo(chainIndex: string, tokenContractAddress: string): Promise<TokenPriceInfo | null> {
    try {
      const result = await this.callApi<TokenPriceInfo[]>('token-price-info', { chainIndex, tokenContractAddress });
      return Array.isArray(result) ? result[0] : result;
    } catch {
      return null;
    }
  }

  async getTokenRanking(
    chains: string,
    sortBy: '2' | '5' | '6' = '2', // 2=price change, 5=volume, 6=market cap
    timeFrame: '1' | '2' | '3' | '4' = '4' // 1=5m, 2=1h, 3=4h, 4=24h
  ): Promise<TrendingTokenData[]> {
    try {
      const result = await this.callApi<TrendingTokenData[]>('token-ranking', { chains, sortBy, timeFrame });
      return Array.isArray(result) ? result : [];
    } catch (err) {
      console.error('Failed to fetch token ranking:', err);
      return [];
    }
  }

  async searchTokens(chains: string, search: string): Promise<TokenSearchResult[]> {
    try {
      const result = await this.callApi<TokenSearchResult[]>('token-search', { chains, search });
      return Array.isArray(result) ? result : [];
    } catch (err) {
      console.error('Failed to search tokens:', err);
      return [];
    }
  }

  async getCandlesticks(
    chainIndex: string,
    tokenContractAddress: string,
    bar: string = '1H',
    limit: number = 100
  ): Promise<CandlestickData[]> {
    try {
      const result = await this.callApi<string[][]>('candlesticks', {
        chainIndex,
        tokenContractAddress,
        bar,
        limit: String(limit),
      });
      
      // Convert array format to object format
      if (Array.isArray(result)) {
        return result.map(candle => ({
          ts: candle[0],
          o: candle[1],
          h: candle[2],
          l: candle[3],
          c: candle[4],
          vol: candle[5],
          volUsd: candle[6],
          confirm: candle[7],
        }));
      }
      return [];
    } catch (err) {
      console.error('Failed to fetch candlesticks:', err);
      return [];
    }
  }

  async getHistoryCandlesticks(
    chainIndex: string,
    tokenContractAddress: string,
    bar: string = '1H',
    limit: number = 100,
    after?: string
  ): Promise<CandlestickData[]> {
    try {
      const result = await this.callApi<string[][]>('history-candles', {
        chainIndex,
        tokenContractAddress,
        bar,
        limit: String(limit),
        after,
      });
      
      if (Array.isArray(result)) {
        return result.map(candle => ({
          ts: candle[0],
          o: candle[1],
          h: candle[2],
          l: candle[3],
          c: candle[4],
          vol: candle[5],
          volUsd: candle[6],
          confirm: candle[7],
        }));
      }
      return [];
    } catch (err) {
      console.error('Failed to fetch history candlesticks:', err);
      return [];
    }
  }

  // ========== Balance API (v6) ==========
  async getWalletBalances(address: string, chains: string, excludeRiskToken: boolean = true): Promise<WalletTokenBalance[]> {
    try {
      const result = await this.callApi<{ tokenAssets: WalletTokenBalance[] }[]>('wallet-balances', {
        address,
        chains,
        excludeRiskToken: excludeRiskToken ? '0' : '1',
      });
      
      // v6 API returns nested structure
      if (Array.isArray(result) && result[0]?.tokenAssets) {
        return result[0].tokenAssets;
      }
      return [];
    } catch (err) {
      console.error('Failed to fetch wallet balances:', err);
      return [];
    }
  }

  async getPortfolioValue(address: string, chains?: string): Promise<{ totalValue: string } | null> {
    try {
      const result = await this.callApi<{ totalValue: string }>('portfolio-value', { address, chains });
      return result;
    } catch {
      return null;
    }
  }

  // ========== Transaction History API (v6) ==========
  async getTransactionHistory(
    address: string,
    chains?: string,
    options?: {
      tokenContractAddress?: string;
      begin?: string;
      end?: string;
      cursor?: string;
      limit?: number;
    }
  ): Promise<{ transactions: TransactionHistoryItem[]; cursor?: string }> {
    try {
      const result = await this.callApi<{ transactionList: TransactionHistoryItem[]; cursor: string }[]>('tx-history', {
        address,
        chains,
        ...options,
        limit: options?.limit?.toString(),
      });
      
      if (Array.isArray(result) && result[0]) {
        return {
          transactions: result[0].transactionList || [],
          cursor: result[0].cursor,
        };
      }
      return { transactions: [] };
    } catch (err) {
      console.error('Failed to fetch transaction history:', err);
      return { transactions: [] };
    }
  }

  async getTransactionDetail(chainIndex: string, txHash: string): Promise<TransactionHistoryItem | null> {
    try {
      const result = await this.callApi<TransactionHistoryItem>('tx-detail', { chainIndex, txHash });
      return result;
    } catch {
      return null;
    }
  }
}

export const okxDexService = new OkxDexService();
