-- Create the update_updated_at_column function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create DCA orders table
CREATE TABLE public.dca_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address TEXT NOT NULL,
  chain_index TEXT NOT NULL,
  
  -- Token info
  from_token_address TEXT NOT NULL,
  to_token_address TEXT NOT NULL,
  from_token_symbol TEXT NOT NULL,
  to_token_symbol TEXT NOT NULL,
  
  -- DCA config
  amount_per_interval TEXT NOT NULL,
  frequency TEXT NOT NULL,
  total_intervals INTEGER,
  completed_intervals INTEGER DEFAULT 0,
  
  -- Timing
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  next_execution TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active',
  slippage TEXT DEFAULT '0.5',
  
  -- Tracking
  total_spent TEXT DEFAULT '0',
  total_received TEXT DEFAULT '0',
  average_price NUMERIC,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dca_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies (wallet-based like limit_orders)
CREATE POLICY "Users can read own DCA orders"
  ON public.dca_orders FOR SELECT
  USING (user_address = COALESCE((current_setting('request.headers'::text, true)::json->>'x-wallet-address'), ''));

CREATE POLICY "Users can insert own DCA orders"
  ON public.dca_orders FOR INSERT
  WITH CHECK (user_address = COALESCE((current_setting('request.headers'::text, true)::json->>'x-wallet-address'), ''));

CREATE POLICY "Users can update own DCA orders"
  ON public.dca_orders FOR UPDATE
  USING (user_address = COALESCE((current_setting('request.headers'::text, true)::json->>'x-wallet-address'), ''));

CREATE POLICY "Users can delete own DCA orders"
  ON public.dca_orders FOR DELETE
  USING (user_address = COALESCE((current_setting('request.headers'::text, true)::json->>'x-wallet-address'), ''));

-- Indexes for performance
CREATE INDEX idx_dca_orders_user ON public.dca_orders(user_address);
CREATE INDEX idx_dca_orders_status ON public.dca_orders(status);
CREATE INDEX idx_dca_orders_next_execution ON public.dca_orders(next_execution) WHERE status = 'active';

-- Trigger for updated_at
CREATE TRIGGER update_dca_orders_updated_at
  BEFORE UPDATE ON public.dca_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();