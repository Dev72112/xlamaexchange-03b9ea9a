import { memo, useState } from 'react';
import { useDCAOrders, DCAOrder } from '@/hooks/useDCAOrders';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  BarChart3,
} from 'lucide-react';
import xlamaMascot from '@/assets/xlama-mascot.png';
import { getStaggerStyle, STAGGER_ITEM_CLASS } from '@/lib/staggerAnimation';
import { DCADashboard } from './DCADashboard';

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
  isSigning: boolean;
  index: number;
}

const DCAOrderCard = memo(function DCAOrderCard({ 
  order, 
  onPause, 
  onResume, 
  onCancel,
  isSigning,
  index,
}: DCAOrderCardProps) {
  const progress = order.total_intervals 
    ? (order.completed_intervals / order.total_intervals) * 100 
    : null;

  return (
    <div 
      className={`p-4 border border-border rounded-lg hover:border-primary/20 transition-colors ${STAGGER_ITEM_CLASS}`}
      style={getStaggerStyle(index, 50)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Token pair and amount */}
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium">{order.from_token_symbol}</span>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{order.to_token_symbol}</span>
            <Badge variant="outline" className={getStatusColor(order.status)}>
              {order.status}
            </Badge>
          </div>
          
          {/* Details */}
          <div className="text-sm text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-3.5 h-3.5" />
              <span>{order.amount_per_interval} {order.from_token_symbol} {getFrequencyLabel(order.frequency)}</span>
            </div>
            
            {order.status === 'active' && (
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                <span>Next: {getNextExecutionText(order.next_execution)}</span>
              </div>
            )}
            
            {order.total_intervals && (
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>Progress</span>
                  <span>{order.completed_intervals}/{order.total_intervals} purchases</span>
                </div>
                <Progress value={progress || 0} className="h-1.5" />
              </div>
            )}
          </div>
        </div>
        
        {/* Actions */}
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
  );
});

export const ActiveDCAOrders = memo(function ActiveDCAOrders() {
  const { isConnected } = useMultiWallet();
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
  
  // Show active + paused orders
  const visibleOrders = [...activeOrders, ...pausedOrders];
  
  if (!isConnected) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <CalendarClock className="w-4 h-4 text-foreground" />
              </div>
              <div>
                <CardTitle className="text-base">DCA Orders</CardTitle>
                {visibleOrders.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {activeOrders.length} active, {pausedOrders.length} paused
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {orders.length > 0 && (
                <>
                  <DCADashboard />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={exportToCSV}
                    title="Export to CSV"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </>
              )}
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : visibleOrders.length === 0 ? (
              <div className="text-center py-8">
                <img 
                  src={xlamaMascot} 
                  alt="xLama mascot" 
                  className="w-16 h-16 mx-auto mb-3 opacity-60"
                />
                <p className="text-sm text-muted-foreground mb-1">No DCA orders yet</p>
                <p className="text-xs text-muted-foreground">
                  Create a DCA order from the swap form to start dollar cost averaging
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {visibleOrders.map((order, index) => (
                  <DCAOrderCard
                    key={order.id}
                    order={order}
                    onPause={pauseOrder}
                    onResume={resumeOrder}
                    onCancel={cancelOrder}
                    isSigning={isSigning}
                    index={index}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
});
