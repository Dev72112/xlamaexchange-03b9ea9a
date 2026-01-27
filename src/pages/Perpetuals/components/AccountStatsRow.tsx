/**
 * AccountStatsRow Component
 * 
 * Displays account stats (equity, margin, PnL) in horizontal scrollable cards.
 * Used in both mobile and desktop perpetuals UI.
 */

import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  Wallet, 
  TrendingUp, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight, 
  ArrowDownToLine 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccountStatsRowProps {
  totalEquity: number;
  availableMargin: number;
  realtimePnl: number;
  positionsCount: number;
  onDepositClick: () => void;
  isMobile?: boolean;
  safeMode?: boolean;
}

const formatUsd = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
};

export const AccountStatsRow = memo(function AccountStatsRow({
  totalEquity,
  availableMargin,
  realtimePnl,
  positionsCount,
  onDepositClick,
  isMobile = false,
  safeMode = false,
}: AccountStatsRowProps) {
  if (isMobile) {
    return (
      <ScrollArea className="w-full -mx-4 px-4">
        <div className="flex gap-2 pb-2">
          <Card className="glass-subtle border-border/30 min-w-[120px] flex-shrink-0">
            <CardContent className="p-2.5">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
                <Wallet className="w-3 h-3" />
                Equity
              </div>
              <p className="text-sm font-bold">{formatUsd(totalEquity)}</p>
            </CardContent>
          </Card>
          <Card className="glass-subtle border-border/30 min-w-[120px] flex-shrink-0">
            <CardContent className="p-2.5">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
                <TrendingUp className="w-3 h-3" />
                Available
              </div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold">{formatUsd(availableMargin)}</p>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={onDepositClick}>
                  <ArrowDownToLine className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card className={cn(
            "glass-subtle border-border/30 min-w-[120px] flex-shrink-0",
            realtimePnl >= 0 ? "border-success/20" : "border-destructive/20"
          )}>
            <CardContent className="p-2.5">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
                {realtimePnl >= 0 ? <ArrowUpRight className="w-3 h-3 text-success" /> : <ArrowDownRight className="w-3 h-3 text-destructive" />}
                PnL
              </div>
              <p className={cn("text-sm font-bold", realtimePnl >= 0 ? "text-success" : "text-destructive")}>
                {realtimePnl >= 0 ? '+' : ''}{formatUsd(realtimePnl)}
              </p>
            </CardContent>
          </Card>
          <Card className="glass-subtle border-border/30 min-w-[80px] flex-shrink-0">
            <CardContent className="p-2.5">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
                <BarChart3 className="w-3 h-3" />
                Pos
              </div>
              <p className="text-sm font-bold">{positionsCount}</p>
            </CardContent>
          </Card>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    );
  }

  // Desktop grid layout
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="glass border-border/50 hover-lift">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Equity</span>
          </div>
          <p className="text-lg font-bold">{formatUsd(totalEquity)}</p>
        </CardContent>
      </Card>
      <Card className="glass border-border/50 hover-lift">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-lg font-bold">{formatUsd(availableMargin)}</p>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onDepositClick}>
              <ArrowDownToLine className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card className="glass border-border/50 hover-lift">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Positions</span>
          </div>
          <p className="text-lg font-bold">{positionsCount}</p>
        </CardContent>
      </Card>
      <Card className={cn("glass border-border/50 hover-lift", realtimePnl >= 0 ? "border-success/20" : "border-destructive/20")}>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-1">
            {realtimePnl >= 0 ? <ArrowUpRight className="w-4 h-4 text-success" /> : <ArrowDownRight className="w-4 h-4 text-destructive" />}
            <span className="text-xs text-muted-foreground">Unrealized PnL</span>
            {!safeMode && <Badge variant="outline" className="text-[10px] px-1 py-0">LIVE</Badge>}
          </div>
          <p className={cn("text-lg font-bold", realtimePnl >= 0 ? "text-success" : "text-destructive")}>
            {realtimePnl >= 0 ? '+' : ''}{formatUsd(realtimePnl)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
});
