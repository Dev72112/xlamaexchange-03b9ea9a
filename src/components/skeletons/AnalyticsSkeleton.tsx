import { memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const AnalyticsSkeleton = memo(function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-32 rounded-lg skeleton-shimmer" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-md skeleton-shimmer" />
          <Skeleton className="h-8 w-8 rounded-md skeleton-shimmer" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-20 skeleton-shimmer" />
                  <Skeleton className="h-7 w-24 skeleton-shimmer" />
                  <Skeleton className="h-3 w-28 skeleton-shimmer" />
                </div>
                <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0 skeleton-shimmer" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart card */}
      <Card className="glass border-border/50">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32 skeleton-shimmer" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full rounded-lg skeleton-shimmer" />
        </CardContent>
      </Card>

      {/* Secondary chart */}
      <Card className="glass border-border/50">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40 skeleton-shimmer" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full rounded-lg skeleton-shimmer" />
        </CardContent>
      </Card>
    </div>
  );
});