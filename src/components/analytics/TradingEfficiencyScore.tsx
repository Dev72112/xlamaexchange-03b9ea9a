import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, Fuel, Target, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TradingEfficiencyScoreProps {
  // Trade performance
  tradePnlPercent: number;
  hodlPnlPercent: number;
  tradingWasBetter: boolean;
  // Success metrics
  successRate: number;
  winRate: number; // Percentage of profitable trades
  // Gas efficiency
  avgGasPerTrade: number;
  totalGasUsd: number;
  totalVolumeUsd: number;
  isLoading?: boolean;
}

interface ScoreBreakdown {
  label: string;
  score: number;
  maxScore: number;
  icon: any;
  description: string;
}

function calculateScore(props: TradingEfficiencyScoreProps): { 
  totalScore: number; 
  breakdown: ScoreBreakdown[];
  grade: string;
  gradeColor: string;
} {
  const breakdown: ScoreBreakdown[] = [];

  // 1. Trade vs HODL Performance (0-30 points)
  let performanceScore = 0;
  if (props.tradingWasBetter) {
    const outperformance = props.tradePnlPercent - props.hodlPnlPercent;
    performanceScore = Math.min(30, 15 + outperformance * 0.5);
  } else {
    const underperformance = props.hodlPnlPercent - props.tradePnlPercent;
    performanceScore = Math.max(0, 15 - underperformance * 0.5);
  }
  breakdown.push({
    label: 'Performance vs HODL',
    score: Math.round(performanceScore),
    maxScore: 30,
    icon: TrendingUp,
    description: props.tradingWasBetter 
      ? `Outperforming HODL by ${Math.abs(props.tradePnlPercent - props.hodlPnlPercent).toFixed(1)}%`
      : `Underperforming HODL by ${Math.abs(props.tradePnlPercent - props.hodlPnlPercent).toFixed(1)}%`
  });

  // 2. Success Rate (0-25 points)
  const successScore = Math.min(25, (props.successRate / 100) * 25);
  breakdown.push({
    label: 'Transaction Success',
    score: Math.round(successScore),
    maxScore: 25,
    icon: Target,
    description: `${props.successRate.toFixed(0)}% of transactions succeeded`
  });

  // 3. Win Rate - Profitable trades (0-25 points)
  const winScore = Math.min(25, (props.winRate / 100) * 25);
  breakdown.push({
    label: 'Profitable Trades',
    score: Math.round(winScore),
    maxScore: 25,
    icon: Trophy,
    description: `${props.winRate.toFixed(0)}% of trades were profitable`
  });

  // 4. Gas Efficiency (0-20 points)
  // Lower gas cost as % of volume = better
  let gasScore = 20;
  if (props.totalVolumeUsd > 0) {
    const gasRatio = (props.totalGasUsd / props.totalVolumeUsd) * 100;
    if (gasRatio > 5) gasScore = 0;
    else if (gasRatio > 2) gasScore = 5;
    else if (gasRatio > 1) gasScore = 10;
    else if (gasRatio > 0.5) gasScore = 15;
  }
  breakdown.push({
    label: 'Gas Efficiency',
    score: Math.round(gasScore),
    maxScore: 20,
    icon: Fuel,
    description: props.totalVolumeUsd > 0 
      ? `${((props.totalGasUsd / props.totalVolumeUsd) * 100).toFixed(2)}% of volume spent on gas`
      : 'No volume data'
  });

  const totalScore = breakdown.reduce((sum, b) => sum + b.score, 0);

  // Calculate grade
  let grade = 'F';
  let gradeColor = 'text-red-500';
  if (totalScore >= 90) { grade = 'A+'; gradeColor = 'text-green-500'; }
  else if (totalScore >= 80) { grade = 'A'; gradeColor = 'text-green-500'; }
  else if (totalScore >= 70) { grade = 'B'; gradeColor = 'text-emerald-500'; }
  else if (totalScore >= 60) { grade = 'C'; gradeColor = 'text-yellow-500'; }
  else if (totalScore >= 50) { grade = 'D'; gradeColor = 'text-orange-500'; }

  return { totalScore, breakdown, grade, gradeColor };
}

export const TradingEfficiencyScore = memo(function TradingEfficiencyScore(
  props: TradingEfficiencyScoreProps
) {
  const { totalScore, breakdown, grade, gradeColor } = useMemo(
    () => calculateScore(props),
    [props]
  );

  if (props.isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Trading Efficiency Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          Trading Efficiency Score
        </CardTitle>
        <CardDescription>
          Based on performance, success rate, and gas efficiency
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Main Score */}
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold">{totalScore}</span>
              <span className="text-xl text-muted-foreground">/100</span>
            </div>
            <Badge 
              variant="outline" 
              className={cn('text-2xl font-bold px-4 py-2', gradeColor)}
            >
              {grade}
            </Badge>
          </div>

          {/* Score Bar */}
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                'h-full rounded-full transition-all duration-500',
                totalScore >= 70 ? 'bg-green-500' : 
                totalScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              )}
              style={{ width: `${totalScore}%` }}
            />
          </div>

          {/* Breakdown */}
          <div className="space-y-2 pt-2">
            {breakdown.map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium">
                    {item.score}/{item.maxScore}
                  </span>
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(item.score / item.maxScore) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
