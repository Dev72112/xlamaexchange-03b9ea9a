import { useState, useEffect, useMemo, useCallback } from "react";
import { Layout } from "@/shared/components";
import { Helmet } from "react-helmet-async";
import { useTransactionHistory } from "@/shared/hooks";
import { useDexTransactions } from "@/contexts/DexTransactionContext";
import { useBridgeTransactions, BridgeStatus, BridgeTransaction } from "@/contexts/BridgeTransactionContext";
import { useBridgeStatusPolling } from "@/features/bridge";
import { useMultiWallet } from "@/contexts/MultiWalletContext";
import { useExchangeMode } from "@/contexts/ExchangeModeContext";
import { okxDexService, TransactionHistoryItem } from "@/services/okxdex";
import { Clock, ArrowRight, ExternalLink, Trash2, AlertCircle, CheckCircle2, Loader2, Wallet, Link2, RefreshCw, ArrowLeftRight, LayoutList, Search, Filter, X, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UnifiedChainSelector, ChainFilterValue } from "@/components/ui/UnifiedChainSelector";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, isAfter, isBefore, startOfDay, endOfDay, format } from "date-fns";
import { TransactionCardsSkeleton } from "@/components/ContentSkeletons";
import { getStaggerStyle, STAGGER_ITEM_CLASS } from "@/lib/staggerAnimation";
import { getEvmChains, getChainByIndex, getExplorerTxUrl } from "@/data/chains";

const ITEMS_PER_PAGE = 20;

// Unified transaction type for the timeline
type UnifiedTransaction = {
  id: string;
  type: 'instant' | 'dex' | 'bridge';
  timestamp: number;
  status: string;
  fromSymbol: string;
  toSymbol: string;
  fromAmount: string;
  toAmount: string;
  fromLogo?: string;
  toLogo?: string;
  chainName?: string;
  chainIcon?: string;
  explorerUrl?: string;
  bridgeFromChain?: string;
  bridgeToChain?: string;
  original: any;
};

