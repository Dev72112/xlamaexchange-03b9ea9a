-- Fix referral_earnings RLS SELECT policy to restrict access to wallet owner only
-- The current policy uses USING (true) which allows public access to all data

DROP POLICY IF EXISTS "Users can view their own earnings" ON public.referral_earnings;

CREATE POLICY "Users can view their own earnings"
ON public.referral_earnings
FOR SELECT
USING (
  lower(referrer_address) = lower(
    COALESCE(
      (current_setting('request.headers', true)::json->>'x-wallet-address'),
      ''
    )
  )
);