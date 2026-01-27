/**
 * Zerion Analytics Tab
 * Protocol breakdown and fee analysis for DeFi positions
 */

import { memo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Layers,
  PieChart,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { useZerionPortfolio } from '@/hooks/useZerionPortfolio';
import { useZerionTransactions } from '@/hooks/useZerionTransactions';
import { ProtocolBreakdown } from '@/components/analytics/ProtocolBreakdown';
import { FeeAnalysis } from '@/components/analytics/FeeAnalysis';
import { 
  PieChart as RechartsPie,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const formatUsd = (value: number) => {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (absValue >= 1000000) return `${sign}$${(absValue / 1000000).toFixed(2)}M`;
  if (absValue >= 1000) return `${sign}$${(absValue / 1000).toFixed(2)}K`;
  return `${sign}$${absValue.toFixed(2)}`;
};

const StatCard = memo(function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  trend,
  loading = false,
}: { 
  icon: any; 
  label: string; 
  value: string | number; 
  trend?: 'up' | 'down' | 'neutral';
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-4">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50 hover-lift transition-all group sweep-effect">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-semibold font-mono truncate">{value}</p>
              {trend && trend !== 'neutral' && (
                <span className={cn(
                  "flex items-center text-xs font-medium",
                  trend === 'up' ? "text-green-500" : "text-red-500"
                )}>
                  {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                </span>
              )}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors flex-shrink-0">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export const ZerionAnalyticsTab = memo(function ZerionAnalyticsTab() {
  const { activeAddress, activeChainType } = useMultiWallet();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { 
    portfolio,
    positions, 
    defiPositions, 
    pnl, 
    isLoading,
    refetch 
  } = useZerionPortfolio();

  const { transactions: zerionTxs, isLoading: txLoading } = useZerionTransactions();

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['zerion'] });
    refetch();
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsRefreshing(false);
  }, [queryClient, refetch]);

  // Calculate position type distribution
  const positionTypeData = positions.reduce((acc, pos) => {
    const type = pos.positionType || 'wallet';
    const existing = acc.find(item => item.type === type);
    if (existing) {
      existing.value += pos.value || 0;
    } else {
      acc.push({ type, value: pos.value || 0 });
    }
    return acc;
  }, [] as { type: string; value: number }[]).sort((a, b) => b.value - a.value);

  const totalValue = portfolio?.totalValue || positions.reduce((sum, p) => sum + (p.value || 0), 0);
  const change1d = portfolio?.absoluteChange1d || 0;
  const changePercent1d = portfolio?.percentChange1d || 0;

  // Only show for EVM wallets
  if (activeChainType !== 'evm') {
    return (
      <Card className="glass border-border/50">
        <CardContent className="py-12 text-center">
          <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">EVM Only</h3>
          <p className="text-sm text-muted-foreground">
            Zerion analytics are only available for EVM wallets. Switch to an EVM chain to view DeFi analytics.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="h-8 gap-1.5">
          <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign}
          label="Total Value"
          value={formatUsd(totalValue)}
          loading={isLoading}
        />
        <StatCard
          icon={change1d >= 0 ? TrendingUp : TrendingDown}
          label="24h Change"
          value={formatUsd(Math.abs(change1d))}
          trend={change1d >= 0 ? 'up' : 'down'}
          loading={isLoading}
        />
        <StatCard
          icon={Layers}
          label="DeFi Positions"
          value={defiPositions.length}
          loading={isLoading}
        />
        <StatCard
          icon={PieChart}
          label="Total Fees"
          value={formatUsd(pnl?.totalFees || 0)}
          loading={isLoading}
        />
      </div>

      {/* Position Type Distribution */}
      {positionTypeData.length > 0 && (
        <Card className="glass border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="w-4 h-4 text-primary" />
              Position Distribution
              <Badge variant="outline" className="text-[10px] py-0">Zerion</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={positionTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {positionTypeData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatUsd(value)} />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {positionTypeData.map((item, index) => (
                  <div key={item.type} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                      />
                      <span className="capitalize">{item.type}</span>
                    </div>
                    <span className="font-mono">{formatUsd(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Protocol Breakdown */}
      <ProtocolBreakdown positions={defiPositions} isLoading={isLoading} />

      {/* Fee Analysis */}
      <FeeAnalysis transactions={zerionTxs} pnl={pnl} isLoading={txLoading} />
    </div>
  );
});

export default ZerionAnalyticsTab;
