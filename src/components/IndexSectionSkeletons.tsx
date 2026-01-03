import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function HeroSkeleton() {
  return (
    <section className="relative overflow-hidden py-16 sm:py-24 lg:py-32">
      <div className="container px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <Skeleton className="h-10 w-72 rounded-full mx-auto mb-6" />

          {/* Headline */}
          <div className="space-y-4 mb-6">
            <Skeleton className="h-12 sm:h-14 lg:h-16 w-3/4 mx-auto" />
            <Skeleton className="h-12 sm:h-14 lg:h-16 w-2/3 mx-auto" />
          </div>

          {/* Description */}
          <div className="space-y-2 mb-8 max-w-2xl mx-auto">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5 mx-auto" />
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Skeleton className="h-12 w-40" />
            <Skeleton className="h-12 w-40" />
            <Skeleton className="h-12 w-32" />
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="p-4 sm:p-6 rounded-xl border border-border bg-card/50"
              >
                <Skeleton className="h-5 w-5 mx-auto mb-2" />
                <Skeleton className="h-7 w-24 mx-auto mb-1" />
                <Skeleton className="h-4 w-20 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ExchangeSectionSkeleton() {
  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="container px-4 sm:px-6">
        {/* Title */}
        <div className="text-center mb-10 sm:mb-12">
          <Skeleton className="h-9 sm:h-10 lg:h-12 w-80 mx-auto mb-4" />
          <Skeleton className="h-5 w-full max-w-2xl mx-auto" />
          <Skeleton className="h-5 w-3/4 max-w-xl mx-auto mt-2" />
        </div>

        {/* Exchange Widget Skeleton */}
        <div className="max-w-xl mx-auto mb-16">
          <Card className="overflow-hidden border-border">
            <CardContent className="p-0">
              {/* Mode Toggle */}
              <div className="p-4 sm:p-5 border-b border-border">
                <Skeleton className="h-10 w-48 mx-auto rounded-lg" />
              </div>

              {/* From Section */}
              <div className="p-4 sm:p-5 border-b border-border">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
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
              <div className="p-4 sm:p-5 border-b border-border">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                  <Skeleton className="h-10 w-32" />
                </div>
              </div>

              {/* Button */}
              <div className="p-4 sm:p-5">
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Cards */}
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-7 w-64 mb-6" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-5 rounded-xl border border-border bg-card">
                <Skeleton className="h-5 w-5 mb-3" />
                <Skeleton className="h-5 w-24 mb-2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4 mt-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function TrendingPairsSkeleton() {
  return (
    <section className="py-12 sm:py-16">
      <div className="container px-4 sm:px-6">
        <Card className="border-border overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-7 w-48 mb-2" />
                <Skeleton className="h-4 w-56" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 sm:p-4 bg-secondary/30 rounded-xl border border-border"
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex -space-x-2">
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
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export function TransactionTrackerSkeleton() {
  return (
    <section className="py-12 border-t border-border">
      <div className="container px-4 sm:px-6">
        <Card className="border-border max-w-2xl mx-auto">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-6 w-40" />
            </div>
            <Skeleton className="h-4 w-72 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-10" />
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
