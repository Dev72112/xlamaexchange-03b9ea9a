/**
 * P&L Breakdown Component
 * Displays realized vs unrealized gains, fees, and investment summary
 */

import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  PiggyBank
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ZerionPnL } from '@/services/zerion';

interface PnLBreakdownProps {
  pnl: ZerionPnL | null;
  isLoading?: boolean;
  className?: string;
}

export const PnLBreakdown = memo(function PnLBreakdown({ 
  pnl,
  isLoading,
  className 
}: PnLBreakdownProps) {
  const formatValue = (value: number, showSign = true) => {
    const absValue = Math.abs(value);
    const formatted = absValue >= 1000000 
      ? `$${(absValue / 1000000).toFixed(2)}M`
      : absValue >= 1000 
        ? `$${(absValue / 1000).toFixed(2)}K`
        : `$${absValue.toFixed(2)}`;
    
    if (!showSign) return formatted;
    return value >= 0 ? `+${formatted}` : `-${formatted.slice(1)}`;
  };

  const calculateROI = () => {
    if (!pnl || pnl.totalInvested === 0) return 0;
    return (pnl.totalReturn / pnl.totalInvested) * 100;
  };

  if (isLoading) {
    return (
      <Card className={cn("glass-card", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            P&L Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="p-3 rounded-lg bg-muted/30">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pnl) {
    return (
      <Card className={cn("glass-card", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            P&L Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No P&L data available</p>
            <p className="text-sm mt-1">Trade history will be analyzed to calculate your returns</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const roi = calculateROI();
  const totalReturn = pnl.totalReturn;
  const isPositive = totalReturn >= 0;

  return (
    <Card className={cn("glass-card", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            P&L Breakdown
          </CardTitle>
          <Badge 
            variant="secondary"
            className={cn(
              isPositive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
            )}
          >
            {isPositive ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
            {roi.toFixed(2)}% ROI
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Total Return Hero */}
        <div className={cn(
          "p-4 rounded-xl mb-4",
          isPositive ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"
        )}>
          <div className="text-sm text-muted-foreground mb-1">Total Return</div>
          <div className={cn(
            "text-3xl font-bold flex items-center gap-2",
            isPositive ? "text-green-500" : "text-red-500"
          )}>
            {isPositive ? <TrendingUp className="h-7 w-7" /> : <TrendingDown className="h-7 w-7" />}
            {formatValue(totalReturn)}
          </div>
        </div>

        {/* Breakdown Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Realized Gains */}
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              Realized
            </div>
            <div className={cn(
              "text-lg font-semibold",
              pnl.realizedGain >= 0 ? "text-green-500" : "text-red-500"
            )}>
              {formatValue(pnl.realizedGain)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Closed positions
            </div>
          </div>

          {/* Unrealized Gains */}
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Percent className="h-4 w-4" />
              Unrealized
            </div>
            <div className={cn(
              "text-lg font-semibold",
              pnl.unrealizedGain >= 0 ? "text-green-500" : "text-red-500"
            )}>
              {formatValue(pnl.unrealizedGain)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Open positions
            </div>
          </div>

          {/* Total Invested */}
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <PiggyBank className="h-4 w-4" />
              Net Invested
            </div>
            <div className="text-lg font-semibold text-foreground">
              {formatValue(pnl.totalInvested, false)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Total cost basis
            </div>
          </div>

          {/* Total Fees */}
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Receipt className="h-4 w-4" />
              Fees Paid
            </div>
            <div className="text-lg font-semibold text-orange-500">
              {formatValue(-Math.abs(pnl.totalFees), false)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Gas & trading fees
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
