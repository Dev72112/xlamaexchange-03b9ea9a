import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Wallet, Coins, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { WalletTokenBalance } from '@/services/okxdex';
import { cn } from '@/lib/utils';

interface PortfolioSummaryCardProps {
  totalValue: number;
  previousValue?: number;
  balances: WalletTokenBalance[];
  isLoading: boolean;
  className?: string;
}

// Common stablecoins
const STABLECOINS = ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'FRAX', 'USDP', 'USDD', 'GUSD', 'PYUSD'];

// Animated counter for value changes
function AnimatedValue({ value, prefix = '$' }: { value: number; prefix?: string }) {
  const formatValue = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(2)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(2)}K`;
    return val.toFixed(2);
  };

  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {prefix}{formatValue(value)}
    </motion.span>
  );
}

export function PortfolioSummaryCard({
  totalValue,
  previousValue,
  balances,
  isLoading,
  className
}: PortfolioSummaryCardProps) {
  // Calculate stablecoin vs other split
  const { stablecoinValue, otherValue, stablecoinPercentage } = useMemo(() => {
    let stableTotal = 0;
    let otherTotal = 0;

    balances.forEach(b => {
      const value = parseFloat(b.tokenPrice || '0') * parseFloat(b.balance || '0');
      if (STABLECOINS.includes(b.symbol.toUpperCase())) {
        stableTotal += value;
      } else {
        otherTotal += value;
      }
    });

    return {
      stablecoinValue: stableTotal,
      otherValue: otherTotal,
      stablecoinPercentage: totalValue > 0 ? (stableTotal / totalValue) * 100 : 0,
    };
  }, [balances, totalValue]);

  // Calculate 24h change (if we have previous value)
  const change = useMemo(() => {
    if (!previousValue || previousValue === 0) return null;
    const absoluteChange = totalValue - previousValue;
    const percentChange = ((totalValue - previousValue) / previousValue) * 100;
    return { absoluteChange, percentChange };
  }, [totalValue, previousValue]);

  if (isLoading) {
    return (
      <Card className={cn("glass border-border/50", className)}>
        <CardContent className="py-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-20 skeleton-shimmer rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const statItems = [
    {
      icon: Wallet,
      label: 'Total Value',
      value: totalValue,
      change,
      iconColor: 'text-primary',
      glowColor: 'shadow-primary/20'
    },
    {
      icon: Coins,
      label: 'Assets',
      value: balances.length,
      isCount: true,
      subtitle: 'tokens tracked',
      iconColor: 'text-chart-2',
      glowColor: 'shadow-chart-2/20'
    },
    {
      icon: Shield,
      label: 'Stablecoins',
      value: stablecoinValue,
      percentage: stablecoinPercentage,
      iconColor: 'text-success',
      glowColor: 'shadow-success/20'
    },
    {
      icon: TrendingUp,
      label: 'Volatile',
      value: otherValue,
      riskPercentage: 100 - stablecoinPercentage,
      iconColor: 'text-chart-4',
      glowColor: 'shadow-chart-4/20'
    }
  ];

  return (
    <Card className={cn("glass border-border/50 overflow-hidden", className)}>
      {/* Gradient top border */}
      <div className="h-1 bg-gradient-to-r from-primary via-chart-2 to-chart-4" />
      
      <CardContent className="py-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statItems.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "relative p-4 rounded-xl bg-secondary/30 border border-border/30",
                "hover:bg-secondary/50 hover:border-border/50 transition-all hover-lift",
                `hover:${item.glowColor}`
              )}
            >
              {/* Icon with glow */}
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("p-1.5 rounded-lg bg-secondary/50", item.iconColor)}>
                  <item.icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">{item.label}</span>
              </div>

              {/* Value */}
              <p className="text-2xl font-bold">
                {item.isCount ? (
                  item.value
                ) : (
                  <AnimatedValue value={item.value as number} />
                )}
              </p>

              {/* Additional info */}
              {item.change && (
                <motion.div 
                  className={cn(
                    "flex items-center gap-1 text-xs mt-1",
                    item.change.absoluteChange >= 0 ? "text-success" : "text-destructive"
                  )}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {item.change.absoluteChange >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>
                    {item.change.absoluteChange >= 0 ? '+' : ''}
                    <AnimatedValue value={item.change.absoluteChange} />
                    <span className="text-muted-foreground ml-1">
                      ({item.change.percentChange.toFixed(1)}%)
                    </span>
                  </span>
                </motion.div>
              )}

              {item.subtitle && (
                <p className="text-xs text-muted-foreground mt-1">{item.subtitle}</p>
              )}

              {item.percentage !== undefined && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-[10px] font-medium">
                    {item.percentage.toFixed(0)}%
                  </Badge>
                  <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-success rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${item.percentage}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </div>
              )}

              {item.riskPercentage !== undefined && (
                <Badge variant="secondary" className="text-[10px] font-medium mt-2">
                  {item.riskPercentage.toFixed(0)}% risk exposure
                </Badge>
              )}
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
