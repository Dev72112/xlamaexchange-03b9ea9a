/**
 * Exchange-related providers: Mode, PreFill, UnifiedData
 */
import React, { ReactNode } from 'react';
import { ExchangeModeProvider } from '@/contexts/ExchangeModeContext';
import { TradePreFillProvider } from '@/contexts/TradePreFillContext';
import { UnifiedDataProvider } from '@/contexts/UnifiedDataContext';

interface ExchangeProvidersProps {
  children: ReactNode;
}

export function ExchangeProviders({ children }: ExchangeProvidersProps) {
  return (
    <ExchangeModeProvider>
      <UnifiedDataProvider>
        <TradePreFillProvider>
          {children}
        </TradePreFillProvider>
      </UnifiedDataProvider>
    </ExchangeModeProvider>
  );
}
