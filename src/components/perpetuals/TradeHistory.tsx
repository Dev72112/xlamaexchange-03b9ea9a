/**
 * Trade History Component
 * 
 * Displays executed trades with fill prices, PnL, and fees.
 */

import { memo, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  TrendingUp,
  TrendingDown,
  History,
  Search,
  Download,
  ExternalLink,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface TradeFill {
  time: number;
  coin: string;
  side: 'B' | 'S';
  px: string;
  sz: string;
  startPosition: string;
  closedPnl: string;
  hash: string;
  fee: string;
  feeToken: string;
}

interface TradeHistoryProps {
  trades: TradeFill[];
  isLoading?: boolean;
  className?: string;
}

export const TradeHistory = memo(function TradeHistory({
  trades,
  isLoading,
  className,
}: TradeHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter and sort trades
  const filteredTrades = useMemo(() => {
    if (!trades) return [];
    
    let filtered = [...trades];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (trade) => trade.coin.toLowerCase().includes(term)
      );
    }
    
    // Sort by time descending (most recent first)
    return filtered.sort((a, b) => b.time - a.time);
  }, [trades, searchTerm]);

  // Calculate totals
  const totals = useMemo(() => {
    if (!trades || trades.length === 0) {
      return { totalPnl: 0, totalFees: 0, totalVolume: 0 };
    }
    
    return trades.reduce(
      (acc, trade) => ({
        totalPnl: acc.totalPnl + parseFloat(trade.closedPnl || '0'),
        totalFees: acc.totalFees + parseFloat(trade.fee || '0'),
        totalVolume: acc.totalVolume + parseFloat(trade.sz || '0') * parseFloat(trade.px || '0'),
      }),
      { totalPnl: 0, totalFees: 0, totalVolume: 0 }
    );
  }, [trades]);

  const handleExport = () => {
    if (!trades || trades.length === 0) return;
    
    const csv = [
      ['Time', 'Coin', 'Side', 'Price', 'Size', 'PnL', 'Fee', 'Hash'].join(','),
      ...trades.map((trade) =>
        [
          new Date(trade.time).toISOString(),
          trade.coin,
          trade.side === 'B' ? 'Buy' : 'Sell',
          trade.px,
          trade.sz,
          trade.closedPnl,
          trade.fee,
          trade.hash,
        ].join(',')
      ),
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hyperliquid-trades-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card className={cn("glass border-border/50", className)}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-pulse text-muted-foreground">Loading trades...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("glass border-border/50", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            Trade History
            {trades.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {trades.length} trades
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Filter by coin..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 w-40 pl-8 text-xs"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={handleExport}
              disabled={!trades || trades.length === 0}
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </Button>
          </div>
        </div>
        
        {/* Summary Stats */}
        {trades.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="p-2 rounded-lg bg-secondary/50 text-center">
              <p className="text-xs text-muted-foreground mb-0.5">Total PnL</p>
              <p className={cn(
                "text-sm font-mono font-bold",
                totals.totalPnl >= 0 ? "text-success" : "text-destructive"
              )}>
                {totals.totalPnl >= 0 ? '+' : ''}${totals.totalPnl.toFixed(2)}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-secondary/50 text-center">
              <p className="text-xs text-muted-foreground mb-0.5">Fees Paid</p>
              <p className="text-sm font-mono font-bold">${totals.totalFees.toFixed(2)}</p>
            </div>
            <div className="p-2 rounded-lg bg-secondary/50 text-center">
              <p className="text-xs text-muted-foreground mb-0.5">Volume</p>
              <p className="text-sm font-mono font-bold">
                ${totals.totalVolume >= 1000000 
                  ? `${(totals.totalVolume / 1000000).toFixed(2)}M` 
                  : totals.totalVolume >= 1000 
                    ? `${(totals.totalVolume / 1000).toFixed(2)}K`
                    : totals.totalVolume.toFixed(2)}
              </p>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {filteredTrades.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No trade history</p>
            <p className="text-xs mt-1">Your executed trades will appear here</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">Time</TableHead>
                  <TableHead className="text-xs">Pair</TableHead>
                  <TableHead className="text-xs">Side</TableHead>
                  <TableHead className="text-xs text-right">Price</TableHead>
                  <TableHead className="text-xs text-right">Size</TableHead>
                  <TableHead className="text-xs text-right">PnL</TableHead>
                  <TableHead className="text-xs text-right">Fee</TableHead>
                  <TableHead className="text-xs w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrades.map((trade, idx) => {
                  const isBuy = trade.side === 'B';
                  const pnl = parseFloat(trade.closedPnl || '0');
                  const fee = parseFloat(trade.fee || '0');
                  
                  return (
                    <TableRow key={`${trade.hash}-${idx}`} className="text-xs">
                      <TableCell className="font-mono text-muted-foreground py-2">
                        {format(new Date(trade.time), 'MMM dd HH:mm')}
                      </TableCell>
                      <TableCell className="font-medium py-2">
                        {trade.coin}-PERP
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs gap-1",
                            isBuy ? "text-success border-success/30" : "text-destructive border-destructive/30"
                          )}
                        >
                          {isBuy ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {isBuy ? 'Buy' : 'Sell'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono py-2">
                        ${parseFloat(trade.px).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono py-2">
                        {parseFloat(trade.sz).toFixed(4)}
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-mono py-2",
                        pnl > 0 ? "text-success" : pnl < 0 ? "text-destructive" : ""
                      )}>
                        {pnl !== 0 && (
                          <>
                            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                          </>
                        )}
                        {pnl === 0 && '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground py-2">
                        ${fee.toFixed(4)}
                      </TableCell>
                      <TableCell className="py-2">
                        {trade.hash && (
                          <a
                            href={`https://app.hyperliquid.xyz/explorer/tx/${trade.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
});
