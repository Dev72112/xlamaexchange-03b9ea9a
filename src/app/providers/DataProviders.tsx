/**
 * Data-related providers: Price Oracle, Transactions, Data Source
 * Note: UnifiedDataProvider is in ExchangeProviders (needs ExchangeModeContext)
 */
import React, { ReactNode } from 'react';
import { PriceOracleProvider } from '@/contexts/PriceOracleContext';
import { DexTransactionProvider } from '@/contexts/DexTransactionContext';
import { BridgeTransactionProvider } from '@/contexts/BridgeTransactionContext';
import { DataSourceProvider } from '@/contexts/DataSourceContext';

interface DataProvidersProps {
  children: ReactNode;
}

export function DataProviders({ children }: DataProvidersProps) {
  return (
    <DataSourceProvider>
      <PriceOracleProvider>
        <DexTransactionProvider>
          <BridgeTransactionProvider>
            {children}
          </BridgeTransactionProvider>
        </DexTransactionProvider>
      </PriceOracleProvider>
    </DataSourceProvider>
  );
}
