/**
 * Trade Debug Panel
 * 
 * Visual UI for viewing trade debug logs.
 * Only visible when debug mode is enabled via localStorage.
 */

import { useState, useEffect } from 'react';
import { tradeDebugger, TradeLogEntry, ChainType, isTradeDebugEnabled } from '@/lib/tradeDebug';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Bug, ChevronDown, ChevronUp, Trash2, Copy, X, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const CHAIN_LABELS: Record<ChainType, string> = {
  all: 'All',
  evm: 'EVM',
  solana: 'Solana',
  tron: 'Tron',
  ton: 'TON',
  sui: 'Sui',
};

export function TradeDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<TradeLogEntry[]>([]);
  const [filter, setFilter] = useState<ChainType>('all');
  const [isEnabled, setIsEnabled] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsEnabled(isTradeDebugEnabled());
    
    const unsubscribe = tradeDebugger.subscribe((newLogs) => {
      setLogs(newLogs);
    });
    
    return unsubscribe;
  }, []);

  if (!isEnabled) return null;

  const filteredLogs = filter === 'all' ? logs : logs.filter(l => l.chainType === filter);
  const errorCount = logs.filter(l => l.level === 'error').length;

  const handleCopyReport = () => {
    navigator.clipboard.writeText(tradeDebugger.exportReport());
    toast({ title: 'Debug report copied', description: 'Paste it to share with support' });
  };

  const handleDownloadReport = () => {
    const report = tradeDebugger.exportReport();
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xlama-debug-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearLogs = () => {
    tradeDebugger.clearLogs();
    toast({ title: 'Logs cleared' });
  };

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="fixed bottom-20 right-4 z-50 md:bottom-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "gap-2 bg-background/95 backdrop-blur border-border shadow-lg",
              errorCount > 0 && "border-destructive/50"
            )}
          >
            <Bug className="w-4 h-4" />
            <span className="hidden sm:inline">Debug</span>
            {errorCount > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                {errorCount}
              </Badge>
            )}
            {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-2">
          <div className="w-[340px] sm:w-[420px] bg-background/95 backdrop-blur border border-border rounded-lg shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-border/50">
              <span className="text-sm font-medium">Trade Debug Logs</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopyReport}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownloadReport}>
                  <Download className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={handleClearLogs}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-1 p-2 border-b border-border/50 overflow-x-auto">
              {(Object.keys(CHAIN_LABELS) as ChainType[]).map((chain) => (
                <Button
                  key={chain}
                  variant={filter === chain ? 'default' : 'ghost'}
                  size="sm"
                  className="h-6 px-2 text-xs whitespace-nowrap"
                  onClick={() => setFilter(chain)}
                >
                  {CHAIN_LABELS[chain]}
                </Button>
              ))}
            </div>

            {/* Logs */}
            <ScrollArea className="h-[280px]">
              {filteredLogs.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No logs yet. Perform a swap to see debug info.
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {filteredLogs.map((log) => (
                    <LogEntry key={log.id} log={log} />
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Footer */}
            <div className="p-2 border-t border-border/50 text-xs text-muted-foreground text-center">
              {logs.length} logs • Disable: localStorage.removeItem('xlama.tradeDebug')
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function LogEntry({ log }: { log: TradeLogEntry }) {
  const [expanded, setExpanded] = useState(false);

  const levelColors = {
    info: 'text-blue-500',
    warn: 'text-yellow-500',
    error: 'text-red-500',
  };

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div 
      className={cn(
        "px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors",
        log.level === 'error' && "bg-destructive/5"
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-2">
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
      
      {expanded && log.data && (
        <pre className="mt-2 p-2 bg-muted/50 rounded text-[10px] overflow-x-auto text-muted-foreground">
          {JSON.stringify(log.data, null, 2)}
        </pre>
      )}
    </div>
  );
}
