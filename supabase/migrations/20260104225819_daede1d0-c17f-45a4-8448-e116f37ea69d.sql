-- Drop existing permissive policies on referrals
DROP POLICY IF EXISTS "Anyone can view referrals" ON public.referrals;
DROP POLICY IF EXISTS "Anyone can create referrals" ON public.referrals;

-- Restrict SELECT to only see own referrals (as referrer or referee)
CREATE POLICY "Users can view own referrals"
  ON public.referrals FOR SELECT
  USING (
    lower(referrer_address) = lower(COALESCE(current_setting('request.headers', true)::json->>'x-wallet-address', ''))
    OR lower(referee_address) = lower(COALESCE(current_setting('request.headers', true)::json->>'x-wallet-address', ''))
  );

-- Block client inserts - only edge function with service role can insert
CREATE POLICY "Block client referral creation"
  ON public.referrals FOR INSERT
  WITH CHECK (false);

-- Add unique constraint on referee_address to prevent duplicate referrals
ALTER TABLE public.referrals ADD CONSTRAINT unique_referee_address UNIQUE (referee_address);