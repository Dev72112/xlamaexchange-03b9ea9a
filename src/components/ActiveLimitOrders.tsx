import { useState } from 'react';
import { Target, X, Clock, Check, AlertCircle, ChevronDown, ChevronUp, ExternalLink, Download, Bell, BellOff, XCircle, Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLimitOrders, type LimitOrder } from '@/features/orders';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { LimitOrderCountdown } from '@/components/LimitOrderCountdown';
import { cn } from '@/shared/lib';
import xlamaMascot from '@/assets/xlama-mascot.png';
import type { JupiterOpenOrder } from '@/services/jupiter';
import { SUPPORTED_CHAINS, getChainIcon } from '@/data/chains';

interface ActiveLimitOrdersProps {
  className?: string;
  onExecuteOrder?: (order: LimitOrder) => void;
}

// Format large amounts to prevent overflow
const formatAmount = (amount: string | number, maxDecimals = 6): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
  if (num < 0.000001) return '< 0.000001';
  return num.toLocaleString(undefined, { maximumFractionDigits: maxDecimals });
};

// Convert Jupiter order amounts from smallest units
const formatJupiterAmount = (amount: string, decimals = 9): string => {
  const num = parseFloat(amount) / Math.pow(10, decimals);
  return formatAmount(num);
};

export function ActiveLimitOrders({ className, onExecuteOrder }: ActiveLimitOrdersProps) {
  const { isConnected, activeChainType } = useMultiWallet();
  const { 
    orders, 
    activeOrders, 
    jupiterOrders,
    cancelOrder, 
    cancelJupiterOrder,
    dismissOrder, 
    isLoading, 
    isSigning,
    exportToCSV, 
    notificationPermission, 
    requestNotificationPermission 
  } = useLimitOrders();
  const [isOpen, setIsOpen] = useState(false);

  // Determine if we're on Solana
  const isSolana = activeChainType === 'solana';

  // Count total orders including Jupiter on-chain orders
  const totalActiveCount = activeOrders.length + (isSolana ? jupiterOrders.length : 0);
  const totalOrdersCount = orders.length + (isSolana ? jupiterOrders.length : 0);

  if (!isConnected || totalOrdersCount === 0) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: LimitOrder['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="secondary" className="gap-1 text-[10px] shrink-0"><Clock className="w-2.5 h-2.5" />Monitoring</Badge>;
      case 'triggered':
        return <Badge className="gap-1 bg-success text-success-foreground text-[10px] shrink-0"><Check className="w-2.5 h-2.5" />Triggered</Badge>;
      case 'executed':
        return <Badge className="gap-1 bg-primary text-primary-foreground text-[10px] shrink-0"><Check className="w-2.5 h-2.5" />Executed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="gap-1 text-[10px] shrink-0"><X className="w-2.5 h-2.5" />Cancelled</Badge>;
      case 'expired':
        return <Badge variant="outline" className="gap-1 text-[10px] shrink-0"><AlertCircle className="w-2.5 h-2.5" />Expired</Badge>;
      default:
        return null;
    }
  };

  // Get chain info helper
  const getChainInfo = (chainIndex: string) => {
    const chain = SUPPORTED_CHAINS.find(c => c.chainIndex === chainIndex);
    return chain ? { icon: getChainIcon(chain), name: chain.name } : null;
  };

  // Solana chain info for Jupiter orders
  const solanaChain = SUPPORTED_CHAINS.find(c => c.chainIndex === '501');
  const solanaIcon = solanaChain ? getChainIcon(solanaChain) : null;

  // Render Jupiter on-chain order card
  const renderJupiterOrderCard = (order: JupiterOpenOrder) => {
    const remainingPercent = order.remainingMakingAmount && order.makingAmount 
      ? (parseFloat(order.remainingMakingAmount) / parseFloat(order.makingAmount) * 100).toFixed(0)
      : '100';
    const isPartiallyFilled = remainingPercent !== '100';

    return (
      <div 
        key={order.order}
        className="p-2.5 sm:p-3 rounded-lg border bg-primary/5 border-primary/20 overflow-hidden"
      >
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              {/* Solana chain icon */}
              {solanaIcon && (
                <img src={solanaIcon} alt="Solana" className="w-4 h-4 rounded-full shrink-0" />
              )}
              <span className="font-medium text-xs sm:text-sm truncate">
                {order.inputMint.slice(0, 4)}...{order.inputMint.slice(-4)} → {order.outputMint.slice(0, 4)}...{order.outputMint.slice(-4)}
              </span>
              <Badge className="gap-1 bg-primary/20 text-primary text-[10px] shrink-0">
                <Zap className="w-2.5 h-2.5" />Jupiter
              </Badge>
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground space-y-0.5">
              <p className="truncate">Making: {formatJupiterAmount(order.makingAmount)}</p>
              <p className="truncate">For: {formatJupiterAmount(order.takingAmount)}</p>
              {isPartiallyFilled && (
                <p className="text-warning truncate">Filled: {100 - parseFloat(remainingPercent)}%</p>
              )}
              {order.expiredAt && (
                <p className="truncate">Expires: {formatDate(new Date(order.expiredAt * 1000).toISOString())}</p>
              )}
            </div>
          </div>
          
          <div className="flex flex-col gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => cancelJupiterOrder(order.order)}
              disabled={isSigning}
            >
              {isSigning ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <X className="w-3 h-3 mr-1" />
                  Cancel
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={cn("bg-card border-border sweep-effect shadow-premium-hover performance-critical overflow-hidden", className)}>
        <CollapsibleTrigger asChild>
          <button className="w-full text-left">
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 min-w-0">
                  <Target className="w-4 h-4 shrink-0" />
                  <span className="truncate">Limit Orders</span>
                  {totalActiveCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 shrink-0">
                      {totalActiveCount}
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex items-center gap-1 shrink-0">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (notificationPermission === 'default') {
                              requestNotificationPermission();
                            }
                          }}
                        >
                          {notificationPermission === 'granted' ? (
                            <Bell className="w-3.5 h-3.5 text-success" />
                          ) : (
                            <BellOff className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {notificationPermission === 'granted' 
                          ? 'Push notifications enabled' 
                          : 'Enable push notifications'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            exportToCSV();
                          }}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Export to CSV</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 pb-3">
            <ScrollArea className="h-[350px] pr-2">
              <div className="space-y-2">
                {/* Jupiter On-Chain Orders Section (Solana only) */}
                {isSolana && jupiterOrders.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                      <Zap className="w-3 h-3 text-primary" />
                      <span>Jupiter On-Chain ({jupiterOrders.length})</span>
                    </div>
                    {jupiterOrders.map(renderJupiterOrderCard)}
                  </div>
                )}

                {/* Database Monitored Orders */}
                {orders.length > 0 && (
                  <div className="space-y-2">
                    {isSolana && jupiterOrders.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground px-1 mt-3">
                        <Clock className="w-3 h-3" />
                        <span>Monitored Orders ({orders.length})</span>
                      </div>
                    )}
                    {orders.slice(0, 10).map(order => (
                      <div 
                        key={order.id}
                        className={cn(
                          "p-2.5 sm:p-3 rounded-lg border transition-colors overflow-hidden",
                          order.status === 'triggered' 
                            ? "bg-success/5 border-success/20" 
                            : "bg-secondary/30 border-border"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 min-w-0">
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                              {/* Chain icon */}
                              {(() => {
                                const chainInfo = getChainInfo(order.chain_index);
                                return chainInfo ? (
                                  <img src={chainInfo.icon} alt={chainInfo.name} className="w-4 h-4 rounded-full shrink-0" title={chainInfo.name} />
                                ) : null;
                              })()}
                              <span className="font-medium text-xs sm:text-sm truncate">
                                {order.from_token_symbol} → {order.to_token_symbol}
                              </span>
                              {getStatusBadge(order.status)}
                            </div>
                            <div className="text-[10px] sm:text-xs text-muted-foreground space-y-0.5">
                              <p className="truncate">
                                {order.condition === 'above' ? '↑' : '↓'} ${formatAmount(order.target_price, 6)}
                              </p>
                              <p className="truncate">Amount: {formatAmount(order.amount)} {order.from_token_symbol}</p>
                              {order.status === 'triggered' && order.trigger_expires_at && (
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground">Execute within:</span>
                                  <LimitOrderCountdown expiresAt={order.trigger_expires_at} />
                                </div>
                              )}
                              {order.status === 'active' && order.expires_at && (
                                <p className="truncate">Expires: {formatDate(order.expires_at)}</p>
                              )}
                              {order.status === 'executed' && order.execution_tx_hash && (
                                <p className="truncate text-primary">
                                  Tx: {order.execution_tx_hash.slice(0, 8)}...{order.execution_tx_hash.slice(-6)}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-1 shrink-0">
                            {order.status === 'active' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => cancelOrder(order.id)}
                              >
                                <X className="w-3 h-3 mr-1" />
                                Cancel
                              </Button>
                            )}
                            {order.status === 'triggered' && onExecuteOrder && (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => onExecuteOrder(order)}
                                >
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  Execute
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-muted-foreground"
                                  onClick={() => dismissOrder(order.id)}
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Dismiss
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {totalOrdersCount === 0 && (
                  <div className="text-center py-4">
                    <img src={xlamaMascot} alt="xLama mascot" className="w-12 h-12 mx-auto mb-2 opacity-60 rounded-full" />
                    <p className="text-sm text-muted-foreground">No limit orders yet</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
