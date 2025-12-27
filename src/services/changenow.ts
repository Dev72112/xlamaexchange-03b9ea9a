import { supabase } from "@/integrations/supabase/client";

export interface ApiCurrency {
  ticker: string;
  name: string;
  image: string;
  hasExternalId: boolean;
  isFiat: boolean;
  featured: boolean;
  isStable: boolean;
  supportsFixedRate: boolean;
}

export interface ExchangeEstimate {
  estimatedAmount: number;
  transactionSpeedForecast: string;
  warningMessage?: string;
  rateId?: string;
}

export interface MinAmount {
  minAmount: number;
}

export interface Transaction {
  id: string;
  payinAddress: string;
  payoutAddress: string;
  payinExtraId?: string;
  payoutExtraId?: string;
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  status: string;
}

export interface TransactionStatus {
  id: string;
  status: string;
  payinAddress: string;
  payoutAddress: string;
  fromCurrency: string;
  toCurrency: string;
  amountSend: number;
  amountReceive: number;
  payinHash?: string;
  payoutHash?: string;
}

class ChangeNowService {
  private async callApi<T>(action: string, params: Record<string, any> = {}): Promise<T> {
    const { data, error } = await supabase.functions.invoke('changenow', {
      body: { action, params },
    });

    if (error) {
      console.error('ChangeNow API error:', error);
      throw new Error(error.message || 'Failed to call ChangeNow API');
    }

    if (data?.error) {
      // Provide more descriptive error messages
      const apiError = data.details?.error || data.error;
      if (apiError === 'pair_is_inactive') {
        throw new Error('pair_is_inactive');
      }
      if (apiError === 'fixed_rate_not_enabled') {
        throw new Error('fixed_rate_not_enabled');
      }
      throw new Error(apiError || data.error);
    }

    return data as T;
  }

  async getCurrencies(): Promise<ApiCurrency[]> {
    return this.callApi<ApiCurrency[]>('currencies');
  }

  async getMinAmount(from: string, to: string): Promise<MinAmount> {
    return this.callApi<MinAmount>('min-amount', { from, to });
  }

  async getExchangeAmount(
    from: string,
    to: string,
    amount: number,
    fixed: boolean = false
  ): Promise<ExchangeEstimate> {
    const action = fixed ? 'exchange-amount-fixed' : 'exchange-amount';
    return this.callApi<ExchangeEstimate>(action, { from, to, amount });
  }

  async createTransaction(params: {
    from: string;
    to: string;
    address: string;
    amount: number;
    extraId?: string;
    refundAddress?: string;
    refundExtraId?: string;
    contactEmail?: string;
    rateId?: string;
    fixed?: boolean;
  }): Promise<Transaction> {
    const action = params.fixed ? 'create-transaction-fixed' : 'create-transaction';
    return this.callApi<Transaction>(action, params);
  }

  async getTransactionStatus(id: string): Promise<TransactionStatus> {
    return this.callApi<TransactionStatus>('transaction-status', { id });
  }
}

export const changeNowService = new ChangeNowService();
