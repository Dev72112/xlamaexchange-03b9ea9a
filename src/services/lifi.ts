import { createConfig, getQuote, getChains, getTokens, getStatus, getStepTransaction, convertQuoteToRoute, type Route, type LiFiStep, type Token, type QuoteRequest, type ExtendedChain, type FullStatusData, type StatusResponse } from '@lifi/sdk';

// Initialize Li.Fi SDK with integrator ID
const INTEGRATOR_ID = 'Xlama';

// Platform fee: 1.5% (0.015) - configured in Li.Fi Portal (portal.li.fi)
const PLATFORM_FEE = 0.015;
const FEES_ENABLED = true; // Enabled - Xlama integrator is active in portal.li.fi

// Initialize the SDK configuration
createConfig({
  integrator: INTEGRATOR_ID,
});

export interface LiFiChain {
  id: number;
  key: string;
  name: string;
  logoURI: string;
  nativeToken: {
    address: string;
    symbol: string;
    decimals: number;
    name: string;
    priceUSD: string;
    logoURI: string;
  };
}

export interface LiFiToken {
  address: string;
  symbol: string;
  decimals: number;
  chainId: number;
  name: string;
  priceUSD?: string;
  logoURI?: string;
}

export interface LiFiQuoteResult {
  route: Route;
  fromToken: LiFiToken;
  toToken: LiFiToken;
  fromAmount: string;
  toAmount: string;
  toAmountMin: string;
  estimatedGasCostUSD: string;
  estimatedDurationSeconds: number;
  bridgeName?: string;
  steps: Array<{
    type: string;
    tool: string;
    toolDetails: {
      name: string;
      logoURI: string;
    };
  }>;
}

// Map our chain indices to Li.Fi chain IDs
const chainIndexToLiFiId: Record<string, number> = {
  '1': 1,        // Ethereum
  '56': 56,      // BSC
  '137': 137,    // Polygon
  '42161': 42161, // Arbitrum
  '10': 10,      // Optimism
  '8453': 8453,  // Base
  '43114': 43114, // Avalanche
  '250': 250,    // Fantom
  '100': 100,    // Gnosis
  '324': 324,    // zkSync Era
  '59144': 59144, // Linea
  '534352': 534352, // Scroll
  '5000': 5000,  // Mantle
  '81457': 81457, // Blast
  '7777777': 7777777, // Zora
  '196': 196,    // X Layer
  '1101': 1101,  // Polygon zkEVM
  '169': 169,    // Manta Pacific
  '34443': 34443, // Mode
  '167000': 167000, // Taiko
  '501': 1151111081099710, // Solana (Li.Fi uses this ID)
};

// Map Li.Fi chain ID back to our chain index
const liFiIdToChainIndex: Record<number, string> = Object.entries(chainIndexToLiFiId).reduce(
  (acc, [idx, id]) => ({ ...acc, [id]: idx }),
  {}
);

