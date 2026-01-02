import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

// FAQ page skeleton
export function FAQSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="bg-card border border-border rounded-lg px-6 py-4"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-4" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Favorites page skeleton for pair cards
export function FavoriteCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-4 sm:p-5">
          <div className="flex items-center gap-4">
            {/* Pair Icons */}
            <div className="flex items-center">
              <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-full" />
              <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-full -ml-3" />
            </div>
            
            {/* Pair Info */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-5 w-12" />
              </div>
              <Skeleton className="h-4 w-32" />
            </div>

            {/* Rate */}
            <div className="hidden sm:block space-y-1">
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-5 w-16" />
            </div>

            {/* Button */}
            <Skeleton className="h-9 w-20 hidden sm:block" />
          </div>
        </Card>
      ))}
    </div>
  );
}

// History page skeleton for transaction cards
export function TransactionCardsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-4 sm:p-5">
          <div className="flex items-center gap-4">
            {/* Pair Icons */}
            <div className="flex items-center shrink-0">
              <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-full" />
              <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-full -ml-3" />
            </div>

            {/* Transaction Info */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-5 w-24" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>

            {/* Status */}
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </Card>
      ))}
    </div>
  );
}

// Generic list skeleton
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-lg border border-border">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

// Feature cards skeleton
export function FeatureCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-5 rounded-xl bg-card border border-border">
          <Skeleton className="w-5 h-5 mb-3" />
          <Skeleton className="h-5 w-3/4 mb-2" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Content section skeleton (generic)
export function ContentSectionSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}
