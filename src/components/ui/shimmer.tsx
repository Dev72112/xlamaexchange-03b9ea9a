/**
 * Shimmer Loading Component
 * Provides consistent shimmer loading effects across the app
 */

import { cn } from '@/lib/utils';

interface ShimmerProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function Shimmer({ 
  className, 
  width, 
  height,
  rounded = 'md',
}: ShimmerProps) {
  const roundedClass = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
  };

  return (
    <div 
      className={cn(
        "relative overflow-hidden bg-muted",
        roundedClass[rounded],
        className
      )}
      style={{ width, height }}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

export function ShimmerCard({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3 p-4", className)}>
      <Shimmer height={20} width="40%" rounded="md" />
      <Shimmer height={16} width="100%" rounded="md" />
      <Shimmer height={16} width="80%" rounded="md" />
      <div className="flex gap-2 pt-2">
        <Shimmer height={32} width={80} rounded="lg" />
        <Shimmer height={32} width={80} rounded="lg" />
      </div>
    </div>
  );
}

export function ShimmerText({ 
  lines = 1, 
  className 
}: { 
  lines?: number; 
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Shimmer 
          key={i} 
          height={16} 
          width={i === lines - 1 ? "60%" : "100%"} 
          rounded="md" 
        />
      ))}
    </div>
  );
}

export function ShimmerAvatar({ size = 40 }: { size?: number }) {
  return <Shimmer width={size} height={size} rounded="full" />;
}

export function ShimmerButton({ width = 100 }: { width?: number }) {
  return <Shimmer width={width} height={36} rounded="lg" />;
}
