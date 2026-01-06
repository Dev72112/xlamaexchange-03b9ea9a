import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart as PieChartIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AllocationData {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

interface PortfolioAllocationChartProps {
  chainBalances: Array<{
    chain: { name: string; shortName: string };
    total: number;
  }>;
  totalValue: number;
  className?: string;
}

// Consistent color palette for chains
const CHAIN_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(210, 60%, 50%)',
  'hsl(280, 60%, 50%)',
  'hsl(340, 60%, 50%)',
];

export function PortfolioAllocationChart({ 
  chainBalances, 
  totalValue, 
  className 
}: PortfolioAllocationChartProps) {
  const chartData = useMemo((): AllocationData[] => {
    if (totalValue === 0) return [];
    
    // Show top 6 chains + "Other"
    const topChains = chainBalances.slice(0, 6);
    const otherTotal = chainBalances.slice(6).reduce((sum, c) => sum + c.total, 0);
    
    const data: AllocationData[] = topChains.map((cb, idx) => ({
      name: cb.chain.shortName,
      value: cb.total,
      color: CHAIN_COLORS[idx % CHAIN_COLORS.length],
      percentage: (cb.total / totalValue) * 100,
    }));
    
    if (otherTotal > 0) {
      data.push({
        name: 'Other',
        value: otherTotal,
        color: 'hsl(var(--muted-foreground))',
        percentage: (otherTotal / totalValue) * 100,
      });
    }
    
    return data;
  }, [chainBalances, totalValue]);

  const formatUsd = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  if (chartData.length === 0) {
    return null;
  }

  return (
    <Card className={cn("bg-card border-border", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <PieChartIcon className="w-4 h-4 text-primary" />
          Chain Allocation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload as AllocationData;
                  return (
                    <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                      <p className="text-sm font-medium">{data.name}</p>
                      <p className="text-xs text-muted-foreground">{formatUsd(data.value)}</p>
                      <p className="text-xs text-primary">{data.percentage.toFixed(1)}%</p>
                    </div>
                  );
                }}
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                iconType="circle"
                iconSize={8}
                formatter={(value, entry: any) => (
                  <span className="text-xs text-muted-foreground ml-1">
                    {value} ({entry.payload?.percentage?.toFixed(0)}%)
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
