/**
 * Trade Debug System
 * 
 * Centralized logging for swap/quote operations across all chains.
 * Enable with: localStorage.setItem('xlama.tradeDebug', 'true')
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

const MAX_LOGS = 100;
const STORAGE_KEY = 'xlama.tradeDebugLogs';

class TradeDebugger {
  private logs: TradeLogEntry[] = [];
  private listeners: Set<(logs: TradeLogEntry[]) => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private get isEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('xlama.tradeDebug') === 'true';
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
      this.logs = this.logs.slice(-50);
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
    data?: Record<string, unknown>,
    chainIndex?: string
  ): void {
    if (!this.isEnabled) return;

    const entry: TradeLogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      level,
      chainType,
      chainIndex,
      action,
      message,
      data,
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
    console.log(`%c${prefix} ${action}: ${message}`, style, data || '');
  }

  info(chainType: ChainType, action: string, message: string, data?: Record<string, unknown>, chainIndex?: string): void {
    this.log('info', chainType, action, message, data, chainIndex);
  }

  warn(chainType: ChainType, action: string, message: string, data?: Record<string, unknown>, chainIndex?: string): void {
    this.log('warn', chainType, action, message, data, chainIndex);
  }

  error(chainType: ChainType, action: string, message: string, data?: Record<string, unknown>, chainIndex?: string): void {
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

  logJupiter(action: string, data: Record<string, unknown>): void {
    const hasError = data.error || data.status === 'Failed';
    if (hasError) {
      this.error('solana', `jupiter-${action}`, String(data.error || 'Failed'), data, '501');
    } else {
      this.info('solana', `jupiter-${action}`, `Jupiter ${action}`, data, '501');
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
      logs: this.logs,
    };
    return JSON.stringify(report, null, 2);
  }

  enable(): void {
    localStorage.setItem('xlama.tradeDebug', 'true');
  }

  disable(): void {
    localStorage.removeItem('xlama.tradeDebug');
  }
}

// Singleton instance
export const tradeDebugger = new TradeDebugger();

// Helper to check debug status
export const isTradeDebugEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('xlama.tradeDebug') === 'true';
};
