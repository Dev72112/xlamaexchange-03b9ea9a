/**
 * Exchange-related providers: Mode, PreFill
 */
import React, { ReactNode } from 'react';
import { ExchangeModeProvider } from '@/contexts/ExchangeModeContext';
import { TradePreFillProvider } from '@/contexts/TradePreFillContext';

interface ExchangeProvidersProps {
  children: ReactNode;
}

export function ExchangeProviders({ children }: ExchangeProvidersProps) {
  return (
    <ExchangeModeProvider>
      <TradePreFillProvider>
        {children}
      </TradePreFillProvider>
    </ExchangeModeProvider>
  );
}
