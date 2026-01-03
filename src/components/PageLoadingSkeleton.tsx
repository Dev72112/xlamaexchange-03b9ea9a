import { memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const PageLoadingSkeleton = memo(function PageLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Skeleton className="h-8 w-8 rounded-lg skeleton-shimmer" />
            <div className="hidden md:flex items-center gap-4">
              <Skeleton className="h-4 w-16 skeleton-shimmer" />
              <Skeleton className="h-4 w-16 skeleton-shimmer" />
              <Skeleton className="h-4 w-16 skeleton-shimmer" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg skeleton-shimmer" />
            <Skeleton className="h-8 w-8 rounded-lg skeleton-shimmer" />
          </div>
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="container px-4 sm:px-6 py-8 space-y-8">
        {/* Hero/Title Section */}
        <div className="space-y-4 text-center max-w-2xl mx-auto py-8">
          <Skeleton className="h-6 w-48 mx-auto rounded-full skeleton-shimmer" />
          <Skeleton className="h-12 w-3/4 mx-auto skeleton-shimmer" />
          <Skeleton className="h-12 w-2/3 mx-auto skeleton-shimmer" />
          <Skeleton className="h-5 w-full skeleton-shimmer" />
          <Skeleton className="h-5 w-2/3 mx-auto skeleton-shimmer" />
        </div>

        {/* Exchange Widget Placeholder */}
        <div className="max-w-xl mx-auto">
          <div className="p-6 rounded-xl border border-border bg-card space-y-5">
            <Skeleton className="h-10 w-48 mx-auto rounded-lg skeleton-shimmer" />
            <div className="space-y-4">
              <Skeleton className="h-14 w-full skeleton-shimmer" />
              <Skeleton className="h-10 w-10 mx-auto rounded-full skeleton-shimmer" />
              <Skeleton className="h-14 w-full skeleton-shimmer" />
            </div>
            <Skeleton className="h-12 w-full skeleton-shimmer" />
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 max-w-4xl mx-auto mt-12">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="p-5 rounded-xl border border-border bg-card space-y-3"
            >
              <Skeleton className="h-5 w-5 skeleton-shimmer" />
              <Skeleton className="h-5 w-3/4 skeleton-shimmer" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full skeleton-shimmer" />
                <Skeleton className="h-4 w-5/6 skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
});
