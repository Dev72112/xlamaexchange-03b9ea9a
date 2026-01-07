/**
 * Data-related providers: Price Oracle, Transactions
 */
import React, { ReactNode } from 'react';
import { PriceOracleProvider } from '@/contexts/PriceOracleContext';
import { DexTransactionProvider } from '@/contexts/DexTransactionContext';
import { BridgeTransactionProvider } from '@/contexts/BridgeTransactionContext';

interface DataProvidersProps {
  children: ReactNode;
}

export function DataProviders({ children }: DataProvidersProps) {
  return (
    <PriceOracleProvider>
      <DexTransactionProvider>
        <BridgeTransactionProvider>
          {children}
        </BridgeTransactionProvider>
      </DexTransactionProvider>
    </PriceOracleProvider>
  );
}
