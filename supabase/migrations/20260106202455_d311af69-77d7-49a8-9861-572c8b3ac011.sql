-- Create table for DEX swap transactions
CREATE TABLE public.dex_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address text NOT NULL,
  tx_hash text NOT NULL,
  chain_index text NOT NULL,
  chain_name text,
  from_token_symbol text NOT NULL,
  from_token_address text,
  from_amount text NOT NULL,
  from_amount_usd numeric,
  from_token_price numeric,
  from_token_logo text,
  to_token_symbol text NOT NULL,
  to_token_address text,
  to_amount text NOT NULL,
  to_amount_usd numeric,
  to_token_price numeric,
  to_token_logo text,
  status text NOT NULL DEFAULT 'pending',
  type text NOT NULL DEFAULT 'swap',
  explorer_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tx_hash, user_address)
);

-- Create table for instant exchange transactions (ChangeNOW)
CREATE TABLE public.instant_transactions (
  id text PRIMARY KEY,
  user_address text NOT NULL,
  from_ticker text NOT NULL,
  to_ticker text NOT NULL,
  from_name text,
  to_name text,
  from_image text,
  to_image text,
  from_amount text NOT NULL,
  to_amount text,
  from_amount_usd numeric,
  to_amount_usd numeric,
  status text NOT NULL DEFAULT 'pending',
  payin_address text,
  payout_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.dex_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instant_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for dex_transactions
CREATE POLICY "Users can view their own dex transactions"
ON public.dex_transactions FOR SELECT
USING (lower(user_address) = lower(COALESCE((current_setting('request.headers'::text, true)::json->>'x-wallet-address'), '')));

CREATE POLICY "Users can create their own dex transactions"
ON public.dex_transactions FOR INSERT
WITH CHECK (lower(user_address) = lower(COALESCE((current_setting('request.headers'::text, true)::json->>'x-wallet-address'), '')));

CREATE POLICY "Users can update their own dex transactions"
ON public.dex_transactions FOR UPDATE
USING (lower(user_address) = lower(COALESCE((current_setting('request.headers'::text, true)::json->>'x-wallet-address'), '')));

CREATE POLICY "Users can delete their own dex transactions"
ON public.dex_transactions FOR DELETE
USING (lower(user_address) = lower(COALESCE((current_setting('request.headers'::text, true)::json->>'x-wallet-address'), '')));

-- RLS policies for instant_transactions
CREATE POLICY "Users can view their own instant transactions"
ON public.instant_transactions FOR SELECT
USING (lower(user_address) = lower(COALESCE((current_setting('request.headers'::text, true)::json->>'x-wallet-address'), '')));

CREATE POLICY "Users can create their own instant transactions"
ON public.instant_transactions FOR INSERT
WITH CHECK (lower(user_address) = lower(COALESCE((current_setting('request.headers'::text, true)::json->>'x-wallet-address'), '')));

CREATE POLICY "Users can update their own instant transactions"
ON public.instant_transactions FOR UPDATE
USING (lower(user_address) = lower(COALESCE((current_setting('request.headers'::text, true)::json->>'x-wallet-address'), '')));

CREATE POLICY "Users can delete their own instant transactions"
ON public.instant_transactions FOR DELETE
USING (lower(user_address) = lower(COALESCE((current_setting('request.headers'::text, true)::json->>'x-wallet-address'), '')));

-- Add indexes for performance
CREATE INDEX idx_dex_transactions_user ON public.dex_transactions(lower(user_address));
CREATE INDEX idx_dex_transactions_created ON public.dex_transactions(created_at DESC);
CREATE INDEX idx_instant_transactions_user ON public.instant_transactions(lower(user_address));
CREATE INDEX idx_instant_transactions_created ON public.instant_transactions(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_dex_transactions_updated_at
  BEFORE UPDATE ON public.dex_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_instant_transactions_updated_at
  BEFORE UPDATE ON public.instant_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();