const History = () => {
  const { transactions, removeTransaction, clearHistory } = useTransactionHistory();
  const { transactions: dexTransactions, clearHistory: clearDexHistory } = useDexTransactions();
  const { transactions: bridgeTransactions, removeTransaction: removeBridgeTx, clearHistory: clearBridgeHistory, pendingCount: bridgePendingCount } = useBridgeTransactions();
  const { pollTransaction } = useBridgeStatusPolling();
  const { 
    isConnected, 
    activeAddress,
    isOkxConnected,
    evmAddress,
    solanaAddress,
    tronAddress,
    suiAddress,
    tonAddress 
  } = useMultiWallet();
  const { globalChainFilter, setGlobalChainFilter } = useExchangeMode();
  const navigate = useNavigate();
  
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'instant' | 'dex' | 'bridge' | 'onchain'>('all');
  
  // Filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'instant' | 'dex' | 'bridge'>('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  
  // On-chain history state
  const [onchainHistory, setOnchainHistory] = useState<TransactionHistoryItem[]>([]);
  const [onchainLoading, setOnchainLoading] = useState(false);
  const [onchainError, setOnchainError] = useState<string | null>(null);

  // Brief loading state for perceived performance
  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // Fetch on-chain history when tab is selected and wallet is connected
  useEffect(() => {
    const fetchOnchainHistory = async () => {
      if (activeTab !== 'onchain' || !isConnected || !activeAddress) {
        return;
      }

      setOnchainLoading(true);
      setOnchainError(null);

      try {
        // Get top EVM chains for history
        const chains = getEvmChains().slice(0, 6).map(c => c.chainIndex).join(',');
        const result = await okxDexService.getTransactionHistory(activeAddress, chains, { limit: 20 });
        setOnchainHistory(result.transactions);
      } catch (err) {
        console.error('Failed to fetch on-chain history:', err);
        setOnchainError('Failed to load on-chain history');
        setOnchainHistory([]);
      } finally {
        setOnchainLoading(false);
      }
    };

    fetchOnchainHistory();
  }, [activeTab, isConnected, activeAddress]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
      case 'confirmed':
        return (
          <Badge variant="secondary" className="bg-success/20 text-success border-success/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case 'failed':
      case 'fail':
        return (
          <Badge variant="secondary" className="bg-destructive/20 text-destructive border-destructive/30">
            <AlertCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case 'bridging':
      case 'pending-source':
        return (
          <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Bridging
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Pending
          </Badge>
        );
    }
  };

  const getBridgeExplorerUrl = (chainId: number, txHash: string): string | null => {
    const explorerUrls: Record<number, string> = {
      1: 'https://etherscan.io/tx/',
      10: 'https://optimistic.etherscan.io/tx/',
      56: 'https://bscscan.com/tx/',
      137: 'https://polygonscan.com/tx/',
      42161: 'https://arbiscan.io/tx/',
      43114: 'https://snowtrace.io/tx/',
      8453: 'https://basescan.org/tx/',
      324: 'https://explorer.zksync.io/tx/',
      59144: 'https://lineascan.build/tx/',
    };
    const base = explorerUrls[chainId];
    return base ? `${base}${txHash}` : null;
  };

  const formatAmount = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '0';
    if (num >= 1000) return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (num >= 1) return num.toFixed(4);
    return num.toFixed(6);
  };

  const truncateHash = (hash: string) => {
    if (hash.length <= 16) return hash;
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
  };

  // Memoized sorted bridge transactions
  const sortedBridgeTransactions = useMemo(() => {
    return [...bridgeTransactions].sort((a, b) => b.startTime - a.startTime);
  }, [bridgeTransactions]);

  // Memoized DEX transactions sorted by timestamp
  const sortedDexTransactions = useMemo(() => {
    return [...dexTransactions].sort((a, b) => b.timestamp - a.timestamp);
  }, [dexTransactions]);

  // Unified transaction feed - merge all transaction types chronologically
  const unifiedTransactions = useMemo((): UnifiedTransaction[] => {
    const unified: UnifiedTransaction[] = [];

    // Add instant transactions
    transactions.forEach(tx => {
      unified.push({
        id: `instant-${tx.id}`,
        type: 'instant',
        timestamp: new Date(tx.createdAt).getTime(),
        status: tx.status,
        fromSymbol: tx.fromTicker,
        toSymbol: tx.toTicker,
        fromAmount: tx.fromAmount,
        toAmount: tx.toAmount,
        fromLogo: tx.fromImage,
        toLogo: tx.toImage,
        original: tx,
      });
    });

    // Add DEX transactions
    dexTransactions.forEach(tx => {
      const chain = getChainByIndex(tx.chainId);
      unified.push({
        id: `dex-${tx.id}`,
        type: 'dex',
        timestamp: tx.timestamp,
        status: tx.status,
        fromSymbol: tx.fromTokenSymbol,
        toSymbol: tx.toTokenSymbol,
        fromAmount: String(tx.fromTokenAmount),
        toAmount: String(tx.toTokenAmount),
        fromLogo: tx.fromTokenLogo,
        toLogo: tx.toTokenLogo,
        chainName: chain?.shortName,
        chainIcon: chain?.icon,
        explorerUrl: tx.explorerUrl || (tx.hash ? getExplorerTxUrl(tx.chainId, tx.hash) : undefined),
        original: tx,
      });
    });

    // Add bridge transactions
    bridgeTransactions.forEach(tx => {
      const sourceExplorerUrl = tx.sourceTxHash && tx.fromChain?.chainId 
        ? getBridgeExplorerUrl(tx.fromChain.chainId, tx.sourceTxHash) 
        : null;
      unified.push({
        id: `bridge-${tx.id}`,
        type: 'bridge',
        timestamp: tx.startTime,
        status: tx.status,
        fromSymbol: tx.fromToken?.symbol || '',
        toSymbol: tx.toToken?.symbol || '',
        fromAmount: tx.fromAmount,
        toAmount: tx.toAmount,
        fromLogo: tx.fromToken?.logoURI,
        toLogo: tx.toToken?.logoURI,
        bridgeFromChain: tx.fromChain?.name,
        bridgeToChain: tx.toChain?.name,
        explorerUrl: sourceExplorerUrl || undefined,
        original: tx,
      });
    });

    // Sort by timestamp (newest first)
    return unified.sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions, dexTransactions, bridgeTransactions]);

  // Filtered transactions based on search, type filters, and chain filter
  const filteredTransactions = useMemo(() => {
    const chainFilterValue = globalChainFilter === 'all-evm' ? 'all' : globalChainFilter;
    
    return unifiedTransactions.filter(tx => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSymbol = tx.fromSymbol.toLowerCase().includes(query) || 
                              tx.toSymbol.toLowerCase().includes(query);
        const matchesChain = tx.chainName?.toLowerCase().includes(query) ||
                             tx.bridgeFromChain?.toLowerCase().includes(query) ||
                             tx.bridgeToChain?.toLowerCase().includes(query);
        if (!matchesSymbol && !matchesChain) return false;
      }
      
      // Type filter
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      
      // Chain filter (for DEX transactions)
      if (chainFilterValue !== 'all' && tx.type === 'dex') {
        const dexTx = tx.original;
        if (dexTx?.chainId !== chainFilterValue) return false;
      }
      
      // Date range filter
      if (dateRange.from && isBefore(tx.timestamp, startOfDay(dateRange.from))) return false;
      if (dateRange.to && isAfter(tx.timestamp, endOfDay(dateRange.to))) return false;
      
      return true;
    });
  }, [unifiedTransactions, searchQuery, typeFilter, dateRange, globalChainFilter]);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setTypeFilter('all');
    setDateRange({});
    setGlobalChainFilter('all');
    setCurrentPage(1);
  }, [setGlobalChainFilter]);

  const hasActiveFilters = searchQuery || typeFilter !== 'all' || dateRange.from || dateRange.to || globalChainFilter !== 'all';

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, dateRange, globalChainFilter]);

  // Pagination for filtered transactions
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredTransactions, currentPage]);

  const totalTransactionCount = transactions.length + dexTransactions.length + bridgeTransactions.length;

  return (
    <Layout>
      <Helmet>
        <title>Transaction History - xlama</title>
        <meta name="description" content="View your cryptocurrency exchange transaction history." />
      </Helmet>

      <div className="container px-4 py-12 sm:py-16 max-w-4xl">
        {/* Header */}
        <div className="mb-10 flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-primary/10">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold">Transaction History</h1>
            </div>
            <p className="text-muted-foreground">
              Your cryptocurrency exchanges and on-chain transactions.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 h-auto p-1">
            <TabsTrigger value="all" className="gap-1 sm:gap-2 min-h-[44px] px-2 sm:px-3 flex-col sm:flex-row">
              <LayoutList className="w-4 h-4" />
              <span className="text-[10px] sm:text-sm">All</span>
              {totalTransactionCount > 0 && (
                <Badge variant="secondary" className="hidden sm:flex h-5 px-1.5 text-xs">
                  {totalTransactionCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="instant" className="gap-1 sm:gap-2 min-h-[44px] px-2 sm:px-3 flex-col sm:flex-row">
              <ArrowRight className="w-4 h-4" />
              <span className="text-[10px] sm:text-sm">Instant</span>
              {transactions.length > 0 && (
                <Badge variant="secondary" className="hidden sm:flex h-5 px-1.5 text-xs">
                  {transactions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="dex" className="gap-1 sm:gap-2 min-h-[44px] px-2 sm:px-3 flex-col sm:flex-row">
              <Link2 className="w-4 h-4" />
              <span className="text-[10px] sm:text-sm">DEX</span>
              {dexTransactions.length > 0 && (
                <Badge variant="secondary" className="hidden sm:flex h-5 px-1.5 text-xs">
                  {dexTransactions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="bridge" className="gap-1 sm:gap-2 min-h-[44px] px-2 sm:px-3 flex-col sm:flex-row relative">
              <ArrowLeftRight className="w-4 h-4" />
              <span className="text-[10px] sm:text-sm">Bridge</span>
              {bridgeTransactions.length > 0 && (
                <Badge variant="secondary" className="hidden sm:flex h-5 px-1.5 text-xs">
                  {bridgeTransactions.length}
                </Badge>
              )}
              {bridgePendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
              )}
            </TabsTrigger>
            <TabsTrigger value="onchain" className="gap-1 sm:gap-2 min-h-[44px] px-2 sm:px-3 flex-col sm:flex-row">
              <Wallet className="w-4 h-4" />
              <span className="text-[10px] sm:text-sm">Chain</span>
            </TabsTrigger>
          </TabsList>

          {/* Unified Timeline Tab */}
          <TabsContent value="all" className="space-y-4">
            {/* Search and Filters */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by token or chain..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setSearchQuery('')}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                <Button
                  variant={showFilters ? "secondary" : "outline"}
                  size="icon"
                  onClick={() => setShowFilters(!showFilters)}
                  className="shrink-0"
                >
                  <Filter className="w-4 h-4" />
                </Button>
              </div>
              
              {showFilters && (
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 p-3 rounded-lg bg-secondary/30 border border-border">
                  {/* Chain Filter */}
                  <UnifiedChainSelector
                    value={globalChainFilter}
                    onChange={(value) => setGlobalChainFilter(value)}
                    showAllOption={true}
                    compact={true}
                    triggerClassName="w-full sm:w-auto min-h-[44px]"
                  />
                  
                  <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
                    <SelectTrigger className="w-full sm:w-[130px] min-h-[44px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="instant">Instant</SelectItem>
                      <SelectItem value="dex">DEX</SelectItem>
                      <SelectItem value="bridge">Bridge</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="gap-2 min-h-[44px] w-full sm:w-auto justify-start sm:justify-center">
                        <Calendar className="w-4 h-4" />
                        {dateRange.from ? (
                          dateRange.to ? (
                            `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')}`
                          ) : (
                            format(dateRange.from, 'MMM d, yyyy')
                          )
                        ) : (
                          'Date Range'
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="range"
                        selected={{ from: dateRange.from, to: dateRange.to }}
                        onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                        numberOfMonths={1}
                      />
                    </PopoverContent>
                  </Popover>
                  
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                      Clear filters
                    </Button>
                  )}
                </div>
              )}
              
              {hasActiveFilters && (
                <p className="text-sm text-muted-foreground">
                  Showing {paginatedTransactions.length} of {filteredTransactions.length} transactions
                  {filteredTransactions.length !== unifiedTransactions.length && ` (filtered from ${unifiedTransactions.length})`}
                </p>
              )}
            </div>

            {unifiedTransactions.length === 0 ? (
              <Card className="p-12 text-center border-dashed">
                <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Your transaction history across all platforms will appear here.
                </p>
                <Button onClick={() => navigate('/')}>
                  Start Trading
                </Button>
              </Card>
            ) : filteredTransactions.length === 0 ? (
              <Card className="p-12 text-center border-dashed">
                <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-lg font-semibold mb-2">No matching transactions</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Try adjusting your search or filters.
                </p>
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </Card>
            ) : (
              <>
                <div className="grid gap-3">
                  {paginatedTransactions.map((tx, i) => (
                    <Card
                      key={tx.id}
                      className={cn("p-4 sm:p-5 hover:border-primary/30 transition-all group", STAGGER_ITEM_CLASS)}
                      style={getStaggerStyle(i, 60)}
                    >
                      <div className="flex items-center gap-4">
                        {/* Token/Chain icons */}
                        <div className="flex items-center shrink-0">
                          <div className="relative">
                            {tx.fromLogo ? (
                              <img
                                src={tx.fromLogo}
                                alt={tx.fromSymbol}
                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-background"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${tx.fromSymbol}&background=random`;
                                }}
                              />
                            ) : (
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-xs font-bold">
                                {tx.fromSymbol?.slice(0, 2)}
                              </div>
                            )}
                          </div>
                          <div className="relative -ml-3">
                            {tx.toLogo ? (
                              <img
                                src={tx.toLogo}
                                alt={tx.toSymbol}
                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-background"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${tx.toSymbol}&background=random`;
                                }}
                              />
                            ) : (
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-xs font-bold">
                                {tx.toSymbol?.slice(0, 2)}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium">
                              {formatAmount(tx.fromAmount)}{" "}
                              <span className="uppercase text-muted-foreground">{tx.fromSymbol}</span>
                            </span>
                            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="font-medium">
                              {formatAmount(tx.toAmount)}{" "}
                              <span className="uppercase text-muted-foreground">{tx.toSymbol}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "h-5 text-xs",
                                tx.type === 'instant' && "border-blue-500/30 text-blue-500",
                                tx.type === 'dex' && "border-green-500/30 text-green-500",
                                tx.type === 'bridge' && "border-purple-500/30 text-purple-500"
                              )}
                            >
                              {tx.type === 'instant' && 'Instant'}
                              {tx.type === 'dex' && 'DEX'}
                              {tx.type === 'bridge' && 'Bridge'}
                            </Badge>
                            {tx.type === 'bridge' && tx.bridgeFromChain && tx.bridgeToChain && (
                              <Badge variant="secondary" className="h-5 text-xs">
                                {tx.bridgeFromChain} → {tx.bridgeToChain}
                              </Badge>
                            )}
                            {tx.chainName && tx.chainIcon && (
                              <Badge variant="outline" className="h-5 text-xs gap-1">
                                <img src={tx.chainIcon} alt={tx.chainName} className="w-3 h-3 rounded-full" />
                                {tx.chainName}
                              </Badge>
                            )}
                            <span>•</span>
                            <span>{formatDistanceToNow(tx.timestamp, { addSuffix: true })}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {getStatusBadge(tx.status)}
                          {tx.explorerUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => window.open(tx.explorerUrl, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-border mt-4 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="gap-1 min-h-[44px] px-3"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden sm:inline">Previous</span>
                    </Button>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="gap-1 min-h-[44px] px-3"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Instant Transactions Tab */}
          <TabsContent value="instant" className="space-y-4">
            {transactions.length > 0 && (
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    if (confirm('Are you sure you want to clear all instant transaction history?')) {
                      clearHistory();
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              </div>
            )}
            
            {isInitialLoading ? (
              <TransactionCardsSkeleton count={3} />
            ) : transactions.length === 0 ? (
              <Card className="p-12 text-center border-dashed">
                <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-lg font-semibold mb-2">No instant exchanges yet</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Your completed instant exchanges will appear here.
                </p>
                <Button onClick={() => navigate('/')}>
                  Start Exchange
                </Button>
              </Card>
            ) : (
              <div className="grid gap-3">
                {transactions.map((tx, i) => (
                  <Card
                    key={tx.id}
                    className={cn("p-4 sm:p-5 hover:border-primary/30 transition-all group", STAGGER_ITEM_CLASS)}
                    style={getStaggerStyle(i, 60)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center shrink-0">
                        <div className="relative">
                          <img
                            src={tx.fromImage}
                            alt={tx.fromName}
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-background"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${tx.fromTicker}&background=random`;
                            }}
                          />
                        </div>
                        <div className="relative -ml-3">
                          <img
                            src={tx.toImage}
                            alt={tx.toName}
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-background"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${tx.toTicker}&background=random`;
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium">
                            {tx.fromAmount}{" "}
                            <span className="uppercase text-muted-foreground">{tx.fromTicker}</span>
                          </span>
                          <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="font-medium">
                            {parseFloat(tx.toAmount).toFixed(6)}{" "}
                            <span className="uppercase text-muted-foreground">{tx.toTicker}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-mono text-xs truncate max-w-[100px]">{tx.id}</span>
                          <span>•</span>
                          <span>{formatDistanceToNow(tx.createdAt, { addSuffix: true })}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {getStatusBadge(tx.status)}
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-9 w-9 text-muted-foreground hover:text-destructive",
                            "opacity-0 group-hover:opacity-100 transition-opacity"
                          )}
                          onClick={() => removeTransaction(tx.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* DEX Transactions Tab */}
          <TabsContent value="dex" className="space-y-4">
            {dexTransactions.length > 0 && (
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    if (confirm('Are you sure you want to clear all DEX transaction history?')) {
                      clearDexHistory();
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              </div>
            )}
            
            {sortedDexTransactions.length === 0 ? (
              <Card className="p-12 text-center border-dashed">
                <Link2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-lg font-semibold mb-2">No DEX swaps yet</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Your on-chain DEX swaps will appear here. Switch to DEX mode to get started.
                </p>
                <Button onClick={() => navigate('/')}>
                  Start Swap
                </Button>
              </Card>
            ) : (
              <div className="grid gap-3">
                {sortedDexTransactions.map((tx, i) => {
                  const chain = getChainByIndex(tx.chainId);
                  const explorerUrl = tx.explorerUrl || (tx.hash ? getExplorerTxUrl(tx.chainId, tx.hash) : null);
                  
                  return (
                    <Card
                      key={tx.id}
                      className={cn("p-4 sm:p-5 hover:border-primary/30 transition-all group", STAGGER_ITEM_CLASS)}
                      style={getStaggerStyle(i, 60)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center shrink-0">
                          <div className="relative">
                            {tx.fromTokenLogo ? (
                              <img
                                src={tx.fromTokenLogo}
                                alt={tx.fromTokenSymbol}
                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-background"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${tx.fromTokenSymbol}&background=random`;
                                }}
                              />
                            ) : (
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-xs font-bold">
                                {tx.fromTokenSymbol?.slice(0, 2)}
                              </div>
                            )}
                          </div>
                          <div className="relative -ml-3">
                            {tx.toTokenLogo ? (
                              <img
                                src={tx.toTokenLogo}
                                alt={tx.toTokenSymbol}
                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-background"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${tx.toTokenSymbol}&background=random`;
                                }}
                              />
                            ) : (
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-xs font-bold">
                                {tx.toTokenSymbol?.slice(0, 2)}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium">
                              {formatAmount(tx.fromTokenAmount)}{" "}
                              <span className="uppercase text-muted-foreground">{tx.fromTokenSymbol}</span>
                            </span>
                            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="font-medium">
                              {formatAmount(tx.toTokenAmount)}{" "}
                              <span className="uppercase text-muted-foreground">{tx.toTokenSymbol}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                            {chain && (
                              <Badge variant="outline" className="h-5 text-xs gap-1">
                                <img src={chain.icon} alt={chain.name} className="w-3 h-3 rounded-full" />
                                {chain.shortName}
                              </Badge>
                            )}
                            {tx.hash && (
                              <>
                                <span className="font-mono text-xs truncate max-w-[80px]">{truncateHash(tx.hash)}</span>
                                <span>•</span>
                              </>
                            )}
                            <span>{formatDistanceToNow(tx.timestamp, { addSuffix: true })}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {getStatusBadge(tx.status)}
                          {explorerUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => window.open(explorerUrl, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Bridge Transactions Tab */}
          <TabsContent value="bridge" className="space-y-4">
            {bridgeTransactions.length > 0 && (
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    sortedBridgeTransactions
                      .filter(tx => tx.status === 'bridging' || tx.status === 'pending-source')
                      .forEach(tx => pollTransaction(tx));
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Status
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    if (confirm('Are you sure you want to clear completed bridge transactions?')) {
                      clearBridgeHistory();
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear History
                </Button>
              </div>
            )}
            
            {sortedBridgeTransactions.length === 0 ? (
              <Card className="p-12 text-center border-dashed">
                <ArrowLeftRight className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-lg font-semibold mb-2">No bridge transactions yet</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Your cross-chain bridge transactions will appear here.
                </p>
                <Button onClick={() => navigate('/bridge')}>
                  Start Bridging
                </Button>
              </Card>
            ) : (
              <div className="grid gap-3">
                {sortedBridgeTransactions.map((tx, i) => {
                  const sourceExplorerUrl = tx.sourceTxHash && tx.fromChain?.chainId 
                    ? getBridgeExplorerUrl(tx.fromChain.chainId, tx.sourceTxHash) 
                    : null;
                  const destExplorerUrl = tx.destTxHash && tx.toChain?.chainId 
                    ? getBridgeExplorerUrl(tx.toChain.chainId, tx.destTxHash) 
                    : null;
                  
                  return (
                    <Card
                      key={tx.id}
                      className={cn("p-4 sm:p-5 hover:border-primary/30 transition-all group", STAGGER_ITEM_CLASS)}
                      style={getStaggerStyle(i, 60)}
                    >
                      <div className="flex items-center gap-4">
                        {/* Chain icons */}
                        <div className="flex items-center shrink-0">
                          <div className="relative">
                            {tx.fromChain?.icon ? (
                              <img
                                src={tx.fromChain.icon}
                                alt={tx.fromChain.name}
                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-background"
                              />
                            ) : (
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-xs font-bold">
                                {tx.fromChain?.name?.slice(0, 2) || '?'}
                              </div>
                            )}
                          </div>
                          <div className="relative -ml-3">
                            {tx.toChain?.icon ? (
                              <img
                                src={tx.toChain.icon}
                                alt={tx.toChain.name}
                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-background"
                              />
                            ) : (
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-xs font-bold">
                                {tx.toChain?.name?.slice(0, 2) || '?'}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium">
                              {formatAmount(tx.fromAmount)}{" "}
                              <span className="uppercase text-muted-foreground">{tx.fromToken?.symbol}</span>
                            </span>
                            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="font-medium">
                              {formatAmount(tx.toAmount)}{" "}
                              <span className="uppercase text-muted-foreground">{tx.toToken?.symbol}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                            <Badge variant="outline" className="h-5 text-xs">
                              {tx.fromChain?.name} → {tx.toChain?.name}
                            </Badge>
                            {tx.bridgeName && (
                              <Badge variant="secondary" className="h-5 text-xs">
                                {tx.bridgeName}
                              </Badge>
                            )}
                            <span>•</span>
                            <span>{formatDistanceToNow(tx.startTime, { addSuffix: true })}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {getStatusBadge(tx.status)}
                          {sourceExplorerUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
                              title="View source transaction"
                              onClick={() => window.open(sourceExplorerUrl, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          )}
                          {destExplorerUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
                              title="View destination transaction"
                              onClick={() => window.open(destExplorerUrl, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4 text-success" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-9 w-9 text-muted-foreground hover:text-destructive",
                              "opacity-0 group-hover:opacity-100 transition-opacity"
                            )}
                            onClick={() => removeBridgeTx(tx.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* On-Chain History Tab (from OKX v6 API) */}
          <TabsContent value="onchain" className="space-y-4">
            {!isConnected ? (
              <Card className="p-12 text-center border-dashed">
                <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-lg font-semibold mb-2">Connect wallet to view history</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Connect your wallet to see your on-chain transaction history across multiple networks.
                </p>
              </Card>
            ) : onchainLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="p-4 sm:p-5">
                    <div className="flex items-center gap-4">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="w-48 h-4" />
                        <Skeleton className="w-32 h-3" />
                      </div>
                      <Skeleton className="w-20 h-6" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : onchainError ? (
              <Card className="p-12 text-center border-dashed">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive/30" />
                <h3 className="text-lg font-semibold mb-2">Failed to load history</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  {onchainError}
                </p>
                <Button variant="outline" onClick={() => setActiveTab('onchain')}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </Card>
            ) : onchainHistory.length === 0 ? (
              <Card className="p-12 text-center border-dashed">
                <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-lg font-semibold mb-2">No on-chain transactions found</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  No recent transactions found for this wallet across supported networks.
                </p>
              </Card>
            ) : (
              <div className="grid gap-3">
                {onchainHistory.map((tx, i) => {
                  const chain = getChainByIndex(tx.chainIndex);
                  const explorerUrl = tx.txHash ? getExplorerTxUrl(tx.chainIndex, tx.txHash) : null;
                  const fromAddr = tx.from[0]?.address || '';
                  const isSent = fromAddr.toLowerCase() === activeAddress?.toLowerCase();
                  
                  return (
                    <Card
                      key={`${tx.txHash}-${i}`}
                      className={cn("p-4 sm:p-5 hover:border-primary/30 transition-all group", STAGGER_ITEM_CLASS)}
                      style={getStaggerStyle(i, 60)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0",
                          isSent ? "bg-destructive/10" : "bg-success/10"
                        )}>
                          <ArrowRight className={cn(
                            "w-5 h-5",
                            isSent ? "text-destructive rotate-45" : "text-success -rotate-45"
                          )} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium">
                              {isSent ? 'Sent' : 'Received'}{" "}
                              {tx.amount && (
                                <>
                                  {formatAmount(tx.amount)}{" "}
                                  <span className="uppercase text-muted-foreground">{tx.symbol || 'ETH'}</span>
                                </>
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                            {chain && (
                              <Badge variant="outline" className="h-5 text-xs gap-1">
                                <img src={chain.icon} alt={chain.name} className="w-3 h-3 rounded-full" />
                                {chain.shortName}
                              </Badge>
                            )}
                            <span className="font-mono text-xs truncate max-w-[80px]">{truncateHash(tx.txHash)}</span>
                            <span>•</span>
                            <span>{formatDistanceToNow(parseInt(tx.txTime), { addSuffix: true })}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {getStatusBadge(tx.txStatus)}
                          {explorerUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => window.open(explorerUrl, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Summary */}
        {(transactions.length > 0 || dexTransactions.length > 0 || bridgeTransactions.length > 0) && (
          <div className="mt-8 p-4 rounded-xl bg-secondary/30 border border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total transactions</span>
              <span className="font-medium">{transactions.length + dexTransactions.length + bridgeTransactions.length}</span>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default History;
