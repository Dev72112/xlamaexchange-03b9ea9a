-- Create portfolio snapshots table for P&L tracking
CREATE TABLE public.portfolio_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_address TEXT NOT NULL,
  chain_index TEXT NOT NULL,
  total_value_usd DECIMAL(20,2),
  snapshot_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_address, chain_index, snapshot_date)
);

-- Create index for faster lookups
CREATE INDEX idx_portfolio_snapshots_address ON public.portfolio_snapshots(user_address);
CREATE INDEX idx_portfolio_snapshots_date ON public.portfolio_snapshots(snapshot_date);

-- Enable Row Level Security
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;

-- Public read access (no auth in this app)
CREATE POLICY "Public read access for portfolio snapshots" 
ON public.portfolio_snapshots 
FOR SELECT 
USING (true);

-- Public insert access
CREATE POLICY "Public insert access for portfolio snapshots" 
ON public.portfolio_snapshots 
FOR INSERT 
WITH CHECK (true);

-- Create limit orders table
CREATE TABLE public.limit_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_address TEXT NOT NULL,
  chain_index TEXT NOT NULL,
  from_token_address TEXT NOT NULL,
  to_token_address TEXT NOT NULL,
  from_token_symbol TEXT NOT NULL,
  to_token_symbol TEXT NOT NULL,
  amount TEXT NOT NULL,
  target_price DECIMAL(30,18) NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('above', 'below')),
  slippage TEXT DEFAULT '0.5',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'triggered', 'cancelled', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  triggered_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX idx_limit_orders_address ON public.limit_orders(user_address);
CREATE INDEX idx_limit_orders_status ON public.limit_orders(status);
CREATE INDEX idx_limit_orders_chain ON public.limit_orders(chain_index);

-- Enable Row Level Security
ALTER TABLE public.limit_orders ENABLE ROW LEVEL SECURITY;

-- Public access for limit orders
CREATE POLICY "Public read access for limit orders" 
ON public.limit_orders 
FOR SELECT 
USING (true);

CREATE POLICY "Public insert access for limit orders" 
ON public.limit_orders 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Public update access for limit orders" 
ON public.limit_orders 
FOR UPDATE 
USING (true);

CREATE POLICY "Public delete access for limit orders" 
ON public.limit_orders 
FOR DELETE 
USING (true);