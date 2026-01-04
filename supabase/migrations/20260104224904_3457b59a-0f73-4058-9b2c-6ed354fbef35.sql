-- Fix push_subscriptions RLS: restrict to wallet owner only
DROP POLICY IF EXISTS "Anyone can manage push subscriptions" ON public.push_subscriptions;

-- Users can only view their own subscriptions
CREATE POLICY "Users can view own push subscriptions"
ON public.push_subscriptions FOR SELECT
USING (
  wallet_address = COALESCE(
    (current_setting('request.headers', true)::json->>'x-wallet-address'),
    ''
  )
);

-- Users can only insert their own subscriptions
CREATE POLICY "Users can insert own push subscriptions"
ON public.push_subscriptions FOR INSERT
WITH CHECK (
  wallet_address = COALESCE(
    (current_setting('request.headers', true)::json->>'x-wallet-address'),
    ''
  )
);

-- Users can only update their own subscriptions
CREATE POLICY "Users can update own push subscriptions"
ON public.push_subscriptions FOR UPDATE
USING (
  wallet_address = COALESCE(
    (current_setting('request.headers', true)::json->>'x-wallet-address'),
    ''
  )
);

-- Users can only delete their own subscriptions
CREATE POLICY "Users can delete own push subscriptions"
ON public.push_subscriptions FOR DELETE
USING (
  wallet_address = COALESCE(
    (current_setting('request.headers', true)::json->>'x-wallet-address'),
    ''
  )
);

-- Fix referral_earnings RLS: block client inserts (only service role via edge function)
DROP POLICY IF EXISTS "System can insert earnings" ON public.referral_earnings;

CREATE POLICY "Block client inserts on referral earnings"
ON public.referral_earnings FOR INSERT
WITH CHECK (false);

-- Add unique constraint on trade_hash to prevent duplicate commissions
ALTER TABLE public.referral_earnings 
ADD CONSTRAINT unique_trade_hash UNIQUE (trade_hash);