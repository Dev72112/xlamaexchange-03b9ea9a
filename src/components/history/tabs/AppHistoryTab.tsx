/**
 * App History Tab
 * Local transaction history from DEX, Bridge, and Instant exchange contexts
 */

import { memo, useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Clock,
  Trash2,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
  Layers,
  Zap,
  LayoutList,
} from 'lucide-react';
import { useTransactionHistory } from '@/shared/hooks';
import { useDexTransactions } from '@/contexts/DexTransactionContext';
import { useBridgeTransactions } from '@/contexts/BridgeTransactionContext';
import { UnifiedTransactionCard, UnifiedTransaction, InstantTabContent } from '@/components/history';
import { getChainByIndex, getExplorerTxUrl } from '@/data/chains';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const ITEMS_PER_PAGE = 20;

export const AppHistoryTab = memo(function AppHistoryTab() {
  const { transactions: instantTxs, removeTransaction, clearHistory } = useTransactionHistory();
  const { transactions: dexTxs, clearHistory: clearDexHistory } = useDexTransactions();
  const { transactions: bridgeTxs, removeTransaction: removeBridgeTx, clearHistory: clearBridgeHistory, pendingCount: bridgePendingCount } = useBridgeTransactions();

  const [activeSubTab, setActiveSubTab] = useState<'all' | 'instant' | 'dex' | 'bridge'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Helper to get bridge explorer URL
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

  // Build unified transaction feed
  const unifiedTransactions = useMemo((): UnifiedTransaction[] => {
    const unified: UnifiedTransaction[] = [];

    // Add instant transactions
    instantTxs.forEach(tx => {
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
    dexTxs.forEach(tx => {
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
    bridgeTxs.forEach(tx => {
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
  }, [instantTxs, dexTxs, bridgeTxs]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return unifiedTransactions.filter(tx => {
      // Type filter
      if (activeSubTab !== 'all' && tx.type !== activeSubTab) return false;
      
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
      
      return true;
    });
  }, [unifiedTransactions, activeSubTab, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredTransactions, currentPage]);

  // Reset page when filters change
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  const handleTabChange = useCallback((tab: string) => {
    setActiveSubTab(tab as 'all' | 'instant' | 'dex' | 'bridge');
    setCurrentPage(1);
  }, []);

  const totalCount = instantTxs.length + dexTxs.length + bridgeTxs.length;

  return (
    <div className="space-y-4">
      {/* Header & Search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by token or chain..."
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
        <Badge variant="secondary" className="text-xs">
          <LayoutList className="w-3 h-3 mr-1" />
          {totalCount} transactions
        </Badge>
      </div>

      {/* Sub-tabs for transaction types */}
      <Tabs value={activeSubTab} onValueChange={handleTabChange}>
        <TabsList className="w-full grid grid-cols-4 h-9">
          <TabsTrigger value="all" className="text-xs gap-1">
            <Clock className="w-3 h-3" />
            All
          </TabsTrigger>
          <TabsTrigger value="instant" className="text-xs gap-1">
            <Zap className="w-3 h-3" />
            Instant
            {instantTxs.length > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{instantTxs.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="dex" className="text-xs gap-1">
            <ArrowRightLeft className="w-3 h-3" />
            DEX
            {dexTxs.length > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{dexTxs.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="bridge" className="text-xs gap-1">
            <Layers className="w-3 h-3" />
            Bridge
            {bridgePendingCount > 0 && (
              <Badge variant="default" className="ml-1 h-4 px-1 text-[10px] animate-pulse">
                {bridgePendingCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Transaction List */}
      {paginatedTransactions.length > 0 ? (
        <div className="space-y-2">
          {paginatedTransactions.map((tx, index) => (
            <UnifiedTransactionCard
              key={tx.id}
              transaction={tx}
              index={index}
            />
          ))}
        </div>
      ) : (
        <Card className="glass border-border/50">
          <CardContent className="py-12 text-center">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Transactions</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'No transactions match your search.' : 'Your transaction history will appear here.'}
            </p>
          </CardContent>
        </Card>
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

      {/* Clear History */}
      {totalCount > 0 && (
        <div className="flex justify-center pt-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-destructive"
            onClick={() => {
              clearHistory();
              clearDexHistory();
              clearBridgeHistory();
            }}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear All History
          </Button>
        </div>
      )}
    </div>
  );
});

export default AppHistoryTab;
