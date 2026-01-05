-- Add status column to referral_earnings
ALTER TABLE public.referral_earnings 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'earned',
ADD COLUMN IF NOT EXISTS claimed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS claim_id uuid;

-- Create commission_claims table
CREATE TABLE public.commission_claims (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_address text NOT NULL,
  claim_amount_usd numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payout_address text NOT NULL,
  payout_chain text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  paid_at timestamp with time zone,
  payout_tx_hash text,
  notes text
);

-- Create index for faster queries
CREATE INDEX idx_commission_claims_referrer ON public.commission_claims(referrer_address);
CREATE INDEX idx_commission_claims_status ON public.commission_claims(status);
CREATE INDEX idx_referral_earnings_status ON public.referral_earnings(status);

-- Enable RLS
ALTER TABLE public.commission_claims ENABLE ROW LEVEL SECURITY;

-- RLS policies for commission_claims
CREATE POLICY "Users can view their own claims"
ON public.commission_claims
FOR SELECT
USING (lower(referrer_address) = lower(COALESCE(((current_setting('request.headers'::text, true))::json ->> 'x-wallet-address'::text), ''::text)));

CREATE POLICY "Users can create their own claims"
ON public.commission_claims
FOR INSERT
WITH CHECK (lower(referrer_address) = lower(COALESCE(((current_setting('request.headers'::text, true))::json ->> 'x-wallet-address'::text), ''::text)));

-- Block client-side updates and deletes (admin only via service role)
CREATE POLICY "Block client updates on claims"
ON public.commission_claims
FOR UPDATE
USING (false);

CREATE POLICY "Block client deletes on claims"
ON public.commission_claims
FOR DELETE
USING (false);