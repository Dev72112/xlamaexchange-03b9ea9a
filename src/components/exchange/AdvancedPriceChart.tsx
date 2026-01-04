import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Wifi, Settings2, Maximize2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { okxDexService, CandlestickData, OkxToken } from '@/services/okxdex';
import { Chain } from '@/data/chains';
import { cn } from '@/lib/utils';
import { useWebSocketPrice } from '@/hooks/useWebSocketPrice';
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  OHLCData,
} from '@/lib/technicalIndicators';
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  Line,
  Area,
  ReferenceLine,
  Cell,
} from 'recharts';

interface AdvancedPriceChartProps {
  chain: Chain | null;
  token: OkxToken | null;
  className?: string;
}

const TIME_FRAMES = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '30m', label: '30m' },
  { value: '1H', label: '1H' },
  { value: '4H', label: '4H' },
  { value: '1D', label: '1D' },
  { value: '1W', label: '1W' },
];

interface IndicatorSettings {
  showSMA: boolean;
  smaPeriod: number;
  showEMA: boolean;
  emaPeriod: number;
  showBollinger: boolean;
  bollingerPeriod: number;
  showRSI: boolean;
  showMACD: boolean;
  chartType: 'candle' | 'line' | 'area';
}

export function AdvancedPriceChart({ chain, token, className }: AdvancedPriceChartProps) {
  const [candlesticks, setCandlesticks] = useState<CandlestickData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [timeFrame, setTimeFrame] = useState('1H');
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [indicators, setIndicators] = useState<IndicatorSettings>({
    showSMA: false,
    smaPeriod: 20,
    showEMA: true,
    emaPeriod: 12,
    showBollinger: false,
    bollingerPeriod: 20,
    showRSI: false,
    showMACD: false,
    chartType: 'candle',
  });

  const { price: livePrice, isConnected: isLiveConnected } = useWebSocketPrice({
    chainIndex: chain?.chainIndex || '',
    tokenContractAddress: token?.tokenContractAddress || '',
    enabled: !!chain && !!token,
  });

  useEffect(() => {
    const fetchCandlesticks = async () => {
      if (!chain || !token) {
        setCandlesticks([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = await okxDexService.getCandlesticks(
          chain.chainIndex,
          token.tokenContractAddress,
          timeFrame,
          100
        );
        setCandlesticks(data.reverse());
      } catch (err) {
        console.error('Failed to fetch candlesticks:', err);
        setError('Failed to load chart data');
        setCandlesticks([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCandlesticks();
  }, [chain?.chainIndex, token?.tokenContractAddress, timeFrame]);

  const { chartData, ohlcData } = useMemo(() => {
    const ohlc: OHLCData[] = candlesticks.map((candle) => ({
      open: parseFloat(candle.o),
      high: parseFloat(candle.h),
      low: parseFloat(candle.l),
      close: parseFloat(candle.c),
      volume: parseFloat(candle.volUsd),
      timestamp: parseInt(candle.ts),
    }));

    const sma = indicators.showSMA ? calculateSMA(ohlc, indicators.smaPeriod) : [];
    const ema = indicators.showEMA ? calculateEMA(ohlc, indicators.emaPeriod) : [];
    const bollinger = indicators.showBollinger ? calculateBollingerBands(ohlc, indicators.bollingerPeriod) : null;
    const rsi = indicators.showRSI ? calculateRSI(ohlc) : [];
    const macd = indicators.showMACD ? calculateMACD(ohlc) : null;

    const data = candlesticks.map((candle, i) => {
      const open = parseFloat(candle.o);
      const close = parseFloat(candle.c);
      const high = parseFloat(candle.h);
      const low = parseFloat(candle.l);
      const isUp = close >= open;

      return {
        time: new Date(parseInt(candle.ts)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: parseInt(candle.ts),
        open,
        close,
        high,
        low,
        volume: parseFloat(candle.volUsd),
        // Candlestick body
        candleHigh: Math.max(open, close),
        candleLow: Math.min(open, close),
        wickHigh: high,
        wickLow: low,
        isUp,
        color: isUp ? 'hsl(var(--success))' : 'hsl(var(--destructive))',
        // Indicators
        sma: sma[i],
        ema: ema[i],
        bollingerUpper: bollinger?.upper[i],
        bollingerMiddle: bollinger?.middle[i],
        bollingerLower: bollinger?.lower[i],
        rsi: rsi[i],
        macd: macd?.macd[i],
        macdSignal: macd?.signal[i],
        macdHistogram: macd?.histogram[i],
      };
    });

    return { chartData: data, ohlcData: ohlc };
  }, [candlesticks, indicators]);

  const { priceChangePercent, currentPrice, isPositive } = useMemo(() => {
    if (livePrice?.price) {
      const liveNum = parseFloat(livePrice.price);
      const change24H = parseFloat(livePrice.change24H || '0');
      return {
        priceChangePercent: change24H,
        currentPrice: liveNum,
        isPositive: change24H >= 0,
      };
    }

    if (chartData.length < 2) {
      return { priceChangePercent: 0, currentPrice: 0, isPositive: true };
    }
    const first = chartData[0];
    const last = chartData[chartData.length - 1];
    const change = last.close - first.open;
    const changePercent = (change / first.open) * 100;
    return {
      priceChangePercent: changePercent,
      currentPrice: last.close,
      isPositive: change >= 0,
    };
  }, [chartData, livePrice]);

  const formatPrice = (price: number) => {
    if (price >= 10000) return `$${(price / 1000).toFixed(1)}K`;
    if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.0001) return `$${price.toFixed(6)}`;
    return `$${price.toFixed(8)}`;
  };

  if (!chain || !token) {
    return null;
  }

  const chartHeight = isFullscreen ? 500 : indicators.showRSI || indicators.showMACD ? 280 : 200;

  return (
    <Card className={cn(
      "bg-card/50 backdrop-blur-sm border-border",
      isFullscreen && "fixed inset-4 z-50",
      className
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <img
              src={token.tokenLogoUrl}
              alt={token.tokenSymbol}
              className="w-8 h-8 rounded-full"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${token.tokenSymbol}&background=random`;
              }}
            />
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                {token.tokenSymbol}
                {isLiveConnected && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-1">
                    <Wifi className="w-2.5 h-2.5 text-success" />
                    Live
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono">{formatPrice(currentPrice)}</span>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs",
                    isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                  )}
                >
                  {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  {Math.abs(priceChangePercent).toFixed(2)}%
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Indicator Settings */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings2 className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="space-y-3">
                  <div className="font-medium text-sm">Indicators</div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">SMA ({indicators.smaPeriod})</span>
                    <Switch
                      checked={indicators.showSMA}
                      onCheckedChange={(v) => setIndicators(prev => ({ ...prev, showSMA: v }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">EMA ({indicators.emaPeriod})</span>
                    <Switch
                      checked={indicators.showEMA}
                      onCheckedChange={(v) => setIndicators(prev => ({ ...prev, showEMA: v }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Bollinger Bands</span>
                    <Switch
                      checked={indicators.showBollinger}
                      onCheckedChange={(v) => setIndicators(prev => ({ ...prev, showBollinger: v }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">RSI (14)</span>
                    <Switch
                      checked={indicators.showRSI}
                      onCheckedChange={(v) => setIndicators(prev => ({ ...prev, showRSI: v }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">MACD</span>
                    <Switch
                      checked={indicators.showMACD}
                      onCheckedChange={(v) => setIndicators(prev => ({ ...prev, showMACD: v }))}
                    />
                  </div>

                  <div className="border-t pt-3">
                    <div className="font-medium text-sm mb-2">Chart Type</div>
                    <div className="flex gap-1">
                      {(['candle', 'line', 'area'] as const).map((type) => (
                        <Button
                          key={type}
                          variant={indicators.chartType === type ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setIndicators(prev => ({ ...prev, chartType: type }))}
                          className="flex-1 capitalize"
                        >
                          {type}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Fullscreen Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>

            {/* Timeframes - scrollable on mobile */}
            <div className="flex gap-1 bg-secondary/50 rounded-lg p-1 overflow-x-auto max-w-[200px] sm:max-w-none scrollbar-hide">
              {TIME_FRAMES.map((tf) => (
                <Button
                  key={tf.value}
                  variant={timeFrame === tf.value ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTimeFrame(tf.value)}
                  className="h-7 text-xs px-2 flex-shrink-0"
                >
                  {tf.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div style={{ height: chartHeight }} className="flex items-center justify-center">
            <Skeleton className="w-full h-full rounded-lg" />
          </div>
        ) : error ? (
          <div style={{ height: chartHeight }} className="flex flex-col items-center justify-center text-muted-foreground">
            <BarChart3 className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">{error}</p>
          </div>
        ) : chartData.length === 0 ? (
          <div style={{ height: chartHeight }} className="flex flex-col items-center justify-center text-muted-foreground">
            <BarChart3 className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No chart data available</p>
          </div>
        ) : (
          <div style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  yAxisId="price"
                  domain={['auto', 'auto']}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => formatPrice(value).replace('$', '')}
                  width={60}
                  orientation="right"
                />
                <YAxis
                  yAxisId="volume"
                  domain={[0, 'auto']}
                  axisLine={false}
                  tickLine={false}
                  tick={false}
                  width={0}
                  orientation="left"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'close' || name === 'candleHigh') return [formatPrice(value), 'Price'];
                    if (name === 'volume') return [`$${value.toLocaleString()}`, 'Volume'];
                    if (name === 'sma') return [formatPrice(value), `SMA(${indicators.smaPeriod})`];
                    if (name === 'ema') return [formatPrice(value), `EMA(${indicators.emaPeriod})`];
                    if (name === 'rsi') return [value.toFixed(2), 'RSI'];
                    return [value, name];
                  }}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                
                {/* Reference line at open price */}
                <ReferenceLine
                  y={chartData[0]?.open}
                  yAxisId="price"
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
                
                {/* Volume bars */}
                <Bar dataKey="volume" fill="hsl(var(--muted-foreground))" opacity={0.2} yAxisId="volume" />
                
                {/* Bollinger Bands */}
                {indicators.showBollinger && (
                  <>
                    <Area
                      type="monotone"
                      dataKey="bollingerUpper"
                      stroke="hsl(var(--primary))"
                      strokeWidth={1}
                      strokeOpacity={0.3}
                      fill="hsl(var(--primary))"
                      fillOpacity={0.05}
                      yAxisId="price"
                    />
                    <Line
                      type="monotone"
                      dataKey="bollingerMiddle"
                      stroke="hsl(var(--primary))"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      dot={false}
                      yAxisId="price"
                    />
                    <Area
                      type="monotone"
                      dataKey="bollingerLower"
                      stroke="hsl(var(--primary))"
                      strokeWidth={1}
                      strokeOpacity={0.3}
                      fill="transparent"
                      yAxisId="price"
                    />
                  </>
                )}

                {/* Price rendering based on chart type */}
                {indicators.chartType === 'candle' ? (
                  <>
                    {/* Candlestick wicks - render as thin bars from low to high */}
                    <Bar 
                      dataKey="wickHigh" 
                      yAxisId="price" 
                      barSize={1}
                      fill="hsl(var(--muted-foreground))"
                      opacity={0.6}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`wick-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                    {/* Candlestick bodies - render as thicker bars */}
                    <Bar 
                      dataKey="candleHigh" 
                      yAxisId="price" 
                      barSize={8}
                    >
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`body-${index}`} 
                          fill={entry.isUp ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)'} 
                        />
                      ))}
                    </Bar>
                  </>
                ) : indicators.chartType === 'area' ? (
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke={isPositive ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                    strokeWidth={2}
                    fill={isPositive ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                    fillOpacity={0.1}
                    yAxisId="price"
                  />
                ) : (
                  <Line
                    type="monotone"
                    dataKey="close"
                    stroke={isPositive ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    yAxisId="price"
                  />
                )}

                {/* SMA */}
                {indicators.showSMA && (
                  <Line
                    type="monotone"
                    dataKey="sma"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={1.5}
                    dot={false}
                    yAxisId="price"
                  />
                )}

                {/* EMA */}
                {indicators.showEMA && (
                  <Line
                    type="monotone"
                    dataKey="ema"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={1.5}
                    dot={false}
                    yAxisId="price"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* RSI Sub-chart */}
        {indicators.showRSI && chartData.length > 0 && (
          <div className="h-[60px] mt-2 border-t pt-2">
            <div className="text-xs text-muted-foreground mb-1">RSI (14)</div>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="time" hide />
                <YAxis
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
                  width={25}
                  ticks={[30, 70]}
                />
                <ReferenceLine y={70} stroke="hsl(var(--destructive))" strokeDasharray="3 3" strokeOpacity={0.5} />
                <ReferenceLine y={30} stroke="hsl(var(--success))" strokeDasharray="3 3" strokeOpacity={0.5} />
                <Line type="monotone" dataKey="rsi" stroke="hsl(var(--chart-3))" strokeWidth={1} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* MACD Sub-chart */}
        {indicators.showMACD && chartData.length > 0 && (
          <div className="h-[60px] mt-2 border-t pt-2">
            <div className="text-xs text-muted-foreground mb-1">MACD</div>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="time" hide />
                <YAxis
                  domain={['auto', 'auto']}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
                  width={25}
                />
                <ReferenceLine y={0} stroke="hsl(var(--border))" />
                <Bar dataKey="macdHistogram" barSize={3}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`macd-${index}`} 
                      fill={(entry.macdHistogram || 0) >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'} 
                      opacity={0.5}
                    />
                  ))}
                </Bar>
                <Line type="monotone" dataKey="macd" stroke="hsl(var(--chart-4))" strokeWidth={1} dot={false} />
                <Line type="monotone" dataKey="macdSignal" stroke="hsl(var(--chart-5))" strokeWidth={1} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
