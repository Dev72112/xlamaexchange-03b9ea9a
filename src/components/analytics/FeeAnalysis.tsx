import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, TrendingDown, ArrowDownUp, Zap, Calendar, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ZerionTransaction } from '@/services/zerion';
import type { ZerionPnL } from '@/services/zerion';
import { useDexTransactions } from '@/contexts/DexTransactionContext';

interface FeeAnalysisProps {
  transactions: ZerionTransaction[];
  pnl?: ZerionPnL | null;
  isLoading?: boolean;
  timePeriod?: '24h' | '7d' | '30d' | 'all';
  chainFilter?: string;
}

interface FeeBreakdown {
  totalFees: number;
  swapFees: number;
  bridgeFees: number;
  transferFees: number;
  otherFees: number;
  feeCount: number;
  avgFeePerTx: number;
  highestFee: number;
  dailyAvg: number;
}

export const FeeAnalysis: React.FC<FeeAnalysisProps> = ({
  transactions,
  pnl,
  isLoading = false,
  timePeriod = '30d',
  chainFilter,
}) => {
  // Get DEX transactions as fallback
  const { transactions: dexTransactions } = useDexTransactions();
  
  // Filter DEX transactions by chain if needed
  const filteredDexTxs = useMemo(() => {
    return dexTransactions
      .filter(tx => tx.status === 'confirmed')
      .filter(tx => !chainFilter || chainFilter === 'all' || tx.chainId === chainFilter);
  }, [dexTransactions, chainFilter]);

  const feeBreakdown = useMemo<FeeBreakdown>(() => {
    // Try Zerion transactions first
    if (transactions.length > 0) {
      let swapFees = 0;
      let bridgeFees = 0;
      let transferFees = 0;
      let otherFees = 0;
      let highestFee = 0;

      transactions.forEach((tx) => {
        const fee = tx.fee || 0;
        if (fee > highestFee) highestFee = fee;

        const type = tx.operationType?.toLowerCase() || '';
        
        if (type.includes('swap') || type.includes('trade')) {
          swapFees += fee;
        } else if (type.includes('bridge')) {
          bridgeFees += fee;
        } else if (type.includes('transfer') || type.includes('send')) {
          transferFees += fee;
        } else {
          otherFees += fee;
        }
      });

      const totalFees = swapFees + bridgeFees + transferFees + otherFees;
      const feeCount = transactions.filter((tx) => (tx.fee || 0) > 0).length;
      const avgFeePerTx = feeCount > 0 ? totalFees / feeCount : 0;

      let days = 30;
      if (timePeriod === '24h') days = 1;
      else if (timePeriod === '7d') days = 7;
      else if (timePeriod === 'all') days = 365;
      
      const dailyAvg = totalFees / days;

      return { totalFees, swapFees, bridgeFees, transferFees, otherFees, feeCount, avgFeePerTx, highestFee, dailyAvg };
    }
    
    // Fallback: estimate from DEX transactions
    if (filteredDexTxs.length > 0) {
      // Estimate gas fees at ~$2 per swap on average (conservative)
      const estimatedFeePerSwap = 2;
      const swapCount = filteredDexTxs.filter(tx => tx.type === 'swap').length;
      const estimatedSwapFees = swapCount * estimatedFeePerSwap;
      
      let days = 30;
      if (timePeriod === '24h') days = 1;
      else if (timePeriod === '7d') days = 7;
      else if (timePeriod === 'all') days = 365;
      
      return {
        totalFees: estimatedSwapFees,
        swapFees: estimatedSwapFees,
        bridgeFees: 0,
        transferFees: 0,
        otherFees: 0,
        feeCount: swapCount,
        avgFeePerTx: estimatedFeePerSwap,
        highestFee: estimatedFeePerSwap * 2,
        dailyAvg: estimatedSwapFees / days,
      };
    }

    return {
      totalFees: 0,
      swapFees: 0,
      bridgeFees: 0,
      transferFees: 0,
      otherFees: 0,
      feeCount: 0,
      avgFeePerTx: 0,
      highestFee: 0,
      dailyAvg: 0,
    };
  }, [transactions, filteredDexTxs, timePeriod]);

  // Get fee data from PnL if available
  const zerionFees = pnl?.totalFees || 0;
  const displayTotalFees = zerionFees || feeBreakdown.totalFees;

  if (isLoading) {
    return (
      <Card className="glass-ultra border-border/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Fee Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 rounded-lg bg-card/50">
                <Skeleton className="h-3 w-16 mb-2" />
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const feeCategories = [
    { label: 'Swap Fees', value: feeBreakdown.swapFees, icon: ArrowDownUp, color: 'text-blue-500' },
    { label: 'Bridge Fees', value: feeBreakdown.bridgeFees, icon: Zap, color: 'text-purple-500' },
    { label: 'Transfer Fees', value: feeBreakdown.transferFees, icon: TrendingDown, color: 'text-orange-500' },
    { label: 'Other Fees', value: feeBreakdown.otherFees, icon: Coins, color: 'text-muted-foreground' },
  ].filter((cat) => cat.value > 0);

  return (
    <Card className="glass-ultra border-border/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Coins className="h-5 w-5 text-primary" />
          Fee Analysis
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-[200px]">
                  Total gas fees and protocol fees paid across all transactions
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Badge variant="outline" className="ml-auto text-xs capitalize">
            {timePeriod === 'all' ? 'All Time' : `Last ${timePeriod}`}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Fees Summary */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total Fees Paid</p>
              <p className="text-2xl font-bold text-red-400">
                ${displayTotalFees.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">Daily Average</p>
              <p className="text-lg font-semibold">
                ${feeBreakdown.dailyAvg.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Fee Statistics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-card/50 border border-border/30">
            <p className="text-xs text-muted-foreground mb-1">Transactions</p>
            <p className="text-lg font-semibold">{feeBreakdown.feeCount}</p>
          </div>
          <div className="p-3 rounded-lg bg-card/50 border border-border/30">
            <p className="text-xs text-muted-foreground mb-1">Avg per Tx</p>
            <p className="text-lg font-semibold">
              ${feeBreakdown.avgFeePerTx.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-card/50 border border-border/30">
            <p className="text-xs text-muted-foreground mb-1">Highest Fee</p>
            <p className="text-lg font-semibold text-orange-400">
              ${feeBreakdown.highestFee.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-card/50 border border-border/30">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Est. Yearly</p>
            </div>
            <p className="text-lg font-semibold">
              ${(feeBreakdown.dailyAvg * 365).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {/* Fee Categories */}
        {feeCategories.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">By Category</p>
            <div className="space-y-2">
              {feeCategories.map((category) => {
                const Icon = category.icon;
                const percentage = displayTotalFees > 0 ? (category.value / displayTotalFees) * 100 : 0;
                
                return (
                  <div
                    key={category.label}
                    className="flex items-center justify-between p-2 rounded-lg bg-card/30"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${category.color}`} />
                      <span className="text-sm">{category.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium text-sm">
                        ${category.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {displayTotalFees === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <Coins className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No fee data available</p>
            <p className="text-xs">Make some transactions to see fee analysis</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FeeAnalysis;
