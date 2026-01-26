import { memo, useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ChevronDown,
  ChevronUp,
  History,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Target,
  Download,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { useLimitOrders, LimitOrder } from '@/hooks/useLimitOrders';
import { useDCAOrders, DCAOrder } from '@/hooks/useDCAOrders';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { supabase } from '@/integrations/supabase/client';
import { SUPPORTED_CHAINS } from '@/data/chains';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'executed' | 'cancelled' | 'expired' | 'failed';

interface OrderExecutionHistoryProps {
  className?: string;
}

export const OrderExecutionHistory = memo(function OrderExecutionHistory({ className }: OrderExecutionHistoryProps) {
  const { activeAddress, isConnected } = useMultiWallet();
  const { orders: limitOrders, isLoading: limitLoading, refetch: refetchLimitOrders, exportToCSV: exportLimitCSV } = useLimitOrders();
  const { orders: dcaOrders, isLoading: dcaLoading, refetch: refetchDCAOrders, exportToCSV: exportDCACSV } = useDCAOrders();
  const [isOpen, setIsOpen] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Set up realtime subscription for order updates
  useEffect(() => {
    if (!activeAddress) return;

    const normalizedAddress = activeAddress.toLowerCase();

    // Subscribe to limit_orders changes
    const limitChannel = supabase
      .channel('limit_orders_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'limit_orders',
          filter: `user_address=eq.${normalizedAddress}`,
        },
        (payload) => {
          console.log('[OrderExecutionHistory] Limit order update:', payload);
          refetchLimitOrders();
        }
      )
      .subscribe();

    // Subscribe to dca_orders changes
    const dcaChannel = supabase
      .channel('dca_orders_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dca_orders',
          filter: `user_address=eq.${normalizedAddress}`,
        },
        (payload) => {
          console.log('[OrderExecutionHistory] DCA order update:', payload);
          refetchDCAOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(limitChannel);
      supabase.removeChannel(dcaChannel);
    };
  }, [activeAddress, refetchLimitOrders, refetchDCAOrders]);

  // Filter orders by status (non-active orders for history)
  const historyLimitOrders = useMemo(() => {
    return limitOrders.filter(o => {
      const isHistorical = ['executed', 'cancelled', 'expired', 'failed', 'dismissed'].includes(o.status);
      if (!isHistorical) return false;
      if (statusFilter === 'all') return true;
      if (statusFilter === 'executed') return o.status === 'executed';
      if (statusFilter === 'cancelled') return o.status === 'cancelled' || o.status === 'dismissed';
      if (statusFilter === 'expired') return o.status === 'expired';
      return true;
    });
  }, [limitOrders, statusFilter]);

  const historyDCAOrders = useMemo(() => {
    return dcaOrders.filter(o => {
      const isHistorical = ['completed', 'cancelled'].includes(o.status);
      if (!isHistorical) return false;
      if (statusFilter === 'all') return true;
      if (statusFilter === 'executed') return o.status === 'completed';
      if (statusFilter === 'cancelled') return o.status === 'cancelled';
      return true;
    });
  }, [dcaOrders, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'executed':
      case 'completed':
        return (
          <Badge variant="outline" className="border-success/50 text-success bg-success/10 text-xs">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Executed
          </Badge>
        );
      case 'triggered':
        return (
          <Badge variant="outline" className="border-warning/50 text-warning bg-warning/10 text-xs">
            <Target className="w-3 h-3 mr-1" />
            Triggered
          </Badge>
        );
      case 'cancelled':
      case 'dismissed':
        return (
          <Badge variant="outline" className="border-muted-foreground/50 text-muted-foreground text-xs">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="outline" className="border-muted-foreground/50 text-muted-foreground text-xs">
            <Clock className="w-3 h-3 mr-1" />
            Expired
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="border-destructive/50 text-destructive bg-destructive/10 text-xs">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            {status}
          </Badge>
        );
    }
  };

  const getChainInfo = (chainIndex: string) => {
    const chain = SUPPORTED_CHAINS.find(c => c.chainIndex === chainIndex);
    return chain;
  };

  const getExplorerUrl = (chainIndex: string, txHash: string) => {
    const chain = getChainInfo(chainIndex);
    if (!chain?.blockExplorer) return null;
    return `${chain.blockExplorer}/tx/${txHash}`;
  };

  const handleRefresh = () => {
    refetchLimitOrders();
    refetchDCAOrders();
  };

  const handleExportCSV = () => {
    exportLimitCSV();
    exportDCACSV();
  };

  const isLoading = limitLoading || dcaLoading;
  const hasHistory = historyLimitOrders.length > 0 || historyDCAOrders.length > 0;

  if (!isConnected) return null;

  return (
    <Card className={cn("glass border-border/50", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-secondary/30 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                Order Execution History
                {hasHistory && (
                  <Badge variant="secondary" className="text-xs">
                    {historyLimitOrders.length + historyDCAOrders.length}
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Controls */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <TabsList className="h-8">
                  <TabsTrigger value="all" className="text-xs px-2 h-6">All</TabsTrigger>
                  <TabsTrigger value="executed" className="text-xs px-2 h-6">Executed</TabsTrigger>
                  <TabsTrigger value="cancelled" className="text-xs px-2 h-6">Cancelled</TabsTrigger>
                  <TabsTrigger value="expired" className="text-xs px-2 h-6">Expired</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="h-7 text-xs"
                >
                  <RefreshCw className={cn("w-3 h-3 mr-1", isLoading && "animate-spin")} />
                  Refresh
                </Button>
                {hasHistory && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExportCSV}
                    className="h-7 text-xs"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Export
                  </Button>
                )}
              </div>
            </div>

            {/* Limit Orders History */}
            {historyLimitOrders.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Limit Orders</h4>
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs">Pair</TableHead>
                        <TableHead className="text-xs">Target</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs text-right">TX</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyLimitOrders.slice(0, 10).map((order) => {
                        const chain = getChainInfo(order.chain_index);
                        const explorerUrl = order.execution_tx_hash 
                          ? getExplorerUrl(order.chain_index, order.execution_tx_hash) 
                          : null;
                        
                        return (
                          <TableRow key={order.id} className="text-xs">
                            <TableCell className="py-2">
                              <div className="flex items-center gap-2">
                                {chain && (
                                  <img src={chain.icon} alt={chain.name} className="w-4 h-4 rounded-full" />
                                )}
                                <span className="font-medium">
                                  {order.from_token_symbol} → {order.to_token_symbol}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-2">
                              <span className="font-mono text-muted-foreground">
                                {order.condition === 'above' ? '≥' : '≤'} ${order.target_price.toFixed(4)}
                              </span>
                            </TableCell>
                            <TableCell className="py-2">
                              {getStatusBadge(order.status)}
                            </TableCell>
                            <TableCell className="py-2 text-muted-foreground">
                              {format(new Date(order.executed_at || order.created_at), 'MMM d, HH:mm')}
                            </TableCell>
                            <TableCell className="py-2 text-right">
                              {explorerUrl && (
                                <a
                                  href={explorerUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-primary hover:underline"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* DCA Orders History */}
            {historyDCAOrders.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">DCA Strategies</h4>
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs">Pair</TableHead>
                        <TableHead className="text-xs">Completed</TableHead>
                        <TableHead className="text-xs">Total Spent</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs text-right">Avg Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyDCAOrders.slice(0, 10).map((order) => {
                        const chain = getChainInfo(order.chain_index);
                        
                        return (
                          <TableRow key={order.id} className="text-xs">
                            <TableCell className="py-2">
                              <div className="flex items-center gap-2">
                                {chain && (
                                  <img src={chain.icon} alt={chain.name} className="w-4 h-4 rounded-full" />
                                )}
                                <span className="font-medium">
                                  {order.from_token_symbol} → {order.to_token_symbol}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-2">
                              <span className="font-mono">
                                {order.completed_intervals}/{order.total_intervals || '∞'}
                              </span>
                            </TableCell>
                            <TableCell className="py-2 font-mono text-muted-foreground">
                              {parseFloat(order.total_spent).toFixed(2)} {order.from_token_symbol}
                            </TableCell>
                            <TableCell className="py-2">
                              {getStatusBadge(order.status)}
                            </TableCell>
                            <TableCell className="py-2 text-right font-mono">
                              {order.average_price ? `$${order.average_price.toFixed(4)}` : '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!hasHistory && !isLoading && (
              <div className="text-center py-8">
                <History className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No order history yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Your executed, cancelled, and expired orders will appear here
                </p>
              </div>
            )}

            {/* Loading State */}
            {isLoading && !hasHistory && (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading order history...</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
});

export default OrderExecutionHistory;
