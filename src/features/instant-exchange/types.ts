/**
 * Instant Exchange Feature Types
 */

export interface InstantCurrency {
  ticker: string;
  name: string;
  image: string;
  network?: string;
  isStable: boolean;
  isFiat: boolean;
  hasExternalId?: boolean;
}

export interface InstantQuote {
  estimatedAmount: number;
  transactionSpeedForecast: string;
  warningMessage?: string;
  rateId?: string;
  minAmount?: number;
}

export interface InstantParams {
  from: string;
  to: string;
  amount: number;
  address: string;
  extraId?: string;
  refundAddress?: string;
  fixed?: boolean;
}

export interface InstantTransaction {
  id: string;
  payinAddress: string;
  payoutAddress: string;
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  status: string;
}

export interface InstantTransactionStatus {
  id: string;
  status: 'waiting' | 'confirming' | 'exchanging' | 'sending' | 'finished' | 'failed' | 'refunded';
  payinHash?: string;
  payoutHash?: string;
  amountSend: number;
  amountReceive: number;
}
