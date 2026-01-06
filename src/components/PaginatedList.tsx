import { memo, useMemo, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PaginatedListProps<T> {
  items: T[];
  itemsPerPage?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
  emptyState?: React.ReactNode;
  className?: string;
  showPageInfo?: boolean;
}

export function PaginatedList<T>({
  items,
  itemsPerPage = 20,
  renderItem,
  keyExtractor,
  emptyState,
  className,
  showPageInfo = true,
}: PaginatedListProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(items.length / itemsPerPage);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return items.slice(startIndex, startIndex + itemsPerPage);
  }, [items, currentPage, itemsPerPage]);

  const handlePreviousPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  }, [totalPages]);

  // Reset to page 1 when items change significantly
  useMemo(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  if (items.length === 0) {
    return emptyState || null;
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        {paginatedItems.map((item, index) => (
          <div key={keyExtractor(item)}>
            {renderItem(item, (currentPage - 1) * itemsPerPage + index)}
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          {showPageInfo && (
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
              <span className="hidden sm:inline ml-2">
                ({items.length} total)
              </span>
            </span>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="gap-1"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default memo(PaginatedList) as typeof PaginatedList;
