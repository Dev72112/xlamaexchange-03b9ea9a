/**
 * Bridge Feature Types
 */

export interface BridgeRoute {
  id: string;
  fromChainId: number;
  toChainId: number;
  fromToken: BridgeToken;
  toToken: BridgeToken;
  fromAmount: string;
  toAmount: string;
  estimatedTime: number;
  gasCost: string;
  steps: BridgeStep[];
}

export interface BridgeToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  logoUri?: string;
  priceUSD?: string;
}

export interface BridgeStep {
  type: 'swap' | 'bridge' | 'cross';
  tool: string;
  fromToken: BridgeToken;
  toToken: BridgeToken;
  fromAmount: string;
  toAmount: string;
}

export interface BridgeQuote {
  routes: BridgeRoute[];
  selectedRoute?: BridgeRoute;
}

export interface BridgeParams {
  fromChainId: number;
  toChainId: number;
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  userAddress: string;
  slippage: string;
}

export interface BridgeResult {
  success: boolean;
  txHash?: string;
  error?: string;
}
