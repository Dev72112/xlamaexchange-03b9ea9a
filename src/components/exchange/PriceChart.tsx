import { useState, useEffect, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { Currency } from "@/data/currencies";

interface PriceChartProps {
  fromCurrency: Currency;
  toCurrency: Currency;
  currentRate: number | null;
}

interface ChartDataPoint {
  time: string;
  rate: number;
}

export function PriceChart({ fromCurrency, toCurrency, currentRate }: PriceChartProps) {
  const [isLoading, setIsLoading] = useState(true);
  
  // Generate simulated historical data based on current rate
  // In production, this would fetch from a price history API
  const chartData = useMemo(() => {
    if (!currentRate) return [];
    
    const data: ChartDataPoint[] = [];
    const now = new Date();
    const volatility = 0.02; // 2% volatility simulation
    
    // Generate 24 hours of data points (one per hour)
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      const randomVariation = 1 + (Math.random() - 0.5) * volatility * 2;
      // Create a trend that ends at current rate
      const trendFactor = 1 + ((23 - i) / 23) * (Math.random() - 0.5) * 0.01;
      const rate = currentRate * randomVariation * trendFactor;
      
      data.push({
        time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        rate: parseFloat(rate.toFixed(8)),
      });
    }
    
    // Ensure the last point is the current rate
    if (data.length > 0) {
      data[data.length - 1].rate = currentRate;
    }
    
    return data;
  }, [currentRate, fromCurrency.ticker, toCurrency.ticker]);
  
  useEffect(() => {
    if (currentRate) {
      setIsLoading(true);
      // Simulate loading
      const timer = setTimeout(() => setIsLoading(false), 500);
      return () => clearTimeout(timer);
    }
  }, [currentRate, fromCurrency.ticker, toCurrency.ticker]);
  
  const priceChange = useMemo(() => {
    if (chartData.length < 2) return { value: 0, percentage: 0, isPositive: true };
    const first = chartData[0].rate;
    const last = chartData[chartData.length - 1].rate;
    const change = last - first;
    const percentage = (change / first) * 100;
    return {
      value: change,
      percentage: percentage,
      isPositive: change >= 0,
    };
  }, [chartData]);
  
  const minRate = useMemo(() => {
    if (chartData.length === 0) return 0;
    return Math.min(...chartData.map(d => d.rate)) * 0.999;
  }, [chartData]);
  
  const maxRate = useMemo(() => {
    if (chartData.length === 0) return 0;
    return Math.max(...chartData.map(d => d.rate)) * 1.001;
  }, [chartData]);
  
  if (!currentRate) {
    return null;
  }
  
  return (
    <div className="space-y-3 p-3 bg-secondary/30 rounded-xl border border-border">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {fromCurrency.ticker.toUpperCase()}/{toCurrency.ticker.toUpperCase()}
          </span>
          <span className="text-xs text-muted-foreground">24h</span>
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium ${
          priceChange.isPositive ? 'text-success' : 'text-destructive'
        }`}>
          {priceChange.isPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          <span>{priceChange.isPositive ? '+' : ''}{priceChange.percentage.toFixed(2)}%</span>
        </div>
      </div>
      
      {/* Chart */}
      <div className="h-24 w-full">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop 
                    offset="5%" 
                    stopColor={priceChange.isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))"} 
                    stopOpacity={0.3}
                  />
                  <stop 
                    offset="95%" 
                    stopColor={priceChange.isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))"} 
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="time" 
                hide 
              />
              <YAxis 
                domain={[minRate, maxRate]} 
                hide 
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                  padding: '8px 12px',
                }}
                labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number) => [
                  `${value.toFixed(6)} ${toCurrency.ticker.toUpperCase()}`,
                  'Rate'
                ]}
              />
              <Area
                type="monotone"
                dataKey="rate"
                stroke={priceChange.isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))"}
                strokeWidth={2}
                fill="url(#rateGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      
      {/* Rate Info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Current Rate</span>
        <span className="font-mono">
          1 {fromCurrency.ticker.toUpperCase()} = {currentRate.toFixed(6)} {toCurrency.ticker.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
