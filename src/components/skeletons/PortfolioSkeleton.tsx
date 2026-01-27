import { memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export const PortfolioSkeleton = memo(function PortfolioSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Chain filter controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-8 w-20 rounded-md skeleton-shimmer" />
          <Skeleton className="h-8 w-16 rounded-md skeleton-shimmer" />
          <Skeleton className="h-8 w-14 rounded-md skeleton-shimmer" />
        </div>
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-8 w-8 rounded-md skeleton-shimmer" />
          <Skeleton className="h-8 w-8 rounded-md skeleton-shimmer" />
        </div>
      </div>

      {/* Account summary card */}
      <Card className="glass border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full skeleton-shimmer" />
              <div>
                <Skeleton className="h-4 w-24 mb-1.5 skeleton-shimmer" />
                <Skeleton className="h-3 w-32 skeleton-shimmer" />
              </div>
            </div>
            <Skeleton className="h-6 w-16 rounded-full skeleton-shimmer" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-8 w-36 skeleton-shimmer" />
            <Skeleton className="h-4 w-24 skeleton-shimmer" />
          </div>
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="glass border-border/50">
            <CardContent className="p-3 flex flex-col items-center gap-2">
              <Skeleton className="w-6 h-6 rounded-lg skeleton-shimmer" />
              <Skeleton className="h-3 w-12 skeleton-shimmer" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Holdings list */}
      <Card className="glass border-border/50">
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <Skeleton className="h-5 w-24 skeleton-shimmer" />
          <Skeleton className="h-5 w-16 rounded-full skeleton-shimmer" />
        </div>
        <CardContent className="p-0">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 border-b border-border/30 last:border-0">
              <Skeleton className="w-9 h-9 rounded-full skeleton-shimmer" />
              <div className="flex-1 min-w-0">
                <Skeleton className="h-4 w-20 mb-1.5 skeleton-shimmer" />
                <Skeleton className="h-3 w-28 skeleton-shimmer" />
              </div>
              <div className="text-right">
                <Skeleton className="h-4 w-16 mb-1.5 ml-auto skeleton-shimmer" />
                <Skeleton className="h-3 w-12 ml-auto skeleton-shimmer" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Collapsible sections */}
      <Skeleton className="h-12 w-full rounded-lg skeleton-shimmer" />
      <Skeleton className="h-12 w-full rounded-lg skeleton-shimmer" />
    </div>
  );
});