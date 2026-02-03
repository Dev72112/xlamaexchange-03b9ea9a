// Trade Export Utilities for Portfolio Rebalancer and Transaction History

import { RebalanceTrade } from '@/hooks/usePortfolioRebalance';

// ============ TRANSACTION HISTORY EXPORT ============

export interface ExportableTransaction {
  timestamp: string | Date;
  type: string;
  fromAmount: string;
  fromSymbol: string;
  toAmount: string;
  toSymbol: string;
  chain: string;
  status: string;
  usdValue?: number;
  txHash: string;
  explorerUrl?: string;
}

export function exportTransactionsToCSV(
  transactions: ExportableTransaction[], 
  filename: string = 'xlama-transactions'
): void {
  const headers = [
    'Date',
    'Time (UTC)',
    'Type',
    'From Amount',
    'From Token',
    'To Amount',
    'To Token',
    'Chain',
    'Status',
    'USD Value',
    'TX Hash',
    'Explorer URL',
  ];
  
  const rows = transactions.map(tx => {
    const date = new Date(tx.timestamp);
    return [
      date.toISOString().split('T')[0],
      date.toISOString().split('T')[1].split('.')[0],
      tx.type,
      tx.fromAmount,
      tx.fromSymbol,
      tx.toAmount,
      tx.toSymbol,
      tx.chain,
      tx.status,
      tx.usdValue?.toFixed(2) || '',
      tx.txHash,
      tx.explorerUrl || '',
    ];
  });
  
  // Escape CSV values properly
  const escapeCSV = (value: string | number) => {
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  
  const csv = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============ REBALANCE TRADE EXPORT ============

export function exportTradesToCSV(trades: RebalanceTrade[], filename: string = 'rebalance-trades'): void {
  const headers = ['From Token', 'From Chain', 'To Token', 'To Chain', 'Amount (USD)'];
  
  const rows = trades.map(trade => [
    trade.fromToken.symbol,
    trade.fromToken.chainIndex,
    trade.toToken.symbol,
    trade.toToken.chainIndex,
    trade.amountUsd.toFixed(2),
  ]);
  
  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportTradesToJSON(trades: RebalanceTrade[], filename: string = 'rebalance-trades'): void {
  const exportData = {
    exportedAt: new Date().toISOString(),
    totalTrades: trades.length,
    totalValue: trades.reduce((sum, t) => sum + t.amountUsd, 0),
    trades: trades.map(trade => ({
      from: {
        symbol: trade.fromToken.symbol,
        address: trade.fromToken.address,
        chainIndex: trade.fromToken.chainIndex,
      },
      to: {
        symbol: trade.toToken.symbol,
        address: trade.toToken.address,
        chainIndex: trade.toToken.chainIndex,
      },
      amountUsd: trade.amountUsd,
    })),
  };
  
  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateShareableLink(trades: RebalanceTrade[]): string {
  // Encode trades as base64 for URL sharing
  const tradeData = trades.map(t => ({
    f: t.fromToken.address,
    fc: t.fromToken.chainIndex,
    fs: t.fromToken.symbol,
    t: t.toToken.address,
    tc: t.toToken.chainIndex,
    ts: t.toToken.symbol,
    a: t.amountUsd,
  }));
  
  const encoded = btoa(JSON.stringify(tradeData));
  const baseUrl = window.location.origin;
  return `${baseUrl}?rebalance=${encodeURIComponent(encoded)}`;
}

export function parseShareableLink(param: string): RebalanceTrade[] | null {
  try {
    const decoded = atob(decodeURIComponent(param));
    const tradeData = JSON.parse(decoded);
    
    return tradeData.map((t: any) => ({
      fromToken: {
        address: t.f,
        chainIndex: t.fc,
        symbol: t.fs,
      },
      toToken: {
        address: t.t,
        chainIndex: t.tc,
        symbol: t.ts,
      },
      amount: t.a,
      amountUsd: t.a,
    }));
  } catch {
    return null;
  }
}
