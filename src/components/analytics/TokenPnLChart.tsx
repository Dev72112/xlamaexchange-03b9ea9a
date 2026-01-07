import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, DollarSign, Trophy, Frown } from 'lucide-react';
import { useTokenPnL, TokenPnLData } from '@/hooks/useTokenPnL';
import { SUPPORTED_CHAINS, getChainIcon } from '@/data/chains';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { cn } from '@/lib/utils';

const formatUsd = (value: number): string => {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : value > 0 ? '+' : '';
  
  if (absValue >= 1000000) return `${sign}$${(absValue / 1000000).toFixed(2)}M`;
  if (absValue >= 1000) return `${sign}$${(absValue / 1000).toFixed(2)}K`;
  if (absValue >= 1) return `${sign}$${absValue.toFixed(2)}`;
  if (absValue >= 0.01) return `${sign}$${absValue.toFixed(4)}`;
  if (absValue === 0) return '$0.00';
  return `${sign}$${absValue.toFixed(6)}`;
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as TokenPnLData;
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 min-w-[180px]">
        <p className="font-medium mb-2">{data.symbol}</p>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total P&L:</span>
            <span className={cn(
              "font-medium",
              data.totalPnL > 0 ? "text-green-500" : data.totalPnL < 0 ? "text-red-500" : ""
            )}>
              {formatUsd(data.totalPnL)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Realized:</span>
            <span>{formatUsd(data.realizedPnL)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Unrealized:</span>
            <span>{formatUsd(data.unrealizedPnL)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Avg Buy:</span>
            <span>${data.avgBuyPrice.toFixed(6)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current:</span>
            <span>${data.currentPrice.toFixed(6)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Trades:</span>
            <span>{data.trades}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const TokenPnLChart = memo(function TokenPnLChart({ 
  chainFilter 
}: { 
  chainFilter?: string 
}) {
  const { tokens, totalPnL, bestPerformer, worstPerformer, isLoading } = useTokenPnL(chainFilter);

  // Prepare chart data (top 10 tokens by absolute P&L)
  const chartData = tokens
    .sort((a, b) => Math.abs(b.totalPnL) - Math.abs(a.totalPnL))
    .slice(0, 10);

  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Token P&L
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-[200px] w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tokens.length === 0) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Token P&L
          </CardTitle>
          <CardDescription>Track profit and loss by token</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No P&L data yet</p>
            <p className="text-xs">Make some trades to see performance</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          Token P&L
        </CardTitle>
        <CardDescription>Realized and unrealized profit/loss by token</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className={cn(
            "p-3 rounded-lg",
            totalPnL > 0 ? "bg-green-500/10" : totalPnL < 0 ? "bg-red-500/10" : "bg-secondary/50"
          )}>
            <p className="text-xs text-muted-foreground mb-1">Total P&L</p>
            <p className={cn(
              "font-semibold font-mono",
              totalPnL > 0 ? "text-green-500" : totalPnL < 0 ? "text-red-500" : ""
            )}>
              {formatUsd(totalPnL)}
            </p>
          </div>
          
          {bestPerformer && bestPerformer.totalPnL > 0 && (
            <div className="p-3 rounded-lg bg-green-500/10">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Trophy className="w-3 h-3 text-green-500" />
                Best
              </div>
              <p className="font-semibold text-green-500 truncate">{bestPerformer.symbol}</p>
              <p className="text-xs text-green-500/80">{formatUsd(bestPerformer.totalPnL)}</p>
            </div>
          )}
          
          {worstPerformer && (
            <div className={cn(
              "p-3 rounded-lg",
              worstPerformer.totalPnL < 0 ? "bg-red-500/10" : "bg-secondary/50"
            )}>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Frown className={cn("w-3 h-3", worstPerformer.totalPnL < 0 ? "text-red-500" : "text-muted-foreground")} />
                Worst
              </div>
              <p className={cn(
                "font-semibold truncate",
                worstPerformer.totalPnL < 0 ? "text-red-500" : "text-muted-foreground"
              )}>{worstPerformer.symbol}</p>
              <p className={cn(
                "text-xs",
                worstPerformer.totalPnL < 0 ? "text-red-500/80" : "text-muted-foreground/80"
              )}>{formatUsd(worstPerformer.totalPnL)}</p>
            </div>
          )}
        </div>

        {/* P&L Bar Chart */}
        {chartData.length > 0 && (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical">
              <XAxis 
                type="number" 
                tickFormatter={(v) => `$${Math.abs(v).toFixed(0)}`}
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
              />
              <YAxis 
                type="category" 
                dataKey="symbol" 
                width={60}
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine x={0} stroke="hsl(var(--border))" />
              <Bar dataKey="totalPnL" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={entry.totalPnL >= 0 ? 'hsl(142 76% 36%)' : 'hsl(0 84% 60%)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Token List */}
        <ScrollArea className="h-[200px] mt-4">
          <div className="space-y-2">
            {tokens.map((token) => {
              const chainData = SUPPORTED_CHAINS.find(c => c.chainIndex === token.chainIndex);
              const isPositive = token.totalPnL > 0;
              const isNegative = token.totalPnL < 0;
              
              return (
                <div 
                  key={`${token.chainIndex}-${token.tokenAddress}`}
                  className="flex items-center justify-between p-2 rounded-lg bg-secondary/30"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium">{token.symbol[0]}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-sm truncate">{token.symbol}</span>
                        {chainData && (
                          <img 
                            src={getChainIcon(chainData)} 
                            alt={chainData.name}
                            className="w-3 h-3 rounded-full"
                          />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{token.trades} trades</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "font-mono text-sm font-medium",
                      isPositive && "text-green-500",
                      isNegative && "text-red-500"
                    )}>
                      {formatUsd(token.totalPnL)}
                    </p>
                    <p className={cn(
                      "text-xs",
                      isPositive && "text-green-500/80",
                      isNegative && "text-red-500/80",
                      !isPositive && !isNegative && "text-muted-foreground"
                    )}>
                      {token.pnLPercentage >= 0 ? '+' : ''}{token.pnLPercentage.toFixed(1)}%
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
});
