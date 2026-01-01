import { supabase } from '@/integrations/supabase/client';

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

class OkxDexService {
  private async callApi<T>(action: string, params: Record<string, any> = {}): Promise<T> {
    const { data, error } = await supabase.functions.invoke('okx-dex', {
      body: { action, params },
    });

    if (error) {
      console.error('OKX DEX API error:', error);
      throw new Error(error.message || 'Failed to call OKX DEX API');
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data as T;
  }

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
    // OKX returns array with single quote
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

  async getTokenPrice(chainIndex: string, tokenAddress: string): Promise<{ price: string } | null> {
    try {
      const result = await this.callApi<{ price: string }>('token-price', { chainIndex, tokenAddress });
      return result;
    } catch (err) {
      console.error('Failed to get token price:', err);
      return null;
    }
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
    userWalletAddress: string
  ): Promise<any> {
    return this.callApi<any>('cross-chain-quote', {
      fromChainIndex,
      toChainIndex,
      fromTokenAddress,
      toTokenAddress,
      amount,
      slippage,
      userWalletAddress,
    });
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
}

export const okxDexService = new OkxDexService();
