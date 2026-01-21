/**
 * Trade Debug System
 * 
 * Centralized logging for swap/quote operations across all chains.
 * Enable with: localStorage.setItem('xlama.tradeDebug', 'true')
 * Or via URL param: ?debug=1
 */

export type LogLevel = 'info' | 'warn' | 'error';
export type ChainType = 'evm' | 'solana' | 'tron' | 'ton' | 'sui' | 'all';

export interface TradeLogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  chainType: ChainType;
  chainIndex?: string;
  action: string;
  message: string;
  data?: Record<string, unknown>;
}

const MAX_LOGS = 200;
const STORAGE_KEY = 'xlama.tradeDebugLogs';

/**
 * Safe JSON serialization that handles circular refs, BigInt, Errors, etc.
 */
function safeSerialize(obj: unknown): Record<string, unknown> | string {
  if (obj === null || obj === undefined) return String(obj);
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'number' || typeof obj === 'boolean') return obj as any;
  if (typeof obj === 'bigint') return obj.toString();
  
  if (obj instanceof Error) {
    return {
      _type: 'Error',
      name: obj.name,
      message: obj.message,
      stack: obj.stack?.split('\n').slice(0, 5).join('\n'),
    };
  }
  
  try {
    const seen = new WeakSet();
    const serialized = JSON.parse(JSON.stringify(obj, (key, value) => {
      if (typeof value === 'bigint') return value.toString();
      if (value instanceof Error) {
        return { name: value.name, message: value.message };
      }
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
      }
      return value;
    }));
    return serialized;
  } catch {
    return { _raw: String(obj) };
  }
}

class TradeDebugger {
  private logs: TradeLogEntry[] = [];
  private listeners: Set<(logs: TradeLogEntry[]) => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private get isEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    // Check localStorage or URL param
    const urlEnabled = new URLSearchParams(window.location.search).get('debug') === '1';
    const storageEnabled = localStorage.getItem('xlama.tradeDebug') === 'true';
    return urlEnabled || storageEnabled;
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch {
      this.logs = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs.slice(-MAX_LOGS)));
    } catch {
      // Storage full, clear old logs
      this.logs = this.logs.slice(-100);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(fn => fn([...this.logs]));
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  log(
    level: LogLevel,
    chainType: ChainType,
    action: string,
    message: string,
    data?: unknown,
    chainIndex?: string
  ): void {
    if (!this.isEnabled) return;

    // Always serialize data safely
    const serializedData = data ? safeSerialize(data) as Record<string, unknown> : undefined;

    const entry: TradeLogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      level,
      chainType,
      chainIndex,
      action,
      message,
      data: serializedData,
    };

    this.logs.push(entry);
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(-MAX_LOGS);
    }

    this.saveToStorage();
    this.notifyListeners();

    // Also log to console with styling
    const prefix = `[Trade:${chainType.toUpperCase()}]`;
    const style = level === 'error' ? 'color: #ef4444' : level === 'warn' ? 'color: #f59e0b' : 'color: #3b82f6';
    console.log(`%c${prefix} ${action}: ${message}`, style, serializedData || '');
  }

  info(chainType: ChainType, action: string, message: string, data?: unknown, chainIndex?: string): void {
    this.log('info', chainType, action, message, data, chainIndex);
  }

  warn(chainType: ChainType, action: string, message: string, data?: unknown, chainIndex?: string): void {
    this.log('warn', chainType, action, message, data, chainIndex);
  }

  error(chainType: ChainType, action: string, message: string, data?: unknown, chainIndex?: string): void {
    this.log('error', chainType, action, message, data, chainIndex);
  }

  // Convenience methods for specific chains
  logQuote(chainType: ChainType, params: { from: string; to: string; amount: string; chainIndex: string }): void {
    this.info(chainType, 'quote-request', `${params.from} → ${params.to} (${params.amount})`, params, params.chainIndex);
  }

  logQuoteResult(chainType: ChainType, result: { inAmount: string; outAmount: string; provider?: string; error?: string }, chainIndex?: string): void {
    if (result.error) {
      this.error(chainType, 'quote-failed', result.error, result, chainIndex);
    } else {
      this.info(chainType, 'quote-result', `${result.inAmount} → ${result.outAmount} (${result.provider || 'unknown'})`, result, chainIndex);
    }
  }

  logSwapStart(chainType: ChainType, params: { from: string; to: string; amount: string; chainIndex: string }): void {
    this.info(chainType, 'swap-start', `Swapping ${params.amount} ${params.from} → ${params.to}`, params, params.chainIndex);
  }

  logSwapResult(chainType: ChainType, result: { txHash?: string; error?: string; provider?: string }, chainIndex?: string): void {
    if (result.error) {
      this.error(chainType, 'swap-failed', result.error, result, chainIndex);
    } else {
      this.info(chainType, 'swap-success', `TX: ${result.txHash?.slice(0, 12)}...`, result, chainIndex);
    }
  }

  logJupiter(action: string, data: unknown): void {
    const serialized = safeSerialize(data) as Record<string, unknown>;
    const hasError = serialized?.error || serialized?.status === 'Failed';
    const errorMsg = typeof serialized?.error === 'string' 
      ? serialized.error 
      : typeof serialized?.error === 'object' 
        ? JSON.stringify(serialized.error) 
        : 'Failed';
    
    if (hasError) {
      this.error('solana', `jupiter-${action}`, errorMsg, serialized, '501');
    } else {
      this.info('solana', `jupiter-${action}`, `Jupiter ${action}`, serialized, '501');
    }
  }

  getLogs(filter?: { chainType?: ChainType; level?: LogLevel }): TradeLogEntry[] {
    let filtered = [...this.logs];
    if (filter?.chainType && filter.chainType !== 'all') {
      filtered = filtered.filter(l => l.chainType === filter.chainType);
    }
    if (filter?.level) {
      filtered = filtered.filter(l => l.level === filter.level);
    }
    return filtered.reverse(); // Most recent first
  }

  clearLogs(): void {
    this.logs = [];
    localStorage.removeItem(STORAGE_KEY);
    this.notifyListeners();
  }

  subscribe(callback: (logs: TradeLogEntry[]) => void): () => void {
    this.listeners.add(callback);
    callback([...this.logs]);
    return () => this.listeners.delete(callback);
  }

  exportReport(): string {
    const report = {
      timestamp: new Date().toISOString(),
      logsCount: this.logs.length,
      errorCount: this.logs.filter(l => l.level === 'error').length,
      warnCount: this.logs.filter(l => l.level === 'warn').length,
      chains: [...new Set(this.logs.map(l => l.chainType))],
      logs: this.logs,
    };
    return JSON.stringify(report, null, 2);
  }

  enable(): void {
    localStorage.setItem('xlama.tradeDebug', 'true');
    this.notifyListeners();
  }

  disable(): void {
    localStorage.removeItem('xlama.tradeDebug');
    this.notifyListeners();
  }
  
  isCurrentlyEnabled(): boolean {
    return this.isEnabled;
  }
}

// Singleton instance
export const tradeDebugger = new TradeDebugger();

// Helper to check debug status
export const isTradeDebugEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  const urlEnabled = new URLSearchParams(window.location.search).get('debug') === '1';
  const storageEnabled = localStorage.getItem('xlama.tradeDebug') === 'true';
  return urlEnabled || storageEnabled;
};
