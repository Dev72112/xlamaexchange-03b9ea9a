import { memo, useState, useMemo, useCallback } from 'react';
import { useDCAOrders, DCAOrder } from '@/hooks/useDCAOrders';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { useTradePreFill } from '@/contexts/TradePreFillContext';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CalendarClock, 
  ChevronDown, 
  ChevronUp, 
  Loader2,
  MoreHorizontal,
  Pause,
  Play,
  X,
  Download,
  Clock,
  ArrowRight,
  Zap,
} from 'lucide-react';
import xlamaMascot from '@/assets/xlama-mascot.png';
import { getStaggerStyle, STAGGER_ITEM_CLASS } from '@/lib/staggerAnimation';
import { DCADashboard } from './DCADashboard';
import { getChainIcon } from '@/data/chains';
import { SUPPORTED_CHAINS } from '@/data/chains';

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getNextExecutionText = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  
  if (diffMs < 0) return 'Pending execution';
  
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) return `In ${diffDays} day${diffDays > 1 ? 's' : ''}`;
  if (diffHours > 0) return `In ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  
  const diffMins = Math.floor(diffMs / (1000 * 60));
  return `In ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'paused': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    case 'completed': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'cancelled': return 'bg-muted text-muted-foreground border-muted';
    default: return '';
  }
};

const getFrequencyLabel = (freq: string) => {
  switch (freq) {
    case 'daily': return 'Daily';
    case 'weekly': return 'Weekly';
    case 'biweekly': return 'Bi-weekly';
    case 'monthly': return 'Monthly';
    default: return freq;
  }
};


interface DCAOrderCardProps {
  order: DCAOrder;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onExecuteNow: (order: DCAOrder) => void;
  isSigning: boolean;
  index: number;
}

// Check if a DCA order is due for execution (next_execution is in the past)
const isOrderDue = (nextExecution: string): boolean => {
  const date = new Date(nextExecution);
  return date.getTime() <= Date.now();
};

