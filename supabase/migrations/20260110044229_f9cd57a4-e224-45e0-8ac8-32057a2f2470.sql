-- Add wallet_users table for daily snapshot scheduler
CREATE TABLE IF NOT EXISTS public.wallet_users (
  user_address TEXT PRIMARY KEY,
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wallet_users ENABLE ROW LEVEL SECURITY;

-- RLS policies for wallet_users
CREATE POLICY "Users can view their own record"
  ON public.wallet_users FOR SELECT
  USING (lower(user_address) = lower(current_setting('request.headers', true)::json->>'x-wallet-address'));

CREATE POLICY "Users can upsert their own record"
  ON public.wallet_users FOR INSERT
  WITH CHECK (lower(user_address) = lower(current_setting('request.headers', true)::json->>'x-wallet-address'));

CREATE POLICY "Users can update their own record"
  ON public.wallet_users FOR UPDATE
  USING (lower(user_address) = lower(current_setting('request.headers', true)::json->>'x-wallet-address'));

-- Add snapshot_date column to wallet_snapshots for daily uniqueness
ALTER TABLE public.wallet_snapshots 
ADD COLUMN IF NOT EXISTS snapshot_date DATE DEFAULT CURRENT_DATE;

-- Add unique constraint to prevent duplicate daily snapshots per token
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_snapshots_daily_unique 
ON public.wallet_snapshots (user_address, snapshot_type, snapshot_date, chain_index, token_address);

-- Index for efficient daily snapshot queries
CREATE INDEX IF NOT EXISTS idx_wallet_users_last_seen 
ON public.wallet_users (last_seen_at DESC);

-- Service role bypass policy for daily snapshot job
CREATE POLICY "Service role can read all users for scheduling"
  ON public.wallet_users FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert snapshots"
  ON public.wallet_snapshots FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can read all snapshots"
  ON public.wallet_snapshots FOR SELECT
  TO service_role
  USING (true);