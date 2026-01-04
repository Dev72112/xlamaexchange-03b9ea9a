import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface TradePreFill {
  fromTokenAddress: string;
  fromTokenSymbol: string;
  toTokenAddress: string;
  toTokenSymbol: string;
  chainIndex: string;
  amount?: string;
  fromRebalance?: boolean;
}

export interface SelectedToken {
  chainIndex: string;
  tokenAddress: string;
  tokenSymbol: string;
}

interface TradePreFillContextType {
  preFill: TradePreFill | null;
  setPreFill: (preFill: TradePreFill | null) => void;
  clearPreFill: () => void;
  hasPreFill: boolean;
  // Bidirectional token sync between components
  selectedPredictionToken: SelectedToken | null;
  setSelectedPredictionToken: (token: SelectedToken | null) => void;
  selectedSwapToken: SelectedToken | null;
  setSelectedSwapToken: (token: SelectedToken | null) => void;
}

const TradePreFillContext = createContext<TradePreFillContextType | undefined>(undefined);

export function TradePreFillProvider({ children }: { children: ReactNode }) {
  const [preFill, setPreFillState] = useState<TradePreFill | null>(null);
  const [selectedPredictionToken, setSelectedPredictionTokenState] = useState<SelectedToken | null>(null);
  const [selectedSwapToken, setSelectedSwapTokenState] = useState<SelectedToken | null>(null);

  const setPreFill = useCallback((newPreFill: TradePreFill | null) => {
    setPreFillState(newPreFill);
    // Scroll to swap widget when pre-fill is set
    if (newPreFill) {
      setTimeout(() => {
        const swapWidget = document.getElementById('exchange-widget');
        if (swapWidget) {
          swapWidget.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, []);

  const clearPreFill = useCallback(() => {
    setPreFillState(null);
  }, []);

  const setSelectedPredictionToken = useCallback((token: SelectedToken | null) => {
    setSelectedPredictionTokenState(token);
  }, []);

  const setSelectedSwapToken = useCallback((token: SelectedToken | null) => {
    setSelectedSwapTokenState(token);
  }, []);

  return (
    <TradePreFillContext.Provider
      value={{
        preFill,
        setPreFill,
        clearPreFill,
        hasPreFill: preFill !== null,
        selectedPredictionToken,
        setSelectedPredictionToken,
        selectedSwapToken,
        setSelectedSwapToken,
      }}
    >
      {children}
    </TradePreFillContext.Provider>
  );
}

export function useTradePreFill() {
  const context = useContext(TradePreFillContext);
  if (!context) {
    throw new Error('useTradePreFill must be used within a TradePreFillProvider');
  }
  return context;
}