const DCAOrderCard = memo(function DCAOrderCard({ 
  order, 
  onPause, 
  onResume, 
  onCancel,
  onExecuteNow,
  isSigning,
  index,
}: DCAOrderCardProps) {
  const progress = order.total_intervals 
    ? (order.completed_intervals / order.total_intervals) * 100 
    : null;
  
  const isDue = order.status === 'active' && isOrderDue(order.next_execution);

  return (
    <div 
      className={`p-3 sm:p-4 border border-border rounded-lg hover:border-primary/20 transition-colors sweep-effect performance-critical ${STAGGER_ITEM_CLASS}`}
      style={getStaggerStyle(index, 50)}
    >
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        <div className="flex-1 min-w-0">
          {/* Token pair and amount with chain icon */}
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 flex-wrap">
            {/* Chain icon */}
            {(() => {
              const chain = SUPPORTED_CHAINS.find(c => c.chainIndex === order.chain_index);
              return chain ? (
                <img src={getChainIcon(chain)} alt={chain.name} className="w-4 h-4 rounded-full shrink-0" title={chain.name} />
              ) : null;
            })()}
            <span className="font-medium text-sm sm:text-base truncate">{order.from_token_symbol}</span>
            <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
            <span className="font-medium text-sm sm:text-base truncate">{order.to_token_symbol}</span>
            <Badge variant="outline" className={`text-xs ${getStatusColor(order.status)}`}>
              {order.status}
            </Badge>
          </div>
          
          {/* Details */}
          <div className="text-xs sm:text-sm text-muted-foreground space-y-0.5 sm:space-y-1">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <CalendarClock className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="truncate">{order.amount_per_interval} {order.from_token_symbol} {getFrequencyLabel(order.frequency)}</span>
            </div>
            
            {order.status === 'active' && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span className="truncate">
                  Next: {getNextExecutionText(order.next_execution)}
                  {order.execution_hour !== undefined && ` at ${String(order.execution_hour).padStart(2, '0')}:00 UTC`}
                </span>
              </div>
            )}
            
            {order.total_intervals && (
              <div className="mt-1.5 sm:mt-2">
                <div className="flex justify-between text-[10px] sm:text-xs mb-0.5 sm:mb-1">
                  <span>Progress</span>
                  <span>{order.completed_intervals}/{order.total_intervals} purchases</span>
                </div>
                <Progress value={progress || 0} className="h-1 sm:h-1.5" />
              </div>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Execute Now button for due orders */}
          {isDue && (
            <Button
              size="sm"
              variant="default"
              className="h-8 gap-1.5 text-xs"
              onClick={() => onExecuteNow(order)}
              disabled={isSigning}
            >
              <Zap className="w-3.5 h-3.5" />
              Execute Now
            </Button>
          )}
          
          {(order.status === 'active' || order.status === 'paused') && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isSigning}>
                  {isSigning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MoreHorizontal className="w-4 h-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {order.status === 'active' ? (
                  <DropdownMenuItem onClick={() => onPause(order.id)}>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause Order
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onResume(order.id)}>
                    <Play className="w-4 h-4 mr-2" />
                    Resume Order
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={() => onCancel(order.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel Order
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
});

export const ActiveDCAOrders = memo(function ActiveDCAOrders() {
  const { isConnected } = useMultiWallet();
  const { setPreFill } = useTradePreFill();
  const { triggerSuccess } = useHapticFeedback();
  const navigate = useNavigate();
  const { 
    orders, 
    activeOrders, 
    pausedOrders,
    isLoading, 
    isSigning,
    pauseOrder,
    resumeOrder,
    cancelOrder,
    exportToCSV,
  } = useDCAOrders();
  
  const [isOpen, setIsOpen] = useState(true);
  
  // Database orders only (Jupiter removed)
  const visibleOrders = useMemo(() => [...activeOrders, ...pausedOrders], [activeOrders, pausedOrders]);
  const totalOrderCount = visibleOrders.length;
  
  // Handle Execute Now - pre-fill swap form and navigate
  const handleExecuteNow = useCallback((order: DCAOrder) => {
    setPreFill({
      fromTokenAddress: order.from_token_address,
      toTokenAddress: order.to_token_address,
      fromTokenSymbol: order.from_token_symbol,
      toTokenSymbol: order.to_token_symbol,
      amount: order.amount_per_interval,
      chainIndex: order.chain_index,
    });
    triggerSuccess();
    navigate('/');
  }, [setPreFill, triggerSuccess, navigate]);
  
  if (!isConnected) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-border overflow-hidden sweep-effect shadow-premium-hover performance-critical">
        <CardHeader className="pb-2 sm:pb-3 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <CalendarClock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-foreground" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-sm sm:text-base truncate flex items-center gap-2">
                  DCA Orders
                  {totalOrderCount > 0 && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                      {totalOrderCount}
                    </Badge>
                  )}
                </CardTitle>
                {visibleOrders.length > 0 && (
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                    {activeOrders.length} active, {pausedOrders.length} paused
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {orders.length > 0 && (
                <>
                  <DCADashboard />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 sm:h-8 sm:w-8"
                    onClick={exportToCSV}
                    title="Export to CSV"
                  >
                    <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </Button>
                </>
              )}
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8">
                  {isOpen ? (
                    <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="pt-0 p-4 sm:p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-6 sm:py-8">
                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-muted-foreground" />
              </div>
            ) : totalOrderCount === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <img 
                  src={xlamaMascot} 
                  alt="xLama mascot" 
                  className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-3 opacity-60"
                />
                <p className="text-xs sm:text-sm text-muted-foreground mb-0.5 sm:mb-1">No DCA orders yet</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Create a DCA order from the swap form to start dollar cost averaging
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[350px] pr-2">
                <div className="space-y-2 sm:space-y-3">
                  {/* Database DCA orders */}
                  {visibleOrders.map((order, index) => (
                    <DCAOrderCard
                      key={order.id}
                      order={order}
                      onPause={pauseOrder}
                      onResume={resumeOrder}
                      onCancel={cancelOrder}
                      onExecuteNow={handleExecuteNow}
                      isSigning={isSigning}
                      index={index}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
});
