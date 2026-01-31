/**
 * Enhanced Stat Card Component
 * CSS-based animations - no framer-motion required
 * Reusable metric card with smooth animations, shimmer loading, and variant styles
 */

import { memo, CSSProperties } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, LucideIcon } from 'lucide-react';

interface EnhancedStatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  loading?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'pnl';
  className?: string;
  index?: number;
}

const variantStyles = {
  default: {
    bg: 'bg-primary/10 group-hover:bg-primary/20',
    icon: 'text-primary',
    glow: 'group-hover:shadow-primary/10',
  },
  success: {
    bg: 'bg-green-500/10 group-hover:bg-green-500/20',
    icon: 'text-green-500',
    glow: 'group-hover:shadow-green-500/10',
  },
  warning: {
    bg: 'bg-yellow-500/10 group-hover:bg-yellow-500/20',
    icon: 'text-yellow-500',
    glow: 'group-hover:shadow-yellow-500/10',
  },
  danger: {
    bg: 'bg-red-500/10 group-hover:bg-red-500/20',
    icon: 'text-red-500',
    glow: 'group-hover:shadow-red-500/10',
  },
  pnl: {
    bg: '',
    icon: '',
    glow: '',
  },
};

const ShimmerSkeleton = ({ className }: { className?: string }) => (
  <div className={cn("rounded bg-muted/50 animate-pulse relative overflow-hidden", className)}>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
  </div>
);

export const EnhancedStatCard = memo(function EnhancedStatCard({
  icon: Icon,
  label,
  value,
  subValue,
  trend,
  trendValue,
  loading = false,
  variant = 'default',
  className,
  index = 0,
}: EnhancedStatCardProps) {
  // Handle PnL variant dynamically based on trend
  const resolvedVariant = variant === 'pnl' 
    ? (trend === 'up' ? 'success' : trend === 'down' ? 'danger' : 'default')
    : variant;
  
  const styles = variantStyles[resolvedVariant];
  
  // Stagger delay for CSS animation
  const staggerStyle: CSSProperties = {
    animationDelay: `${index * 50}ms`,
  };
  
  if (loading) {
    return (
      <Card className={cn("bg-card/50 border-border/50", className)}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <ShimmerSkeleton className="h-4 w-20" />
              <ShimmerSkeleton className="h-7 w-28" />
              {subValue !== undefined && <ShimmerSkeleton className="h-3 w-24" />}
            </div>
            <ShimmerSkeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      className="animate-fade-in"
      style={staggerStyle}
    >
      <Card className={cn(
        "bg-card/50 border-border/50 transition-all duration-200 group cursor-default",
        "hover:shadow-lg hover:-translate-y-0.5",
        styles.glow,
        className
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1 min-w-0 flex-1">
              <p className="text-xs text-muted-foreground truncate">{label}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <p 
                  className={cn(
                    "text-2xl font-semibold font-mono truncate",
                    variant === 'pnl' && trend === 'up' && 'text-green-500',
                    variant === 'pnl' && trend === 'down' && 'text-red-500'
                  )}
                >
                  {value}
                </p>
                {trend && trend !== 'neutral' && (
                  <span 
                    className={cn(
                      "flex items-center text-xs font-medium whitespace-nowrap animate-fade-in",
                      trend === 'up' ? "text-green-500" : "text-red-500"
                    )}
                    style={{ animationDelay: `${index * 50 + 150}ms` }}
                  >
                    {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {trendValue}
                  </span>
                )}
              </div>
              {subValue && (
                <p className="text-xs text-muted-foreground truncate">{subValue}</p>
              )}
            </div>
            <div className={cn(
              "p-2 rounded-lg transition-all duration-200 flex-shrink-0",
              styles.bg
            )}>
              <Icon className={cn("w-4 h-4 transition-transform group-hover:scale-110", styles.icon)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

export default EnhancedStatCard;