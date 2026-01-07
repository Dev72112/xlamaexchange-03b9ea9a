/**
 * Swap Feature Types
 */

export interface SwapToken {
  tokenContractAddress: string;
  tokenSymbol: string;
  tokenName: string;
  decimals: number;
  tokenLogoUrl?: string;
  tokenUnitPrice?: string;
  isHoneyPot?: boolean;
}

export interface SwapQuote {
  fromToken: SwapToken;
  toToken: SwapToken;
  fromAmount: string;
  toAmount: string;
  priceImpact?: number;
  estimatedGas?: string;
  route?: SwapRoute[];
}

export interface SwapRoute {
  dexName: string;
  percentage: number;
}

export interface SwapParams {
  chainIndex: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  slippage: string;
  userAddress: string;
}

export interface SwapResult {
  success: boolean;
  txHash?: string;
  error?: string;
}
