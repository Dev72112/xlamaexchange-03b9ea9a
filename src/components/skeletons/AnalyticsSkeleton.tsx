import { memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const AnalyticsSkeleton = memo(function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-48 mb-2 skeleton-shimmer" />
            <Skeleton className="h-4 w-64 skeleton-shimmer" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-lg skeleton-shimmer" />
            <Skeleton className="h-9 w-9 rounded-lg skeleton-shimmer" />
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <Skeleton className="h-9 w-36 rounded-lg skeleton-shimmer" />
          <Skeleton className="h-9 w-44 rounded-lg skeleton-shimmer" />
          <div className="flex items-center gap-2 ml-auto">
            <Skeleton className="h-6 w-20 rounded-full skeleton-shimmer" />
            <Skeleton className="h-6 w-24 rounded-full skeleton-shimmer" />
          </div>
        </div>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="glass border-border/50 glow-sm" style={{ animationDelay: `${i * 80}ms` }}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-20 skeleton-shimmer" />
                  <Skeleton className="h-7 w-28 skeleton-shimmer" />
                  <Skeleton className="h-3 w-16 skeleton-shimmer" />
                </div>
                <Skeleton className="h-8 w-8 rounded-lg skeleton-shimmer" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="glass-subtle border-border/30" style={{ animationDelay: `${i * 50}ms` }}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-16 skeleton-shimmer" />
                  <Skeleton className="h-6 w-12 skeleton-shimmer" />
                </div>
                <Skeleton className="h-6 w-6 rounded skeleton-shimmer" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Volume Chart */}
        <Card className="glass border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 skeleton-shimmer" />
              <Skeleton className="h-5 w-40 skeleton-shimmer" />
            </div>
            <Skeleton className="h-3 w-56 skeleton-shimmer" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full rounded-lg skeleton-shimmer" />
          </CardContent>
        </Card>

        {/* Distribution Chart */}
        <Card className="glass border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 skeleton-shimmer" />
              <Skeleton className="h-5 w-36 skeleton-shimmer" />
            </div>
            <Skeleton className="h-3 w-48 skeleton-shimmer" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <Skeleton className="h-48 w-48 rounded-full skeleton-shimmer" />
              <div className="flex-1 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2" style={{ animationDelay: `${i * 60}ms` }}>
                    <Skeleton className="h-3 w-3 rounded skeleton-shimmer" />
                    <Skeleton className="h-4 w-20 skeleton-shimmer" />
                    <Skeleton className="h-4 w-12 ml-auto skeleton-shimmer" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Token P&L Section */}
      <Card className="glass border-border/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 skeleton-shimmer" />
            <Skeleton className="h-5 w-32 skeleton-shimmer" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div 
                key={i} 
                className="flex items-center gap-4 p-3 rounded-lg glass-subtle border border-border/30"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <Skeleton className="h-10 w-10 rounded-full skeleton-shimmer" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-24 skeleton-shimmer" />
                  <Skeleton className="h-3 w-16 skeleton-shimmer" />
                </div>
                <div className="text-right space-y-1">
                  <Skeleton className="h-4 w-20 ml-auto skeleton-shimmer" />
                  <Skeleton className="h-3 w-16 ml-auto skeleton-shimmer" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
