/**
 * Stats Display Component
 * Consistent stat/metric displays across the app
 */

import { memo, ReactNode } from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

export interface StatItemProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: LucideIcon;
  trend?: number | null; // percentage change
  isLoading?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  tooltip?: string;
}

export const StatItem = memo(function StatItem({
  label,
  value,
  subValue,
  icon: Icon,
  trend,
  isLoading = false,
  className,
  size = 'md',
  tooltip,
}: StatItemProps) {
  const sizeClasses = {
    sm: { value: 'text-lg font-semibold', label: 'text-xs', icon: 'w-4 h-4' },
    md: { value: 'text-2xl font-bold', label: 'text-sm', icon: 'w-5 h-5' },
    lg: { value: 'text-3xl font-bold', label: 'text-base', icon: 'w-6 h-6' },
  };

  const TrendIcon = trend === null || trend === 0 
    ? Minus 
    : trend > 0 
      ? TrendingUp 
      : TrendingDown;
  
  const trendColor = trend === null || trend === 0
    ? 'text-muted-foreground'
    : trend > 0
      ? 'text-success'
      : 'text-destructive';

  const content = (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-2 text-muted-foreground">
        {Icon && <Icon className={sizeClasses[size].icon} />}
        <span className={sizeClasses[size].label}>{label}</span>
      </div>
      
      {isLoading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <div className="flex items-baseline gap-2">
          <span className={sizeClasses[size].value}>{value}</span>
          
          {trend !== undefined && trend !== null && (
            <div className={cn("flex items-center gap-0.5 text-xs font-medium", trendColor)}>
              <TrendIcon className="w-3 h-3" />
              <span>{Math.abs(trend).toFixed(2)}%</span>
            </div>
          )}
          
          {subValue && (
            <span className="text-xs text-muted-foreground">{subValue}</span>
          )}
        </div>
      )}
    </div>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div>{content}</div>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    );
  }

  return content;
});

/**
 * Stats Row - horizontal layout for multiple stats
 */
export interface StatsRowProps {
  children: ReactNode;
  className?: string;
}

export const StatsRow = memo(function StatsRow({ children, className }: StatsRowProps) {
  return (
    <div className={cn(
      "flex items-center gap-6 overflow-x-auto pb-2 scrollbar-thin",
      className
    )}>
      {children}
    </div>
  );
});

/**
 * Stats Grid - grid layout for multiple stats
 */
export interface StatsGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export const StatsGrid = memo(function StatsGrid({ 
  children, 
  columns = 3,
  className,
}: StatsGridProps) {
  const colClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
  };

  return (
    <div className={cn(
      "grid gap-4",
      colClasses[columns],
      className
    )}>
      {children}
    </div>
  );
});
