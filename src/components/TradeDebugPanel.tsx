/**
 * Trade Debug Panel
 * 
 * Mobile-accessible UI for viewing trade debug logs.
 * Enable via URL param ?debug=1 or in-app toggle.
 */

import { useState, useEffect, useCallback } from 'react';
import { tradeDebugger, TradeLogEntry, ChainType, isTradeDebugEnabled } from '@/lib/tradeDebug';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bug, Copy, Download, Trash2, X, PowerOff, ChevronDown, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const CHAIN_LABELS: Record<ChainType, string> = {
  all: 'All Chains',
  evm: 'EVM',
  solana: 'Solana',
  tron: 'Tron',
  ton: 'TON',
  sui: 'Sui',
};

export function TradeDebugPanel() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<TradeLogEntry[]>([]);
  const [filter, setFilter] = useState<ChainType>('all');
  const [isEnabled, setIsEnabled] = useState(isTradeDebugEnabled());
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  // Check URL for debug flag (only show panel if ?debug=1)
  const urlDebug = typeof window !== 'undefined' 
    ? new URLSearchParams(window.location.search).get('debug') === '1' 
    : false;

  // Subscribe to log updates
  useEffect(() => {
    // Auto-enable if URL has ?debug=1
    if (urlDebug && !isEnabled) {
      tradeDebugger.enable();
      setIsEnabled(true);
    }

    const unsubscribe = tradeDebugger.subscribe((newLogs) => {
      setLogs(newLogs);
    });

    return unsubscribe;
  }, [urlDebug]);

  // Re-check enabled state periodically (only if URL debug is active)
  useEffect(() => {
    if (!urlDebug) return;
    const interval = setInterval(() => {
      setIsEnabled(isTradeDebugEnabled());
    }, 1000);
    return () => clearInterval(interval);
  }, [urlDebug]);

  // Don't render anything if not enabled via URL
  if (!urlDebug && !isEnabled) {
    return null;
  }

  const handleToggleDebug = useCallback(() => {
    if (isEnabled) {
      tradeDebugger.disable();
      setIsEnabled(false);
      toast({ title: 'Debug Mode Disabled', description: 'Trade logging stopped' });
    } else {
      tradeDebugger.enable();
      setIsEnabled(true);
      setIsOpen(true);
      toast({ title: 'Debug Mode Enabled', description: 'Trade operations will be logged' });
    }
  }, [isEnabled, toast]);

  const handleCopyReport = useCallback(() => {
    const report = tradeDebugger.exportReport();
    navigator.clipboard.writeText(report);
    toast({ title: 'Copied', description: 'Debug report copied to clipboard' });
  }, [toast]);

  const handleDownloadReport = useCallback(() => {
    const report = tradeDebugger.exportReport();
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trade-debug-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Downloaded', description: 'Debug report saved' });
  }, [toast]);

  const handleClearLogs = useCallback(() => {
    tradeDebugger.clearLogs();
    toast({ title: 'Cleared', description: 'All debug logs cleared' });
  }, [toast]);

  const toggleLogExpanded = useCallback((id: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(l => l.chainType === filter);

  const errorCount = logs.filter(l => l.level === 'error').length;

  // Floating debug button (always visible, bottom right corner above nav)
  return (
    <>
      {/* Floating toggle button */}
      <Button
        onClick={() => isEnabled ? setIsOpen(!isOpen) : handleToggleDebug()}
        size="sm"
        variant={isEnabled ? (errorCount > 0 ? 'destructive' : 'default') : 'outline'}
        className={cn(
          "fixed z-50 shadow-lg",
          "bottom-20 right-4 md:bottom-4", // Above mobile nav on mobile
          !isEnabled && "opacity-70 hover:opacity-100"
        )}
      >
        <Bug className="w-4 h-4 mr-1" />
        {isEnabled ? (
          <>
            Debug
            {errorCount > 0 && (
              <Badge variant="secondary" className="ml-1 bg-white/20 text-xs">
                {errorCount}
              </Badge>
            )}
          </>
        ) : (
          'Enable Debug'
        )}
      </Button>

      {/* Debug panel (slide up from bottom on mobile, side panel on desktop) */}
      {isEnabled && isOpen && (
        <Card className={cn(
          "fixed z-50 shadow-2xl border-border/50 glass",
          "bottom-32 right-4 left-4 md:left-auto md:w-[500px] max-h-[60vh]",
          "flex flex-col"
        )}>
          <CardHeader className="py-3 px-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bug className="w-4 h-4 text-primary" />
                Trade Debug
                <Badge variant="outline" className="text-xs font-mono">
                  {filteredLogs.length} logs
                </Badge>
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopyReport} title="Copy report">
                  <Copy className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownloadReport} title="Download report">
                  <Download className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClearLogs} title="Clear logs">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Chain filter */}
            <div className="flex items-center gap-2 mt-2">
              <Select value={filter} onValueChange={(v) => setFilter(v as ChainType)}>
                <SelectTrigger className="h-8 text-xs w-[140px]">
                  <SelectValue placeholder="Filter by chain" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CHAIN_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs ml-auto"
                onClick={handleToggleDebug}
              >
                <PowerOff className="w-3 h-3 mr-1" />
                Disable Debug
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0 flex-1 overflow-hidden">
            <ScrollArea className="h-[40vh]">
              <div className="space-y-1 p-2">
                {filteredLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No logs yet. Perform a trade to see debug info.
                  </div>
                ) : (
                  filteredLogs.map((log) => (
                    <LogEntry 
                      key={log.id} 
                      log={log} 
                      isExpanded={expandedLogs.has(log.id)}
                      onToggle={() => toggleLogExpanded(log.id)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function LogEntry({ 
  log, 
  isExpanded, 
  onToggle,
}: { 
  log: TradeLogEntry;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const levelColors = {
    info: 'text-blue-500',
    warn: 'text-yellow-500',
    error: 'text-red-500',
  };

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const hasData = log.data && Object.keys(log.data).length > 0;

  return (
    <div 
      className={cn(
        "px-3 py-2 rounded-md transition-colors",
        log.level === 'error' && "bg-destructive/10",
        log.level === 'warn' && "bg-yellow-500/10",
        hasData && "cursor-pointer hover:bg-muted/50"
      )}
      onClick={hasData ? onToggle : undefined}
    >
      <div className="flex items-start gap-2">
        {hasData && (
          <span className="mt-0.5">
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            )}
          </span>
        )}
        <span className="text-xs text-muted-foreground font-mono shrink-0">
          {formatTime(log.timestamp)}
        </span>
        <Badge variant="outline" className="h-4 px-1 text-[10px] shrink-0">
          {log.chainType.toUpperCase()}
        </Badge>
        <span className={cn("text-xs font-medium shrink-0", levelColors[log.level])}>
          {log.action}
        </span>
        <span className="text-xs text-muted-foreground truncate flex-1">
          {log.message}
        </span>
      </div>
      
      {isExpanded && hasData && (
        <pre className="mt-2 p-2 bg-muted/50 rounded text-[10px] overflow-x-auto text-muted-foreground max-h-[200px]">
          {JSON.stringify(log.data, null, 2)}
        </pre>
      )}
    </div>
  );
}
