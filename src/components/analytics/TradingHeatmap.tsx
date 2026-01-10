import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TradingHeatmapProps {
  trades: Array<{ timestamp: number }>;
  isLoading?: boolean;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Get intensity level 0-4 based on trade count
function getIntensity(count: number, max: number): number {
  if (count === 0) return 0;
  if (max === 0) return 0;
  const ratio = count / max;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

export const TradingHeatmap = memo(function TradingHeatmap({ 
  trades, 
  isLoading = false 
}: TradingHeatmapProps) {
  const { heatmapData, maxCount, totalTrades, peakDay, peakHour } = useMemo(() => {
    // Create 7x24 grid (days x hours)
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    let max = 0;

    trades.forEach(trade => {
      const date = new Date(trade.timestamp);
      const day = date.getDay();
      const hour = date.getHours();
      grid[day][hour]++;
      if (grid[day][hour] > max) max = grid[day][hour];
    });

    // Find peak trading times
    let peakDayIdx = 0;
    let peakHourIdx = 0;
    let peakDayCount = 0;
    let peakHourCount = 0;

    const dayCounts = grid.map(row => row.reduce((a, b) => a + b, 0));
    const hourCounts = HOURS.map(h => grid.reduce((sum, row) => sum + row[h], 0));

    dayCounts.forEach((count, idx) => {
      if (count > peakDayCount) {
        peakDayCount = count;
        peakDayIdx = idx;
      }
    });

    hourCounts.forEach((count, idx) => {
      if (count > peakHourCount) {
        peakHourCount = count;
        peakHourIdx = idx;
      }
    });

    return {
      heatmapData: grid,
      maxCount: max,
      totalTrades: trades.length,
      peakDay: peakDayCount > 0 ? DAYS[peakDayIdx] : null,
      peakHour: peakHourCount > 0 ? `${peakHourIdx}:00` : null,
    };
  }, [trades]);

  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Trading Activity Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex gap-1">
                {Array.from({ length: 12 }).map((_, j) => (
                  <div key={j} className="w-4 h-4 bg-muted rounded-sm" />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const intensityColors = [
    'bg-muted/30',
    'bg-primary/20',
    'bg-primary/40',
    'bg-primary/60',
    'bg-primary/80',
  ];

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          Trading Activity Heatmap
        </CardTitle>
        <CardDescription>
          When you trade most actively
        </CardDescription>
      </CardHeader>
      <CardContent>
        {totalTrades === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Calendar className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No trading data yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Heatmap Grid - Show 6-hour blocks for compactness */}
            <div className="overflow-x-auto">
              <div className="min-w-[300px]">
                {/* Hour labels */}
                <div className="flex gap-1 mb-1 ml-10">
                  {[0, 6, 12, 18].map(h => (
                    <div key={h} className="flex-1 text-xs text-muted-foreground text-center">
                      {h === 0 ? '12am' : h === 6 ? '6am' : h === 12 ? '12pm' : '6pm'}
                    </div>
                  ))}
                </div>
                
                {/* Days */}
                {DAYS.map((day, dayIdx) => (
                  <div key={day} className="flex items-center gap-1 mb-1">
                    <span className="w-8 text-xs text-muted-foreground">{day}</span>
                    <div className="flex gap-0.5 flex-1">
                      {/* Show 4 blocks per day (6-hour chunks) */}
                      {[0, 6, 12, 18].map(startHour => {
                        const count = heatmapData[dayIdx]
                          .slice(startHour, startHour + 6)
                          .reduce((a, b) => a + b, 0);
                        const intensity = getIntensity(count, maxCount * 6);
                        
                        return (
                          <div
                            key={startHour}
                            className={cn(
                              'flex-1 h-6 rounded-sm transition-colors cursor-default',
                              intensityColors[intensity]
                            )}
                            title={`${day} ${startHour}:00-${startHour + 5}:59: ${count} trades`}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <span>Less</span>
                {intensityColors.map((color, i) => (
                  <div key={i} className={cn('w-3 h-3 rounded-sm', color)} />
                ))}
                <span>More</span>
              </div>
              
              {/* Peak times */}
              <div className="flex items-center gap-3">
                {peakDay && (
                  <span className="flex items-center gap-1">
                    <Flame className="w-3 h-3 text-orange-500" />
                    Peak: {peakDay}
                  </span>
                )}
                {peakHour && (
                  <span className="flex items-center gap-1">
                    @ {peakHour}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
