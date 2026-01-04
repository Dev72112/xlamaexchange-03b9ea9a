import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Activity, Target, Shield, Clock, ChevronDown, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { usePricePrediction, PricePrediction as PricePredictionType } from '@/hooks/usePricePrediction';
import { SUPPORTED_CHAINS } from '@/data/chains';
import { cn } from '@/lib/utils';

interface PricePredictionProps {
  chainIndex?: string;
  tokenAddress?: string;
  tokenSymbol?: string;
  className?: string;
}

export function PricePrediction({ 
  chainIndex = '1', 
  tokenAddress,
  tokenSymbol = 'Token',
  className 
}: PricePredictionProps) {
  const { predict, prediction, isLoading, error } = usePricePrediction();
  const [timeframe, setTimeframe] = useState<'1H' | '4H' | '1D'>('1H');
  const [showSignals, setShowSignals] = useState(false);

  const handlePredict = async () => {
    if (!tokenAddress) return;
    await predict(chainIndex, tokenAddress, timeframe);
  };

  const getTrendIcon = (trend: PricePredictionType['trend']) => {
    switch (trend) {
      case 'bullish':
        return <TrendingUp className="w-5 h-5 text-primary" />;
      case 'bearish':
        return <TrendingDown className="w-5 h-5 text-destructive" />;
      default:
        return <Minus className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getSignalIcon = (signal: 'bullish' | 'bearish' | 'neutral') => {
    switch (signal) {
      case 'bullish':
        return <TrendingUp className="w-3.5 h-3.5 text-primary" />;
      case 'bearish':
        return <TrendingDown className="w-3.5 h-3.5 text-destructive" />;
      default:
        return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const getConfidenceBadge = (confidence: PricePredictionType['confidence']) => {
    const variants = {
      high: 'bg-primary/20 text-primary border-primary/30',
      medium: 'bg-warning/20 text-warning border-warning/30',
      low: 'bg-muted text-muted-foreground border-border',
    };
    return (
      <Badge variant="outline" className={cn('text-xs', variants[confidence])}>
        {confidence.charAt(0).toUpperCase() + confidence.slice(1)} Confidence
      </Badge>
    );
  };

  const formatPrice = (price: number) => {
    if (price < 0.0001) return price.toExponential(4);
    if (price < 1) return price.toFixed(6);
    if (price < 1000) return price.toFixed(4);
    return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  return (
    <Card className={cn("bg-card border-border", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Price Prediction
          </CardTitle>
          <Select value={timeframe} onValueChange={(v) => setTimeframe(v as '1H' | '4H' | '1D')}>
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1H">1 Hour</SelectItem>
              <SelectItem value="4H">4 Hours</SelectItem>
              <SelectItem value="1D">1 Day</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!tokenAddress ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Select a token to view price prediction
          </p>
        ) : !prediction ? (
          <div className="text-center py-4">
            <Button onClick={handlePredict} disabled={isLoading} size="sm">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4 mr-2" />
                  Generate Prediction
                </>
              )}
            </Button>
            {error && (
              <p className="text-xs text-destructive mt-2">{error}</p>
            )}
          </div>
        ) : (
          <>
            {/* Main Prediction */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Predicted Price ({prediction.timeframe})</p>
                <div className="flex items-center gap-2">
                  {getTrendIcon(prediction.trend)}
                  <span className="text-lg font-bold">${formatPrice(prediction.predictedPrice)}</span>
                </div>
                <div className={cn(
                  "text-sm font-medium mt-0.5",
                  prediction.predictedChange > 0 ? "text-primary" : 
                  prediction.predictedChange < 0 ? "text-destructive" : "text-muted-foreground"
                )}>
                  {prediction.predictedChange > 0 ? '+' : ''}{prediction.predictedChange.toFixed(2)}%
                </div>
              </div>
              <div className="text-right">
                {getConfidenceBadge(prediction.confidence)}
                <p className="text-xs text-muted-foreground mt-2">
                  Current: ${formatPrice(prediction.currentPrice)}
                </p>
              </div>
            </div>

            {/* Support & Resistance */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Shield className="w-3 h-3" />
                  Support
                </div>
                <p className="text-sm font-semibold text-primary">
                  ${formatPrice(prediction.supportLevel)}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-destructive/5 border border-destructive/20">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Target className="w-3 h-3" />
                  Resistance
                </div>
                <p className="text-sm font-semibold text-destructive">
                  ${formatPrice(prediction.resistanceLevel)}
                </p>
              </div>
            </div>

            {/* Technical Signals */}
            <Collapsible open={showSignals} onOpenChange={setShowSignals}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between h-8">
                  <span className="text-xs">Technical Signals ({prediction.signals.length})</span>
                  <ChevronDown className={cn(
                    "w-4 h-4 transition-transform",
                    showSignals && "rotate-180"
                  )} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="space-y-1.5">
                  {prediction.signals.map((signal, i) => (
                    <div 
                      key={i}
                      className="flex items-center justify-between py-1.5 px-2 rounded bg-secondary/20"
                    >
                      <div className="flex items-center gap-2">
                        {getSignalIcon(signal.signal)}
                        <span className="text-xs">{signal.name}</span>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">
                        {signal.value}
                      </span>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Refresh Button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePredict} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Clock className="w-4 h-4 mr-2" />
              )}
              Refresh Prediction
            </Button>

            <p className="text-[10px] text-muted-foreground text-center">
              Predictions based on technical analysis. Not financial advice.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
