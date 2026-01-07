/**
 * SwapWidget Types
 * Shared types for the swap widget components
 */

import { Currency } from '@/data/currencies';
import { Chain } from '@/data/chains';
import { OkxToken } from '@/services/okxdex';

export type SwapMode = 'instant' | 'dex' | 'limit' | 'dca';

export interface SwapToken {
  symbol: string;
  name: string;
  logo?: string;
  address: string;
  decimals: number;
  chainIndex?: string;
}

export interface SwapQuote {
  inputAmount: string;
  outputAmount: string;
  exchangeRate: number;
  priceImpact?: number;
  gasCost?: string;
  route?: string[];
}

export interface SwapState {
  mode: SwapMode;
  fromToken: OkxToken | Currency | null;
  toToken: OkxToken | Currency | null;
  fromAmount: string;
  toAmount: string;
  slippage: string;
  isLoading: boolean;
  quote: SwapQuote | null;
  error: string | null;
}

export interface SwapWidgetProps {
  className?: string;
  defaultMode?: SwapMode;
  onModeChange?: (mode: SwapMode) => void;
}

export interface TokenInputProps {
  label: string;
  token: OkxToken | null;
  amount: string;
  balance?: string;
  usdValue?: string;
  isLoading?: boolean;
  readOnly?: boolean;
  onAmountChange?: (amount: string) => void;
  onTokenSelect?: (token: OkxToken) => void;
  onMaxClick?: () => void;
  tokens?: OkxToken[];
  nativeToken?: OkxToken | null;
  chain?: Chain;
}

export interface SwapButtonProps {
  isConnected: boolean;
  isLoading: boolean;
  canSwap: boolean;
  hasInsufficientBalance: boolean;
  onSwap: () => void;
  buttonText?: string;
}

export interface SwapRateProps {
  fromSymbol: string;
  toSymbol: string;
  exchangeRate: number;
  priceImpact?: number;
  gasCost?: string;
  lastUpdated?: Date | null;
}
