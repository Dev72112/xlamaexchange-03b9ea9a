/**
 * Instant Transaction Tab Content
 * Displays instant exchange transactions (ChangeNOW)
 */

import { memo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, ArrowRight, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { getStaggerStyle, STAGGER_ITEM_CLASS } from '@/lib/staggerAnimation';
import { TransactionCardsSkeleton } from '@/components/ContentSkeletons';

interface InstantTransaction {
  id: string;
  fromTicker: string;
  toTicker: string;
  fromAmount: string;
  toAmount: string;
  fromImage?: string;
  toImage?: string;
  fromName?: string;
  toName?: string;
  status: string;
  createdAt: number | string;
}

interface InstantTabContentProps {
  transactions: InstantTransaction[];
  isLoading: boolean;
  onRemove: (id: string) => void;
  onClear: () => void;
}

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
    default:
      return (
        <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Pending
        </Badge>
      );
  }
};

export const InstantTabContent = memo(function InstantTabContent({
  transactions,
  isLoading,
  onRemove,
  onClear,
}: InstantTabContentProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return <TransactionCardsSkeleton count={3} />;
  }

  if (transactions.length === 0) {
    return (
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
    );
  }

  return (
    <>
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            if (confirm('Are you sure you want to clear all instant transaction history?')) {
              onClear();
            }
          }}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Clear All
        </Button>
      </div>

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
                  <span>{formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}</span>
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
                  onClick={() => onRemove(tx.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
});
