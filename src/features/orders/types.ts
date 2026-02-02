/**
 * Orders Feature Types
 */

export type OrderStatus = 'active' | 'triggered' | 'executed' | 'cancelled' | 'expired' | 'failed';

export interface LimitOrder {
  id: string;
  chainIndex: string;
  fromTokenAddress: string;
  fromTokenSymbol: string;
  toTokenAddress: string;
  toTokenSymbol: string;
  amount: string;
  targetPrice: number;
  condition: 'above' | 'below';
  status: OrderStatus;
  slippage?: string;
  expiresAt?: string;
  triggeredAt?: string;
  executedAt?: string;
  executionTxHash?: string;
  executionError?: string;
  createdAt: string;
  userAddress: string;
  // TP/SL fields
  takeProfitPrice?: number | null;
  stopLossPrice?: number | null;
  tpTriggeredAt?: string | null;
  slTriggeredAt?: string | null;
}

export interface DCAOrder {
  id: string;
  chainIndex: string;
  fromTokenAddress: string;
  fromTokenSymbol: string;
  toTokenAddress: string;
  toTokenSymbol: string;
  amountPerInterval: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  executionHour?: number;
  startDate: string;
  endDate?: string;
  totalIntervals?: number;
  completedIntervals?: number;
  totalSpent?: string;
  totalReceived?: string;
  averagePrice?: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  nextExecution: string;
  slippage?: string;
  lastExecutionTxHash?: string;
  lastExecutionError?: string;
  createdAt: string;
  userAddress: string;
}

export interface OrderExecutionResult {
  success: boolean;
  txHash?: string;
  error?: string;
}
