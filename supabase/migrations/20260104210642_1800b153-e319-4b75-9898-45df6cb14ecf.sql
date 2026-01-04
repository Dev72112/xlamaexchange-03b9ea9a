-- Referral System Tables
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_address TEXT NOT NULL,
  referee_address TEXT NOT NULL UNIQUE,
  referral_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_referral UNIQUE(referrer_address, referee_address)
);

CREATE TABLE public.referral_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_address TEXT NOT NULL,
  referee_address TEXT NOT NULL,
  trade_hash TEXT NOT NULL,
  chain_index TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  amount_usd DECIMAL(20, 8) NOT NULL,
  commission_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.005,
  commission_usd DECIMAL(20, 8) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Push Notification Subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referrals (anyone can read for display, but restrict inserts)
CREATE POLICY "Anyone can view referrals" ON public.referrals FOR SELECT USING (true);
CREATE POLICY "Anyone can create referrals" ON public.referrals FOR INSERT WITH CHECK (true);

-- RLS Policies for referral_earnings
CREATE POLICY "Users can view their own earnings" ON public.referral_earnings FOR SELECT USING (true);
CREATE POLICY "System can insert earnings" ON public.referral_earnings FOR INSERT WITH CHECK (true);

-- RLS Policies for push_subscriptions
CREATE POLICY "Anyone can manage push subscriptions" ON public.push_subscriptions FOR ALL USING (true);

-- Indexes for performance
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_address);
CREATE INDEX idx_referrals_referee ON public.referrals(referee_address);
CREATE INDEX idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX idx_referral_earnings_referrer ON public.referral_earnings(referrer_address);
CREATE INDEX idx_push_subscriptions_wallet ON public.push_subscriptions(wallet_address);

-- Trigger for updated_at on push_subscriptions
CREATE TRIGGER update_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();