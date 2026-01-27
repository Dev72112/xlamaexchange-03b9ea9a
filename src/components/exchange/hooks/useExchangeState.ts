/**
 * useExchangeState Hook
 * 
 * Centralized state management for the ExchangeWidget.
 * Handles mode switching, token selection, and form state.
 */

import { useState, useCallback, useMemo, useDeferredValue, useRef, useEffect } from 'react';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { useTradePreFill } from '@/contexts/TradePreFillContext';
import { ExchangeMode } from '../ModeToggle';
import { Currency, popularCurrencies } from '@/data/currencies';
import { Chain, getPrimaryChain, NATIVE_TOKEN_ADDRESS, SUPPORTED_CHAINS } from '@/data/chains';
import { OkxToken } from '@/services/okxdex';
import { useDexTokens } from '@/hooks/useDexTokens';
import { useDexQuote } from '@/hooks/useDexQuote';
import { useTokenBalance } from '@/hooks/useTokenBalance';
import { useTokenPrices } from '@/hooks/useTokenPrice';

export interface ExchangeState {
  // Mode
  exchangeMode: ExchangeMode;
  setExchangeMode: (mode: ExchangeMode) => void;
  
  // Chain
  selectedChain: Chain;
  setSelectedChain: (chain: Chain) => void;
  
  // Instant mode state
  currencies: Currency[];
  currenciesLoading: boolean;
  currenciesError: string | null;
  fromCurrency: Currency;
  toCurrency: Currency;
  setFromCurrency: (c: Currency) => void;
  setToCurrency: (c: Currency) => void;
  rateType: 'standard' | 'fixed';
  setRateType: (type: 'standard' | 'fixed') => void;
  
  // DEX mode state
  fromDexToken: OkxToken | null;
  toDexToken: OkxToken | null;
  setFromDexToken: (token: OkxToken | null) => void;
  setToDexToken: (token: OkxToken | null) => void;
  slippage: string;
  setSlippage: (slippage: string) => void;
  
  // Form state (shared)
  fromAmount: string;
  setFromAmount: (amount: string) => void;
  deferredFromAmount: string;
  toAmount: string;
  setToAmount: (amount: string) => void;
  
  // DEX tokens and quote data
  dexTokens: OkxToken[];
  nativeToken: OkxToken | null;
  tokensLoading: boolean;
  dexQuote: any;
  dexOutputAmount: string | null;
  dexExchangeRate: number | null;
  quoteLoading: boolean;
  quoteError: string | null;
  quoteLastUpdated: Date | null;
  refetchQuote: () => void;
  
  // Balance
  fromTokenBalance: string | null;
  balanceLoading: boolean;
  refetchBalance: () => void;
  hasInsufficientBalance: boolean;
  
  // USD values
  fromUsdValue: string | null;
  toUsdValue: string | null;
  fromTokenPrice: number | null;
  toTokenPrice: number | null;
  
  // Chain/connection state
  isOnCorrectChain: boolean;
  priceImpact: number;
  isHighPriceImpact: boolean;
  
  // Favorites
  isPairFavorite: boolean;
  toggleFavorite: () => void;
  
  // Actions
  handleMaxClick: () => void;
  swapTokens: () => void;
  
  // Instant mode data
  exchangeRate: number | null;
  setExchangeRate: (rate: number | null) => void;
  minAmount: number;
  setMinAmount: (min: number) => void;
  rateId: string | undefined;
  setRateId: (id: string | undefined) => void;
  pairError: string | null;
  setPairError: (error: string | null) => void;
  pairUnavailable: boolean;
  setPairUnavailable: (unavailable: boolean) => void;
  lastUpdated: Date | null;
  setLastUpdated: (date: Date | null) => void;
}

