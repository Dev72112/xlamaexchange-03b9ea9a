-- Create bridge_intents table for optional signature authentication on bridge swaps
CREATE TABLE public.bridge_intents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_address TEXT NOT NULL,
  from_chain_id INTEGER NOT NULL,
  to_chain_id INTEGER NOT NULL,
  from_token_address TEXT NOT NULL,
  to_token_address TEXT NOT NULL,
  from_token_symbol TEXT NOT NULL,
  to_token_symbol TEXT NOT NULL,
  from_amount TEXT NOT NULL,
  to_amount_expected TEXT,
  bridge_provider TEXT,
  signature TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  executed_at TIMESTAMPTZ,
  source_tx_hash TEXT,
  dest_tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.bridge_intents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user access (wallet-based)
CREATE POLICY "Users can view their own bridge intents"
ON public.bridge_intents
FOR SELECT
USING (lower(user_address) = lower(COALESCE(((current_setting('request.headers'::text, true))::json ->> 'x-wallet-address'::text), ''::text)));

CREATE POLICY "Users can insert their own bridge intents"
ON public.bridge_intents
FOR INSERT
WITH CHECK (lower(user_address) = lower(COALESCE(((current_setting('request.headers'::text, true))::json ->> 'x-wallet-address'::text), ''::text)));

CREATE POLICY "Users can update their own bridge intents"
ON public.bridge_intents
FOR UPDATE
USING (lower(user_address) = lower(COALESCE(((current_setting('request.headers'::text, true))::json ->> 'x-wallet-address'::text), ''::text)));

-- Create indexes for performance
CREATE INDEX idx_bridge_intents_user_address ON public.bridge_intents(lower(user_address));
CREATE INDEX idx_bridge_intents_status ON public.bridge_intents(status);
CREATE INDEX idx_bridge_intents_created_at ON public.bridge_intents(created_at DESC);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_bridge_intents_updated_at
BEFORE UPDATE ON public.bridge_intents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();