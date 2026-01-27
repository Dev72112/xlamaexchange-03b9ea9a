import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export type DataSource = 'zerion' | 'okx' | 'hybrid' | 'xlama';

interface DataSourceContextValue {
  dataSource: DataSource;
  setDataSource: (source: DataSource) => void;
  isZerionEnabled: boolean;
  isOKXEnabled: boolean;
  isXlamaEnabled: boolean;
  preferredSource: DataSource;
  toggleDataSource: () => void;
}

const DataSourceContext = createContext<DataSourceContextValue | undefined>(undefined);

const DATA_SOURCE_KEY = 'xlama-data-source-preference';

interface DataSourceProviderProps {
  children: ReactNode;
}

export const DataSourceProvider: React.FC<DataSourceProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();
  
  const [dataSource, setDataSourceState] = useState<DataSource>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(DATA_SOURCE_KEY);
      if (stored && ['zerion', 'okx', 'hybrid', 'xlama'].includes(stored)) {
        return stored as DataSource;
      }
    }
    return 'hybrid'; // Default to hybrid for best coverage
  });

  const setDataSource = useCallback((source: DataSource) => {
    setDataSourceState(source);
    if (typeof window !== 'undefined') {
      localStorage.setItem(DATA_SOURCE_KEY, source);
    }
    
    // Invalidate portfolio-related queries on mode change to force fresh data
    // This fixes the state desync issue where old data shows during transition
    queryClient.invalidateQueries({ queryKey: ['zerion'] });
    queryClient.invalidateQueries({ queryKey: ['okx-portfolio'] });
    queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    queryClient.invalidateQueries({ queryKey: ['hybrid-portfolio'] });
    queryClient.invalidateQueries({ queryKey: ['xlama-portfolio'] });
    queryClient.invalidateQueries({ queryKey: ['xlama-analytics'] });
    queryClient.invalidateQueries({ queryKey: ['xlama-transactions'] });
    console.log('[DataSource] Mode changed to:', source, '- invalidated portfolio queries');
  }, [queryClient]);

  const toggleDataSource = useCallback(() => {
    const sources: DataSource[] = ['zerion', 'okx', 'hybrid', 'xlama'];
    const currentIndex = sources.indexOf(dataSource);
    const nextIndex = (currentIndex + 1) % sources.length;
    setDataSource(sources[nextIndex]);
  }, [dataSource, setDataSource]);

  const value: DataSourceContextValue = {
    dataSource,
    setDataSource,
    isZerionEnabled: dataSource === 'zerion' || dataSource === 'hybrid',
    isOKXEnabled: dataSource === 'okx' || dataSource === 'hybrid',
    isXlamaEnabled: dataSource === 'xlama',
    preferredSource: dataSource === 'hybrid' ? 'zerion' : dataSource, // Prefer Zerion in hybrid mode
    toggleDataSource,
  };

  return (
    <DataSourceContext.Provider value={value}>
      {children}
    </DataSourceContext.Provider>
  );
};

export const useDataSource = (): DataSourceContextValue => {
  const context = useContext(DataSourceContext);
  if (!context) {
    throw new Error('useDataSource must be used within a DataSourceProvider');
  }
  return context;
};

export default DataSourceContext;
