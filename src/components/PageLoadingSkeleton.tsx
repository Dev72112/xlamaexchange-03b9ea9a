import { Skeleton } from "@/components/ui/skeleton";

export function PageLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Skeleton */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Skeleton className="h-8 w-24" />
            <div className="hidden md:flex items-center gap-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="container py-8 space-y-8">
        {/* Hero/Title Section */}
        <div className="space-y-4 text-center max-w-2xl mx-auto">
          <Skeleton className="h-10 w-3/4 mx-auto" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-2/3 mx-auto" />
        </div>

        {/* Content Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-12">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="p-6 rounded-xl border border-border bg-card space-y-4"
            >
              <Skeleton className="h-6 w-3/4" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
