/**
 * Transaction Filters
 * Filter controls for history transactions
 */

import { memo, useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Filter, 
  X, 
  Download,
  SlidersHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterState {
  chain: string;
  token: string;
  dateRange: '7d' | '30d' | '90d' | 'all';
  status: 'all' | 'success' | 'failed' | 'pending';
  type: 'all' | 'swap' | 'bridge';
}

interface TransactionFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  chains: string[];
  tokens: string[];
  onExport?: () => void;
  isExporting?: boolean;
  className?: string;
}

const defaultFilters: FilterState = {
  chain: 'all',
  token: 'all',
  dateRange: 'all',
  status: 'all',
  type: 'all',
};

export const TransactionFilters = memo(function TransactionFilters({
  filters,
  onFilterChange,
  chains,
  tokens,
  onExport,
  isExporting = false,
  className,
}: TransactionFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.chain !== 'all') count++;
    if (filters.token !== 'all') count++;
    if (filters.dateRange !== 'all') count++;
    if (filters.status !== 'all') count++;
    if (filters.type !== 'all') count++;
    return count;
  }, [filters]);

  const handleReset = () => {
    onFilterChange(defaultFilters);
  };

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {/* Filter Button with Popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={cn(
              "h-8 gap-1.5",
              activeFilterCount > 0 && "border-primary/50 bg-primary/5"
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="start">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Filter Transactions</h4>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={handleReset} className="h-6 text-xs">
                  Reset
                </Button>
              )}
            </div>

            {/* Date Range */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Date Range</label>
              <Select 
                value={filters.dateRange} 
                onValueChange={(v) => updateFilter('dateRange', v as FilterState['dateRange'])}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Chain */}
            {chains.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Chain</label>
                <Select 
                  value={filters.chain} 
                  onValueChange={(v) => updateFilter('chain', v)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Chains</SelectItem>
                    {chains.map(chain => (
                      <SelectItem key={chain} value={chain}>{chain}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Token */}
            {tokens.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Token</label>
                <Select 
                  value={filters.token} 
                  onValueChange={(v) => updateFilter('token', v)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tokens</SelectItem>
                    {tokens.slice(0, 20).map(token => (
                      <SelectItem key={token} value={token}>{token}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Status</label>
              <Select 
                value={filters.status} 
                onValueChange={(v) => updateFilter('status', v as FilterState['status'])}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Type</label>
              <Select 
                value={filters.type} 
                onValueChange={(v) => updateFilter('type', v as FilterState['type'])}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="swap">Swaps</SelectItem>
                  <SelectItem value="bridge">Bridges</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filter Tags */}
      {filters.dateRange !== 'all' && (
        <Badge variant="secondary" className="h-6 gap-1 text-xs">
          {filters.dateRange === '7d' ? '7 days' : filters.dateRange === '30d' ? '30 days' : '90 days'}
          <X 
            className="w-3 h-3 cursor-pointer hover:text-foreground" 
            onClick={() => updateFilter('dateRange', 'all')}
          />
        </Badge>
      )}
      {filters.chain !== 'all' && (
        <Badge variant="secondary" className="h-6 gap-1 text-xs">
          {filters.chain}
          <X 
            className="w-3 h-3 cursor-pointer hover:text-foreground" 
            onClick={() => updateFilter('chain', 'all')}
          />
        </Badge>
      )}
      {filters.status !== 'all' && (
        <Badge variant="secondary" className="h-6 gap-1 text-xs capitalize">
          {filters.status}
          <X 
            className="w-3 h-3 cursor-pointer hover:text-foreground" 
            onClick={() => updateFilter('status', 'all')}
          />
        </Badge>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Export Button */}
      {onExport && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onExport}
          disabled={isExporting}
          className="h-8 gap-1.5"
        >
          <Download className={cn("w-3.5 h-3.5", isExporting && "animate-bounce")} />
          Export CSV
        </Button>
      )}
    </div>
  );
});

export default TransactionFilters;