export function useExchangeState(onModeChange?: (mode: ExchangeMode) => void): ExchangeState {
  const { 
    isConnected, 
    activeAddress: address, 
    evmChainId: chainId, 
    setActiveChain, 
    isConnectedToChain,
    solanaAddress,
  } = useMultiWallet();
  const { selectedPredictionToken } = useTradePreFill();
  
  // Exchange mode state
  const [exchangeMode, setExchangeModeInternal] = useState<ExchangeMode>('instant');
  const [selectedChain, setSelectedChain] = useState<Chain>(getPrimaryChain());
  
  // Instant mode state
  const [currencies, setCurrencies] = useState<Currency[]>(popularCurrencies);
  const [currenciesLoading, setCurrenciesLoading] = useState(true);
  const [currenciesError, setCurrenciesError] = useState<string | null>(null);
  const [fromCurrency, setFromCurrency] = useState<Currency>(popularCurrencies[0]);
  const [toCurrency, setToCurrency] = useState<Currency>(popularCurrencies[1]);
  const [rateType, setRateType] = useState<'standard' | 'fixed'>('fixed');
  
  // DEX-specific state
  const [slippage, setSlippage] = useState<string>("0.5");
  const [fromDexToken, setFromDexToken] = useState<OkxToken | null>(null);
  const [toDexToken, setToDexToken] = useState<OkxToken | null>(null);
  
  // Common state
  const [fromAmount, setFromAmount] = useState<string>("1");
  const deferredFromAmount = useDeferredValue(fromAmount);
  const [toAmount, setToAmount] = useState<string>("");
  
  // Instant mode specific
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [minAmount, setMinAmount] = useState<number>(0);
  const [rateId, setRateId] = useState<string | undefined>();
  const [pairError, setPairError] = useState<string | null>(null);
  const [pairUnavailable, setPairUnavailable] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Track the chain index to detect changes
  const [lastChainIndex, setLastChainIndex] = useState<string>(selectedChain.chainIndex);
  const lastPredictionTokenRef = useRef<string | null>(null);

  // DEX hooks
  const { tokens: dexTokens, nativeToken, isLoading: tokensLoading, refetch: refetchTokens } = useDexTokens(
    exchangeMode === 'dex' ? selectedChain : null
  );
  
  // Quote hook
  const { 
    quote: dexQuote, 
    formattedOutputAmount: dexOutputAmount,
    exchangeRate: dexExchangeRate,
    isLoading: quoteLoading, 
    error: quoteError,
    lastUpdated: quoteLastUpdated,
    refetch: refetchQuote,
  } = useDexQuote({
    chain: selectedChain,
    fromToken: fromDexToken,
    toToken: toDexToken,
    amount: deferredFromAmount,
    slippage,
    enabled: exchangeMode === 'dex' && !!fromDexToken && !!toDexToken,
  });

  // Token balance
  const solanaBalanceAddress = selectedChain.chainIndex === '501' ? solanaAddress : undefined;
  const { formatted: fromTokenBalance, loading: balanceLoading, refetch: refetchBalance } = useTokenBalance(
    exchangeMode === 'dex' && (isConnected || solanaAddress) ? fromDexToken : null,
    selectedChain.chainIndex,
    solanaBalanceAddress
  );

  // Token prices
  const { fromUsdValue, toUsdValue, fromTokenPrice, toTokenPrice } = useTokenPrices(
    exchangeMode === 'dex' ? selectedChain.chainIndex : null,
    fromDexToken,
    toDexToken,
    fromAmount,
    dexOutputAmount || ''
  );
  
  // Check if wallet is on correct chain
  const isOnCorrectChain = selectedChain.isEvm 
    ? chainId === selectedChain.chainId 
    : isConnectedToChain(selectedChain);

  // Check for insufficient balance
  const hasInsufficientBalance = useMemo(() => {
    if (!isConnected || !fromTokenBalance || !fromAmount) return false;
    if (fromTokenBalance === '< 0.000001' || fromTokenBalance === '0') return parseFloat(fromAmount) > 0;
    const balance = parseFloat(fromTokenBalance);
    const amount = parseFloat(fromAmount);
    return !isNaN(balance) && !isNaN(amount) && amount > balance;
  }, [isConnected, fromTokenBalance, fromAmount]);

  // Price impact
  const priceImpact = useMemo(() => {
    if (!dexQuote?.priceImpactPercentage) return 0;
    return parseFloat(dexQuote.priceImpactPercentage);
  }, [dexQuote?.priceImpactPercentage]);

  const isHighPriceImpact = priceImpact > 5;

  // Favorites - placeholder, actual logic handled at component level with full FavoritePair context
  const isPairFavorite = false; // Will be overridden by component

  const toggleFavorite = useCallback(() => {
    // Handled at component level with useFavoritePairs
  }, []);

  // Handle MAX button
  const handleMaxClick = useCallback(() => {
    if (fromTokenBalance && fromTokenBalance !== '0' && fromTokenBalance !== '< 0.000001') {
      const isNativeToken = fromDexToken?.tokenContractAddress.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase();
      if (isNativeToken) {
        const balance = parseFloat(fromTokenBalance);
        const maxAmount = Math.max(0, balance - 0.01);
        setFromAmount(maxAmount.toString());
      } else {
        setFromAmount(fromTokenBalance);
      }
    }
  }, [fromTokenBalance, fromDexToken]);

  // Swap tokens
  const swapTokens = useCallback(() => {
    if (exchangeMode === 'instant') {
      const temp = fromCurrency;
      setFromCurrency(toCurrency);
      setToCurrency(temp);
    } else {
      const temp = fromDexToken;
      setFromDexToken(toDexToken);
      setToDexToken(temp);
    }
  }, [exchangeMode, fromCurrency, toCurrency, fromDexToken, toDexToken]);

  // Mode change handler
  const setExchangeMode = useCallback((mode: ExchangeMode) => {
    setExchangeModeInternal(mode);
    onModeChange?.(mode);
  }, [onModeChange]);

  // Sync selectedChain with activeChain
  useEffect(() => {
    setActiveChain(selectedChain);
  }, [selectedChain, setActiveChain]);

  // Reset DEX tokens when chain changes
  useEffect(() => {
    if (selectedChain.chainIndex !== lastChainIndex) {
      setFromDexToken(null);
      setToDexToken(null);
      setFromAmount('1');
      setToAmount('');
      setLastChainIndex(selectedChain.chainIndex);
    }
  }, [selectedChain.chainIndex, lastChainIndex]);

  // Set default DEX tokens when tokens load
  useEffect(() => {
    if (exchangeMode === 'dex' && dexTokens.length > 0 && nativeToken) {
      if (!fromDexToken) {
        setFromDexToken(nativeToken);
      }
      if (!toDexToken) {
        const usdt = dexTokens.find(t => t.tokenSymbol.toUpperCase() === 'USDT');
        const usdc = dexTokens.find(t => t.tokenSymbol.toUpperCase() === 'USDC');
        setToDexToken(usdt || usdc || dexTokens[0] || null);
      }
    }
  }, [exchangeMode, dexTokens, nativeToken, fromDexToken, toDexToken]);

  // Sync from prediction component
  useEffect(() => {
    if (selectedPredictionToken && exchangeMode === 'dex' && dexTokens.length > 0) {
      const key = `${selectedPredictionToken.chainIndex}-${selectedPredictionToken.tokenAddress}`;
      if (lastPredictionTokenRef.current !== key) {
        lastPredictionTokenRef.current = key;
        
        if (selectedPredictionToken.chainIndex !== selectedChain.chainIndex) {
          const newChain = SUPPORTED_CHAINS.find(c => c.chainIndex === selectedPredictionToken.chainIndex);
          if (newChain) {
            setSelectedChain(newChain);
          }
        }
        
        const matchingToken = dexTokens.find(
          t => t.tokenContractAddress.toLowerCase() === selectedPredictionToken.tokenAddress.toLowerCase()
        );
        if (matchingToken) {
          setToDexToken(matchingToken);
        }
      }
    }
  }, [selectedPredictionToken, exchangeMode, dexTokens, selectedChain.chainIndex]);

  return {
    // Mode
    exchangeMode,
    setExchangeMode,
    
    // Chain
    selectedChain,
    setSelectedChain,
    
    // Instant mode
    currencies,
    currenciesLoading,
    currenciesError,
    fromCurrency,
    toCurrency,
    setFromCurrency,
    setToCurrency,
    rateType,
    setRateType,
    
    // DEX mode
    fromDexToken,
    toDexToken,
    setFromDexToken,
    setToDexToken,
    slippage,
    setSlippage,
    
    // Form
    fromAmount,
    setFromAmount,
    deferredFromAmount,
    toAmount,
    setToAmount,
    
    // DEX data
    dexTokens,
    nativeToken,
    tokensLoading,
    dexQuote,
    dexOutputAmount,
    dexExchangeRate,
    quoteLoading,
    quoteError,
    quoteLastUpdated,
    refetchQuote,
    
    // Balance
    fromTokenBalance,
    balanceLoading,
    refetchBalance,
    hasInsufficientBalance,
    
    // USD values
    fromUsdValue,
    toUsdValue,
    fromTokenPrice,
    toTokenPrice,
    
    // Chain state
    isOnCorrectChain,
    priceImpact,
    isHighPriceImpact,
    
    // Favorites
    isPairFavorite,
    toggleFavorite,
    
    // Actions
    handleMaxClick,
    swapTokens,
    
    // Instant mode specific
    exchangeRate,
    setExchangeRate,
    minAmount,
    setMinAmount,
    rateId,
    setRateId,
    pairError,
    setPairError,
    pairUnavailable,
    setPairUnavailable,
    lastUpdated,
    setLastUpdated,
  };
}
