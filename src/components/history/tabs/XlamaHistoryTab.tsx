/**
 * xLama History Tab
 * Uses local Supabase dex_transactions for reliable, fast history display
 * Includes filters and CSV export
 */

import { memo, useState, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Clock,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Search,
  X,
  LineChart,
  ChevronLeft,
  ChevronRight,
  Database,
} from 'lucide-react';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { useLocalDexHistory, convertLocalToXlamaFormat } from '@/hooks/useLocalDexHistory';
import { XlamaSyncStatus } from '@/components/XlamaSyncStatus';
import { TransactionFilters, FilterState } from '@/components/history/TransactionFilters';
import { exportTransactionsToCSV, ExportableTransaction } from '@/lib/tradeExport';
import { getChainByIndex } from '@/data/chains';
import { formatDistanceToNow, subDays, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';
import { TokenImage, ChainImage } from '@/components/ui/token-image';
import { toast } from 'sonner';

const ITEMS_PER_PAGE = 20;

const truncateHash = (hash: string) => {
  if (!hash || hash.length <= 16) return hash || '';
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
};

const formatAmount = (amount: string | number | undefined) => {
  if (amount === undefined) return '0';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0';
  if (num >= 1000) return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (num >= 1) return num.toFixed(4);
  return num.toFixed(6);
};

const defaultFilters: FilterState = {
  chain: 'all',
  token: 'all',
  dateRange: 'all',
  status: 'all',
  type: 'all',
};

export const XlamaHistoryTab = memo(function XlamaHistoryTab() {
  const { isConnected, activeAddress } = useMultiWallet();
  
  // Use local DB for reliable, fast data
  const { data: localTxs, isLoading, isError, refetch } = useLocalDexHistory({ 
    enabled: true,
    limit: 500,
  });

  // Convert local transactions to xLama format for UI compatibility
  const transactions = useMemo(() => 
    (localTxs ?? []).map(convertLocalToXlamaFormat),
    [localTxs]
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [isExporting, setIsExporting] = useState(false);

  // Extract unique chains and tokens for filter dropdowns
  const { chains, tokens } = useMemo(() => {
    const chainSet = new Set<string>();
    const tokenSet = new Set<string>();
    
    transactions.forEach(tx => {
      if (tx.chain_name) chainSet.add(tx.chain_name);
      if (tx.token_in?.symbol) tokenSet.add(tx.token_in.symbol);
      if (tx.token_out?.symbol) tokenSet.add(tx.token_out.symbol);
    });
    
    return {
      chains: Array.from(chainSet).sort(),
      tokens: Array.from(tokenSet).sort(),
    };
  }, [transactions]);

  // Apply filters
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = (
          tx.token_in?.symbol?.toLowerCase().includes(query) ||
          tx.token_out?.symbol?.toLowerCase().includes(query) ||
          tx.chain_name?.toLowerCase().includes(query) ||
          tx.tx_hash?.toLowerCase().includes(query)
        );
        if (!matchesSearch) return false;
      }

      // Chain filter
      if (filters.chain !== 'all' && tx.chain_name !== filters.chain) {
        return false;
      }

      // Token filter
      if (filters.token !== 'all') {
        if (tx.token_in?.symbol !== filters.token && tx.token_out?.symbol !== filters.token) {
          return false;
        }
      }

      // Date range filter
      if (filters.dateRange !== 'all') {
        const txDate = new Date(tx.timestamp);
        const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
        const days = daysMap[filters.dateRange];
        if (!isAfter(txDate, subDays(new Date(), days))) {
          return false;
        }
      }

      // Status filter
      if (filters.status !== 'all') {
        const status = tx.status as string;
        const isSuccess = status === 'success' || status === 'confirmed' || status === 'completed';
        const isFailed = status === 'failed' || status === 'fail';
        const isPending = !isSuccess && !isFailed;
        
        if (filters.status === 'success' && !isSuccess) return false;
        if (filters.status === 'failed' && !isFailed) return false;
        if (filters.status === 'pending' && !isPending) return false;
      }

      // Type filter
      if (filters.type !== 'all' && tx.transaction_type !== filters.type) {
        return false;
      }

      return true;
    });
  }, [transactions, searchQuery, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  }, []);

  const handleRefresh = useCallback(async () => {
    await refetch();
    toast.success('History refreshed');
  }, [refetch]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const exportData: ExportableTransaction[] = filteredTransactions.map(tx => ({
        timestamp: tx.timestamp,
        type: tx.transaction_type,
        fromAmount: String(tx.token_in?.amount || '0'),
        fromSymbol: tx.token_in?.symbol || '',
        toAmount: String(tx.token_out?.amount || '0'),
        toSymbol: tx.token_out?.symbol || '',
        chain: tx.chain_name || '',
        status: tx.status,
        usdValue: tx.value_usd,
        txHash: tx.tx_hash,
        explorerUrl: tx.explorer_url,
      }));
      
      exportTransactionsToCSV(exportData);
      toast.success(`Exported ${exportData.length} transactions`);
    } catch (error) {
      toast.error('Failed to export transactions');
    } finally {
      setIsExporting(false);
    }
  }, [filteredTransactions]);

  const getStatusBadge = (status: string) => {
    if (status === 'success' || status === 'confirmed' || status === 'completed') {
      return (
        <Badge variant="secondary" className="bg-success/20 text-success border-success/30 text-[10px]">
          <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
          Success
        </Badge>
      );
    }
    if (status === 'failed' || status === 'fail') {
      return (
        <Badge variant="secondary" className="bg-destructive/20 text-destructive border-destructive/30 text-[10px]">
          <AlertCircle className="w-2.5 h-2.5 mr-0.5" />
          Failed
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30 text-[10px]">
        <Loader2 className="w-2.5 h-2.5 mr-0.5 animate-spin" />
        Pending
      </Badge>
    );
  };

  if (!isConnected) {
    return (
      <Card className="glass border-border/50">
        <CardContent className="py-12 text-center">
          <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Connect Wallet</h3>
          <p className="text-sm text-muted-foreground">
            Connect your wallet to view unified transaction history.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sync Status & Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <XlamaSyncStatus />
          <Badge variant="outline" className="text-[10px] py-0.5 bg-muted/50 text-muted-foreground border-border/50">
            <Database className="w-2.5 h-2.5 mr-1" />
            Local Data
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading} className="h-8 gap-1.5">
          <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by token, chain, or hash..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9 h-9"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => handleSearch('')}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Filters & Export */}
      <TransactionFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        chains={chains}
        tokens={tokens}
        onExport={handleExport}
        isExporting={isExporting}
      />

      {/* Error state */}
      {isError && (
        <Card className="glass border-destructive/20">
          <CardContent className="py-8 text-center">
            <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
            <p className="text-sm text-destructive mb-4">Failed to load transaction history</p>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-3 h-3 mr-1" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isLoading && transactions.length === 0 && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="glass border-border/50 animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="flex-1">
                    <div className="h-4 w-32 bg-muted rounded mb-2" />
                    <div className="h-3 w-24 bg-muted rounded" />
                  </div>
                  <div className="h-6 w-16 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && paginatedTransactions.length === 0 && (
        <Card className="glass border-border/50">
          <CardContent className="py-12 text-center">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Transactions</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery || filters.chain !== 'all' || filters.status !== 'all' 
                ? 'No transactions match your filters.' 
                : 'Your transaction history will appear here after you make swaps.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Transaction list */}
      {paginatedTransactions.length > 0 && (
        <div className="space-y-3">
          {paginatedTransactions.map((tx, index) => {
            const chain = getChainByIndex(tx.chain_id);
            
            // Safely parse timestamp - handle invalid dates
            let timeAgo = 'Unknown';
            try {
              const timestampDate = new Date(tx.timestamp);
              // Check if date is valid
              if (!isNaN(timestampDate.getTime())) {
                timeAgo = formatDistanceToNow(timestampDate, { addSuffix: true });
              }
            } catch {
              // Keep default "Unknown"
            }

            return (
              <Card 
                key={`${tx.tx_hash}-${index}`} 
                className="glass border-border/50 hover-lift transition-all"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {/* From/To tokens */}
                    <div className="flex items-center gap-1">
                      <TokenImage 
                        src={tx.token_in?.logo} 
                        alt={tx.token_in?.symbol || ''} 
                        fallbackText={tx.token_in?.symbol || '??'}
                        className="w-8 h-8 rounded-full"
                      />
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <TokenImage 
                        src={tx.token_out?.logo} 
                        alt={tx.token_out?.symbol || ''} 
                        fallbackText={tx.token_out?.symbol || '??'}
                        className="w-8 h-8 rounded-full"
                      />
                    </div>

                    {/* Transaction details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {formatAmount(tx.token_in?.amount)} {tx.token_in?.symbol}
                          <span className="text-muted-foreground mx-1">→</span>
                          {formatAmount(tx.token_out?.amount)} {tx.token_out?.symbol}
                        </span>
                        {getStatusBadge(tx.status)}
                        <Badge variant="outline" className="text-[10px] py-0 bg-primary/10 text-primary border-primary/20">
                          <LineChart className="w-2 h-2 mr-0.5" />
                          xLama
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {chain && (
                          <span className="flex items-center gap-1">
                            <ChainImage 
                              src={chain.icon} 
                              alt={chain.shortName}
                              fallbackText={chain.shortName}
                              className="w-3 h-3"
                            />
                            {chain.shortName}
                          </span>
                        )}
                        <span>•</span>
                        <span>{timeAgo}</span>
                        <span>•</span>
                        <span className="capitalize">{tx.transaction_type}</span>
                        {tx.value_usd > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-green-500">${tx.value_usd.toFixed(2)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Explorer link */}
                    {tx.explorer_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        asChild
                      >
                        <a href={tx.explorer_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                  </div>

                  {/* Hash */}
                  <div className="mt-2 pt-2 border-t border-border/30 text-xs text-muted-foreground font-mono">
                    {truncateHash(tx.tx_hash)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Transaction count */}
      {transactions.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Showing {paginatedTransactions.length} of {filteredTransactions.length} transactions
          {filteredTransactions.length !== transactions.length && ` (${transactions.length} total)`}
        </p>
      )}
    </div>
  );
});

export default XlamaHistoryTab;
