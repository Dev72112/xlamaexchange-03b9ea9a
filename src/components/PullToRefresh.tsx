import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useFeedback } from '@/hooks/useFeedback';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  showSkeleton?: boolean;
}

const PULL_THRESHOLD = 80;
const RESISTANCE = 2.5;

// Skeleton overlay for refresh state
const RefreshSkeleton = memo(function RefreshSkeleton() {
  return (
    <div className="absolute inset-0 z-40 bg-card/90 backdrop-blur-sm rounded-2xl p-4 animate-fade-in">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-24 skeleton-shimmer" />
          <Skeleton className="h-8 w-8 rounded-full skeleton-shimmer" />
        </div>
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-12 w-32 rounded-xl skeleton-shimmer" />
            <Skeleton className="h-10 w-24 skeleton-shimmer" />
          </div>
          <div className="flex justify-center py-2">
            <Skeleton className="h-10 w-10 rounded-full skeleton-shimmer" />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-12 w-32 rounded-xl skeleton-shimmer" />
            <Skeleton className="h-10 w-24 skeleton-shimmer" />
          </div>
        </div>
        <div className="pt-2">
          <Skeleton className="h-4 w-48 mx-auto skeleton-shimmer" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl skeleton-shimmer" />
      </div>
    </div>
  );
});

export const PullToRefresh = memo(function PullToRefresh({ 
  onRefresh, 
  children, 
  className,
  disabled = false,
  showSkeleton = true
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const isPullingRef = useRef(false);
  
  const { triggerFeedback } = useFeedback();

  const canPull = useCallback(() => {
    if (disabled || isRefreshing) return false;
    // Only allow pull when at top of scroll
    const scrollTop = containerRef.current?.scrollTop ?? window.scrollY;
    return scrollTop <= 0;
  }, [disabled, isRefreshing]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!canPull()) return;
    startYRef.current = e.touches[0].clientY;
    isPullingRef.current = false;
  }, [canPull]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!canPull()) return;
    
    currentYRef.current = e.touches[0].clientY;
    const diff = currentYRef.current - startYRef.current;
    
    if (diff > 0) {
      isPullingRef.current = true;
      setIsPulling(true);
      // Apply resistance to the pull
      const distance = Math.min(diff / RESISTANCE, PULL_THRESHOLD * 1.5);
      setPullDistance(distance);
      
      // Prevent default scrolling while pulling
      if (distance > 10) {
        e.preventDefault();
      }
    }
  }, [canPull]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current) return;
    
    isPullingRef.current = false;
    setIsPulling(false);
    
    if (pullDistance >= PULL_THRESHOLD) {
      // Trigger haptic feedback and sound
      triggerFeedback('refresh', 'medium');
      
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD / 2);
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, onRefresh, triggerFeedback]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Use passive: false to allow preventDefault
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const shouldTrigger = pullDistance >= PULL_THRESHOLD;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Pull indicator */}
      <div 
        className={cn(
          "absolute left-1/2 -translate-x-1/2 flex items-center justify-center transition-opacity duration-200 z-50",
          (isPulling || isRefreshing) ? "opacity-100" : "opacity-0"
        )}
        style={{ 
          top: Math.max(pullDistance - 40, 8),
          transform: `translateX(-50%) rotate(${progress * 360}deg)`,
        }}
      >
        <div className={cn(
          "w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center",
          shouldTrigger && !isRefreshing && "bg-primary/10 border-primary/30"
        )}>
          <RefreshCw 
            className={cn(
              "w-5 h-5 text-muted-foreground transition-colors",
              shouldTrigger && !isRefreshing && "text-primary",
              isRefreshing && "animate-spin text-primary"
            )} 
          />
        </div>
      </div>
      
      {/* Skeleton overlay during refresh */}
      {isRefreshing && showSkeleton && <RefreshSkeleton />}
      
      {/* Content with pull transform */}
      <div 
        style={{ 
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? 'none' : 'transform 0.3s ease-out',
          opacity: isRefreshing && showSkeleton ? 0.3 : 1,
        }}
      >
        {children}
      </div>
    </div>
  );
});
