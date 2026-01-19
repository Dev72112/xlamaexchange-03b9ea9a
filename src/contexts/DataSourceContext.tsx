import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type DataSource = 'zerion' | 'okx' | 'hybrid';

interface DataSourceContextValue {
  dataSource: DataSource;
  setDataSource: (source: DataSource) => void;
  isZerionEnabled: boolean;
  isOKXEnabled: boolean;
  preferredSource: DataSource;
  toggleDataSource: () => void;
}

const DataSourceContext = createContext<DataSourceContextValue | undefined>(undefined);

const DATA_SOURCE_KEY = 'xlama-data-source-preference';

interface DataSourceProviderProps {
  children: ReactNode;
}

export const DataSourceProvider: React.FC<DataSourceProviderProps> = ({ children }) => {
  const [dataSource, setDataSourceState] = useState<DataSource>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(DATA_SOURCE_KEY);
      if (stored && ['zerion', 'okx', 'hybrid'].includes(stored)) {
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
  }, []);

  const toggleDataSource = useCallback(() => {
    const sources: DataSource[] = ['zerion', 'okx', 'hybrid'];
    const currentIndex = sources.indexOf(dataSource);
    const nextIndex = (currentIndex + 1) % sources.length;
    setDataSource(sources[nextIndex]);
  }, [dataSource, setDataSource]);

  const value: DataSourceContextValue = {
    dataSource,
    setDataSource,
    isZerionEnabled: dataSource === 'zerion' || dataSource === 'hybrid',
    isOKXEnabled: dataSource === 'okx' || dataSource === 'hybrid',
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