export const lifiService = {
  /**
   * Get supported chains from Li.Fi
   */
  async getChains(): Promise<LiFiChain[]> {
    const chains = await getChains();
    return chains.map((chain: ExtendedChain) => ({
      id: chain.id,
      key: chain.key,
      name: chain.name,
      logoURI: chain.logoURI || '',
      nativeToken: chain.nativeToken ? {
        address: chain.nativeToken.address,
        symbol: chain.nativeToken.symbol,
        decimals: chain.nativeToken.decimals,
        name: chain.nativeToken.name,
        priceUSD: chain.nativeToken.priceUSD || '0',
        logoURI: chain.nativeToken.logoURI || '',
      } : {
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        decimals: 18,
        name: 'Ethereum',
        priceUSD: '0',
        logoURI: '',
      },
    }));
  },

  /**
   * Get tokens for a specific chain
   */
  async getTokens(chainId: number): Promise<LiFiToken[]> {
    const result = await getTokens({ chains: [chainId] });
    const tokens = result.tokens[chainId] || [];
    return tokens.map((token: Token) => ({
      address: token.address,
      symbol: token.symbol,
      decimals: token.decimals,
      chainId: token.chainId,
      name: token.name,
      priceUSD: token.priceUSD,
      logoURI: token.logoURI,
    }));
  },

  /**
   * Get a cross-chain swap quote with platform fee
   */
  async getQuote(params: {
    fromChainIndex: string;
    toChainIndex: string;
    fromToken: string;
    toToken: string;
    fromAmount: string;
    fromAddress: string;
    toAddress?: string;
    slippage?: number;
  }): Promise<LiFiQuoteResult | null> {
    const fromChainId = chainIndexToLiFiId[params.fromChainIndex];
    const toChainId = chainIndexToLiFiId[params.toChainIndex];

    if (!fromChainId || !toChainId) {
      console.error('Unsupported chain for Li.Fi:', params.fromChainIndex, params.toChainIndex);
      return null;
    }

    const quoteRequest: QuoteRequest = {
      fromChain: fromChainId,
      toChain: toChainId,
      fromToken: params.fromToken,
      toToken: params.toToken,
      fromAmount: params.fromAmount,
      fromAddress: params.fromAddress,
      toAddress: params.toAddress || params.fromAddress,
      slippage: params.slippage || 0.01, // Default 1%
    };
    
    // Add fee only when enabled (requires portal.li.fi setup)
    if (FEES_ENABLED) {
      (quoteRequest as QuoteRequest & { fee?: number }).fee = PLATFORM_FEE;
    }

    try {
      const quote = await getQuote(quoteRequest);
      
      // Quote is a LiFiStep which contains the route info
      const step = quote as LiFiStep;
      
      return {
        route: {
          id: step.id,
          insurance: { state: 'NOT_INSURABLE', feeAmountUsd: '0' },
          fromChainId: step.action.fromChainId,
          fromAmountUSD: step.estimate?.fromAmountUSD || '0',
          fromAmount: step.action.fromAmount,
          fromToken: step.action.fromToken,
          fromAddress: step.action.fromAddress,
          toChainId: step.action.toChainId,
          toAmountUSD: step.estimate?.toAmountUSD || '0',
          toAmount: step.estimate?.toAmount || '0',
          toAmountMin: step.estimate?.toAmountMin || '0',
          toToken: step.action.toToken,
          toAddress: step.action.toAddress,
          gasCostUSD: step.estimate?.gasCosts?.reduce(
            (acc, cost) => acc + parseFloat(cost.amountUSD || '0'), 0
          ).toFixed(2) || '0',
          steps: [step],
        },
        fromToken: {
          address: step.action.fromToken.address,
          symbol: step.action.fromToken.symbol,
          decimals: step.action.fromToken.decimals,
          chainId: step.action.fromChainId,
          name: step.action.fromToken.name,
          priceUSD: step.action.fromToken.priceUSD,
          logoURI: step.action.fromToken.logoURI,
        },
        toToken: {
          address: step.action.toToken.address,
          symbol: step.action.toToken.symbol,
          decimals: step.action.toToken.decimals,
          chainId: step.action.toChainId,
          name: step.action.toToken.name,
          priceUSD: step.action.toToken.priceUSD,
          logoURI: step.action.toToken.logoURI,
        },
        fromAmount: step.action.fromAmount,
        toAmount: step.estimate?.toAmount || '0',
        toAmountMin: step.estimate?.toAmountMin || '0',
        estimatedGasCostUSD: step.estimate?.gasCosts?.reduce(
          (acc, cost) => acc + parseFloat(cost.amountUSD || '0'), 0
        ).toFixed(2) || '0',
        estimatedDurationSeconds: step.estimate?.executionDuration || 0,
        bridgeName: step.toolDetails?.name || step.tool,
        steps: step.includedSteps?.map(s => ({
          type: s.type,
          tool: s.tool,
          toolDetails: {
            name: s.toolDetails?.name || s.tool,
            logoURI: s.toolDetails?.logoURI || '',
          },
        })) || [],
      };
    } catch (error) {
      console.error('Li.Fi quote error:', error);
      throw error;
    }
  },

  /**
   * Get transaction data for a route step
   * Returns the transaction request that can be sent by the user's wallet
   */
  async getStepTransactionData(
    step: LiFiStep
  ): Promise<{ to: string; data: string; value: string; gasLimit?: string; chainId: number }> {
    try {
      const stepWithTx = await getStepTransaction(step);
      const txRequest = stepWithTx.transactionRequest;
      
      if (!txRequest) {
        throw new Error('No transaction request in step');
      }

      return {
        to: txRequest.to || '',
        data: txRequest.data?.toString() || '0x',
        value: txRequest.value?.toString() || '0',
        gasLimit: txRequest.gasLimit?.toString(),
        chainId: step.action.fromChainId,
      };
    } catch (error) {
      console.error('Li.Fi getStepTransaction error:', error);
      throw error;
    }
  },

  /**
   * Convert a quote result to a route for execution
   */
  getRouteFromQuote(quoteResult: LiFiQuoteResult): Route {
    return quoteResult.route;
  },

  /**
   * Get status of a bridge transaction
   */
  async getStatus(params: {
    txHash: string;
    fromChain: number;
    toChain: number;
    bridge?: string;
  }): Promise<{
    status: 'PENDING' | 'DONE' | 'FAILED' | 'NOT_FOUND';
    substatus?: string;
    receiving?: {
      txHash: string;
      amount: string;
    };
  }> {
    try {
      const status: StatusResponse = await getStatus({
        txHash: params.txHash,
        fromChain: params.fromChain,
        toChain: params.toChain,
        bridge: params.bridge,
      });

      // Check if it's a FullStatusData with receiving info
      const fullStatus = status as FullStatusData;
      const hasReceiving = 'receiving' in fullStatus && fullStatus.receiving && 'txHash' in fullStatus.receiving;

      return {
        status: status.status as 'PENDING' | 'DONE' | 'FAILED' | 'NOT_FOUND',
        substatus: status.substatus,
        receiving: hasReceiving ? {
          txHash: (fullStatus.receiving as { txHash: string }).txHash || '',
          amount: (fullStatus.receiving as { amount?: string }).amount || '',
        } : undefined,
      };
    } catch (error) {
      console.error('Li.Fi status error:', error);
      return { status: 'NOT_FOUND' };
    }
  },

  /**
   * Convert chain index to Li.Fi chain ID
   */
  getChainId(chainIndex: string): number | null {
    return chainIndexToLiFiId[chainIndex] || null;
  },

  /**
   * Convert Li.Fi chain ID to our chain index
   */
  getChainIndex(lifiChainId: number): string | null {
    return liFiIdToChainIndex[lifiChainId] || null;
  },

  /**
   * Check if a chain is supported by Li.Fi
   */
  isChainSupported(chainIndex: string): boolean {
    return chainIndex in chainIndexToLiFiId;
  },
};

export default lifiService;
