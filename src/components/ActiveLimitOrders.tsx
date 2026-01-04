import { useState, useEffect } from 'react';
import { Target, X, Clock, Check, AlertCircle, ChevronDown, ChevronUp, ExternalLink, Download, Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLimitOrders, LimitOrder } from '@/hooks/useLimitOrders';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { cn } from '@/lib/utils';

interface ActiveLimitOrdersProps {
  className?: string;
  onExecuteOrder?: (order: LimitOrder) => void;
}

export function ActiveLimitOrders({ className, onExecuteOrder }: ActiveLimitOrdersProps) {
  const { isConnected } = useMultiWallet();
  const { orders, activeOrders, cancelOrder, isLoading, exportToCSV, notificationPermission, requestNotificationPermission } = useLimitOrders();
  const [isOpen, setIsOpen] = useState(false);

  if (!isConnected || orders.length === 0) {
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
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />Monitoring</Badge>;
      case 'triggered':
        return <Badge className="gap-1 bg-success text-success-foreground"><Check className="w-3 h-3" />Triggered</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="gap-1"><X className="w-3 h-3" />Cancelled</Badge>;
      case 'expired':
        return <Badge variant="outline" className="gap-1"><AlertCircle className="w-3 h-3" />Expired</Badge>;
      default:
        return null;
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={cn("bg-card border-border", className)}>
        <CollapsibleTrigger asChild>
          <button className="w-full text-left">
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Limit Orders
                  {activeOrders.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                      {activeOrders.length}
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex items-center gap-1">
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
            <ScrollArea className="max-h-60">
              <div className="space-y-2">
                {orders.slice(0, 10).map(order => (
                  <div 
                    key={order.id}
                    className={cn(
                      "p-3 rounded-lg border transition-colors",
                      order.status === 'triggered' 
                        ? "bg-success/5 border-success/20" 
                        : "bg-secondary/30 border-border"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {order.from_token_symbol} → {order.to_token_symbol}
                          </span>
                          {getStatusBadge(order.status)}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p>
                            {order.condition === 'above' ? '↑' : '↓'} ${order.target_price.toFixed(6)}
                          </p>
                          <p>Amount: {order.amount} {order.from_token_symbol}</p>
                          {order.expires_at && (
                            <p>Expires: {formatDate(order.expires_at)}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-1">
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
                          <Button
                            variant="default"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => onExecuteOrder(order)}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Execute
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {orders.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    No limit orders yet
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
