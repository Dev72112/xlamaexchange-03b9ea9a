/**
 * Lazy Chart Components
 * Recharts is ~200KB - lazy load to reduce initial bundle
 */

import { lazy, Suspense, ComponentType, memo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Chart skeleton placeholder
interface ChartSkeletonProps {
  height?: number;
  className?: string;
}

export const ChartSkeleton = memo(function ChartSkeleton({ 
  height = 200, 
  className 
}: ChartSkeletonProps) {
  return (
    <Skeleton 
      className={className} 
      style={{ height, width: '100%', borderRadius: '0.5rem' }} 
    />
  );
});

// Lazy imports for chart components
export const LazyPortfolioAllocationChart = lazy(() => 
  import('@/components/portfolio/PortfolioAllocationChart')
    .then(m => ({ default: m.PortfolioAllocationChart }))
);

export const LazyTokenPnLChart = lazy(() => 
  import('@/components/analytics/TokenPnLChart')
    .then(m => ({ default: m.TokenPnLChart }))
);

export const LazyPortfolioPnLChart = lazy(() => 
  import('@/components/PortfolioPnLChart')
    .then(m => ({ default: m.PortfolioPnLChart }))
);

export const LazyDCAHistoryChart = lazy(() => 
  import('@/components/DCAHistoryChart')
    .then(m => ({ default: m.DCAHistoryChart }))
);

export const LazyFundingRateChart = lazy(() => 
  import('@/components/perpetuals/FundingRateChart')
    .then(m => ({ default: m.FundingRateChart }))
);

export const LazyGasBreakdown = lazy(() => 
  import('@/components/analytics/GasBreakdown')
    .then(m => ({ default: m.GasBreakdown }))
);

// Generic wrapper for lazy charts with suspense fallback
interface LazyChartWrapperProps<T> {
  component: ComponentType<T>;
  componentProps: T;
  height?: number;
  fallbackClassName?: string;
}

export function LazyChartWrapper<T extends Record<string, unknown>>({
  component: Component,
  componentProps,
  height = 200,
  fallbackClassName,
}: LazyChartWrapperProps<T>) {
  return (
    <Suspense fallback={<ChartSkeleton height={height} className={fallbackClassName} />}>
      <Component {...componentProps} />
    </Suspense>
  );
}

// Pre-wrapped lazy components for common use
interface PortfolioAllocationChartProps {
  chainBalances: Array<{
    chain: { name: string; shortName: string };
    total: number;
  }>;
  totalValue: number;
  className?: string;
}

export function LazyPortfolioAllocation(props: PortfolioAllocationChartProps) {
  return (
    <Suspense fallback={<ChartSkeleton height={240} />}>
      <LazyPortfolioAllocationChart {...props} />
    </Suspense>
  );
}

interface TokenPnLChartProps {
  chainFilter?: string;
}

export function LazyTokenPnL(props: TokenPnLChartProps) {
  return (
    <Suspense fallback={<ChartSkeleton height={350} />}>
      <LazyTokenPnLChart {...props} />
    </Suspense>
  );
}

interface PortfolioPnLChartProps {
  className?: string;
}

export function LazyPortfolioPnL(props: PortfolioPnLChartProps) {
  return (
    <Suspense fallback={<ChartSkeleton height={200} />}>
      <LazyPortfolioPnLChart {...props} />
    </Suspense>
  );
}

interface GasBreakdownProps {
  chainFilter?: string;
}

export function LazyGas(props: GasBreakdownProps) {
  return (
    <Suspense fallback={<ChartSkeleton height={400} />}>
      <LazyGasBreakdown {...props} />
    </Suspense>
  );
}

interface FundingRateChartProps {
  coin: string;
  className?: string;
}

export function LazyFundingRate(props: FundingRateChartProps) {
  return (
    <Suspense fallback={<ChartSkeleton height={200} />}>
      <LazyFundingRateChart {...props} />
    </Suspense>
  );
}

interface DCAHistoryChartProps {
  orders: any[];
  currentValues: Map<string, number>;
}

export function LazyDCAHistory(props: DCAHistoryChartProps) {
  return (
    <Suspense fallback={<ChartSkeleton height={280} />}>
      <LazyDCAHistoryChart {...props} />
    </Suspense>
  );
}
