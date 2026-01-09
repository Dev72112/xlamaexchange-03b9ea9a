-- Create wallet_snapshots table for tracking individual token holdings
CREATE TABLE public.wallet_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address TEXT NOT NULL,
  chain_index TEXT NOT NULL,
  token_address TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  token_logo TEXT,
  balance TEXT NOT NULL,
  price_at_snapshot NUMERIC,
  value_usd NUMERIC,
  snapshot_type TEXT NOT NULL DEFAULT 'initial',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.wallet_snapshots ENABLE ROW LEVEL SECURITY;

-- Create indexes for fast lookups
CREATE INDEX idx_wallet_snapshots_user_type ON public.wallet_snapshots(user_address, snapshot_type);
CREATE INDEX idx_wallet_snapshots_created ON public.wallet_snapshots(created_at);

-- RLS Policies
CREATE POLICY "Users can view their own wallet snapshots"
ON public.wallet_snapshots
FOR SELECT
USING (lower(user_address) = lower(COALESCE((current_setting('request.headers'::text, true)::json->>'x-wallet-address'), '')));

CREATE POLICY "Users can create their own wallet snapshots"
ON public.wallet_snapshots
FOR INSERT
WITH CHECK (lower(user_address) = lower(COALESCE((current_setting('request.headers'::text, true)::json->>'x-wallet-address'), '')));

CREATE POLICY "Users can update their own wallet snapshots"
ON public.wallet_snapshots
FOR UPDATE
USING (lower(user_address) = lower(COALESCE((current_setting('request.headers'::text, true)::json->>'x-wallet-address'), '')));

CREATE POLICY "Users can delete their own wallet snapshots"
ON public.wallet_snapshots
FOR DELETE
USING (lower(user_address) = lower(COALESCE((current_setting('request.headers'::text, true)::json->>'x-wallet-address'), '')));