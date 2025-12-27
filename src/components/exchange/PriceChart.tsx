import { useState, useEffect, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Loader2, AlertCircle } from "lucide-react";
import { Currency } from "@/data/currencies";
import { supabase } from "@/integrations/supabase/client";

interface PriceChartProps {
  fromCurrency: Currency;
  toCurrency: Currency;
  currentRate: number | null;
}

interface ChartDataPoint {
  time: string;
  rate: number;
}

interface PriceHistoryResponse {
  prices: { timestamp: number; rate: number }[];
  error?: string;
}

export function PriceChart({ fromCurrency, toCurrency, currentRate }: PriceChartProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch real price history
  useEffect(() => {
    if (!currentRate) {
      setChartData([]);
      setError(null);
      return;
    }

    const fetchPriceHistory = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: apiError } = await supabase.functions.invoke<PriceHistoryResponse>('price-history', {
          body: {
            fromTicker: fromCurrency.ticker,
            toTicker: toCurrency.ticker,
          },
        });

        if (apiError || !data?.prices || data.prices.length === 0) {
          console.log('Price history unavailable:', apiError?.message || 'No data');
          setChartData([]);
          setError('Historical data unavailable');
        } else {
          // Convert API response to chart format
          const formattedData: ChartDataPoint[] = data.prices.map((p) => ({
            time: new Date(p.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            rate: parseFloat(p.rate.toFixed(8)),
          }));
          
          setChartData(formattedData);
          setError(null);
        }
      } catch (err) {
        console.error('Price history fetch error:', err);
        setChartData([]);
        setError('Failed to load chart data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPriceHistory();
  }, [fromCurrency.ticker, toCurrency.ticker, currentRate]);

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
        {chartData.length > 0 && (
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
        )}
      </div>

      {/* Chart */}
      <div className="h-24 w-full">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : error || chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <AlertCircle className="w-5 h-5 mb-1 opacity-50" />
            <span className="text-xs">{error || 'No chart data'}</span>
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
              <XAxis dataKey="time" hide />
              <YAxis domain={[minRate, maxRate]} hide />
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
