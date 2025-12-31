import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Chain, getPrimaryChain } from '@/data/chains';

export type ExchangeMode = 'instant' | 'dex';
export type SwapMode = 'swap' | 'bridge';

interface ExchangeModeContextType {
  mode: ExchangeMode;
  setMode: (mode: ExchangeMode) => void;
  swapMode: SwapMode;
  setSwapMode: (mode: SwapMode) => void;
  selectedChain: Chain;
  setSelectedChain: (chain: Chain) => void;
  isDexMode: boolean;
  isInstantMode: boolean;
}

const ExchangeModeContext = createContext<ExchangeModeContextType | undefined>(undefined);

interface ExchangeModeProviderProps {
  children: ReactNode;
}

export function ExchangeModeProvider({ children }: ExchangeModeProviderProps) {
  const [mode, setModeState] = useState<ExchangeMode>('instant');
  const [swapMode, setSwapMode] = useState<SwapMode>('swap');
  const [selectedChain, setSelectedChain] = useState<Chain>(getPrimaryChain());

  const setMode = useCallback((newMode: ExchangeMode) => {
    setModeState(newMode);
  }, []);

  const value: ExchangeModeContextType = {
    mode,
    setMode,
    swapMode,
    setSwapMode,
    selectedChain,
    setSelectedChain,
    isDexMode: mode === 'dex',
    isInstantMode: mode === 'instant',
  };

  return (
    <ExchangeModeContext.Provider value={value}>
      {children}
    </ExchangeModeContext.Provider>
  );
}

export function useExchangeMode() {
  const context = useContext(ExchangeModeContext);
  if (context === undefined) {
    throw new Error('useExchangeMode must be used within an ExchangeModeProvider');
  }
  return context;
}
