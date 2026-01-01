import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function ExchangeWidgetSkeleton() {
  return (
    <Card className="w-full max-w-xl mx-auto overflow-hidden border-border">
      <CardContent className="p-0">
        {/* Mode Toggle Skeleton */}
        <div className="p-4 sm:p-5 border-b border-border">
          <Skeleton className="h-10 w-48 mx-auto rounded-lg" />
        </div>

        {/* Header */}
        <div className="px-4 sm:px-5 pt-4 flex items-center justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>

        {/* From Section */}
        <div className="p-4 sm:p-5 pt-2 border-b border-border">
          <div className="flex items-center justify-between gap-3">
            {/* Currency Selector Skeleton */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="h-4 w-4" />
            </div>
            {/* Amount Input Skeleton */}
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        {/* Swap Button */}
        <div className="relative h-0">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 z-10">
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>

        {/* To Section */}
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            {/* Currency Selector Skeleton */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="h-4 w-4" />
            </div>
            {/* Amount Output Skeleton */}
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        {/* Rate Info Skeleton */}
        <div className="px-4 sm:px-5 pb-4 sm:pb-5">
          <div className="flex items-center justify-center gap-2">
            <Skeleton className="h-4 w-48" />
          </div>
        </div>

        {/* Button Skeleton */}
        <div className="p-4 sm:p-5 pt-0">
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

export function TrendingPairsSkeleton() {
  return (
    <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-3 sm:p-4 bg-secondary/30 rounded-xl border border-border"
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex -space-x-2 shrink-0">
              <Skeleton className="w-8 h-8 sm:w-10 sm:h-10 rounded-full" />
              <Skeleton className="w-8 h-8 sm:w-10 sm:h-10 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="w-16 sm:w-20 h-3 sm:h-4" />
              <Skeleton className="w-12 sm:w-16 h-2 sm:h-3" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="space-y-1">
              <Skeleton className="w-12 sm:w-16 h-4" />
              <Skeleton className="w-8 h-3 ml-auto" />
            </div>
            <Skeleton className="w-7 h-7 sm:w-8 sm:h-8 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
