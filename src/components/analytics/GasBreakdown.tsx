import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Fuel, TrendingUp, TrendingDown } from 'lucide-react';
import { useGasAnalytics } from '@/hooks/useGasAnalytics';
import { SUPPORTED_CHAINS, getChainIcon } from '@/data/chains';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Tooltip,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { cn } from '@/lib/utils';

const COLORS = [
  'hsl(var(--primary))', 
  'hsl(var(--chart-2))', 
  'hsl(var(--chart-3))', 
  'hsl(var(--chart-4))', 
  'hsl(var(--chart-5))',
  'hsl(262 80% 60%)',
  'hsl(199 89% 48%)',
  'hsl(0 84% 60%)',
];

const formatUsd = (value: number): string => {
  if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(6)}`;
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-2">
        <p className="font-medium text-sm">{data.chainName || data.name}</p>
        <p className="text-xs text-muted-foreground">
          Gas: {formatUsd(data.gasUsd || data.value)}
        </p>
        {data.txCount && (
          <p className="text-xs text-muted-foreground">{data.txCount} transactions</p>
        )}
      </div>
    );
  }
  return null;
};

const TimeTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-2">
        <p className="text-xs font-medium mb-1">
          {new Date(label).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
        </p>
        <p className="text-xs text-muted-foreground">
          Gas: {formatUsd(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

export const GasBreakdown = memo(function GasBreakdown({ 
  chainFilter 
}: { 
  chainFilter?: string 
}) {
  const { totalGasUsd, avgGasPerTrade, gasPerChain, gasOverTime } = useGasAnalytics(chainFilter);

  // Prepare pie chart data
  const pieData = gasPerChain.slice(0, 8).map((chain, index) => ({
    name: chain.chainName,
    value: chain.gasUsd,
    txCount: chain.txCount,
    color: COLORS[index % COLORS.length],
  }));

  if (totalGasUsd === 0) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Fuel className="w-4 h-4 text-primary" />
            Gas Spending
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Fuel className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No gas data yet</p>
            <p className="text-xs mt-1">
              Complete some trades to track gas costs
            </p>
            <p className="text-xs mt-2 text-primary/70">
              Gas tracking works across all connected chains
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Fuel className="w-4 h-4 text-primary" />
          Gas Spending
        </CardTitle>
        <CardDescription>Estimated gas costs across chains</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-secondary/50">
            <p className="text-xs text-muted-foreground mb-1">Total Gas Spent</p>
            <p className="font-semibold font-mono text-lg">{formatUsd(totalGasUsd)}</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/50">
            <p className="text-xs text-muted-foreground mb-1">Avg Per Trade</p>
            <p className="font-semibold font-mono text-lg">{formatUsd(avgGasPerTrade)}</p>
          </div>
        </div>

        {/* Pie Chart */}
        {pieData.length > 0 && (
          <div className="h-[180px] mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Gas Over Time */}
        {gasOverTime.length > 1 && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2">Gas Over Time</p>
            <ResponsiveContainer width="100%" height={100}>
              <AreaChart data={gasOverTime}>
                <defs>
                  <linearGradient id="gasGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  hide 
                />
                <YAxis hide />
                <Tooltip content={<TimeTooltip />} />
                <Area
                  type="monotone"
                  dataKey="gasUsd"
                  stroke="hsl(var(--chart-4))"
                  fill="url(#gasGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Chain Breakdown List */}
        <ScrollArea className="h-[150px]">
          <div className="space-y-2">
            {gasPerChain.map((chain, index) => {
              const chainData = SUPPORTED_CHAINS.find(c => c.chainIndex === chain.chainIndex);
              
              return (
                <div 
                  key={chain.chainIndex}
                  className="flex items-center justify-between p-2 rounded-lg bg-secondary/30"
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    {chainData && (
                      <img 
                        src={getChainIcon(chainData)}
                        alt={chain.chainName}
                        className="w-5 h-5 rounded-full"
                      />
                    )}
                    <span className="text-sm font-medium">{chain.chainName}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm">{formatUsd(chain.gasUsd)}</p>
                    <p className="text-xs text-muted-foreground">{chain.txCount} txs</p>
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
