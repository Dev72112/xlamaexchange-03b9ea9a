-- Phase 9: Performance & Security - Database Indexes
-- Add indexes for faster wallet address lookups with case-insensitive matching

-- DEX Transactions indexes
CREATE INDEX IF NOT EXISTS idx_dex_transactions_user_lower ON public.dex_transactions(lower(user_address));
CREATE INDEX IF NOT EXISTS idx_dex_transactions_status ON public.dex_transactions(status);
CREATE INDEX IF NOT EXISTS idx_dex_transactions_created ON public.dex_transactions(created_at DESC);

-- Instant Transactions indexes  
CREATE INDEX IF NOT EXISTS idx_instant_transactions_user_lower ON public.instant_transactions(lower(user_address));
CREATE INDEX IF NOT EXISTS idx_instant_transactions_status ON public.instant_transactions(status);
CREATE INDEX IF NOT EXISTS idx_instant_transactions_created ON public.instant_transactions(created_at DESC);

-- Bridge Intents indexes
CREATE INDEX IF NOT EXISTS idx_bridge_intents_user_lower ON public.bridge_intents(lower(user_address));
CREATE INDEX IF NOT EXISTS idx_bridge_intents_status ON public.bridge_intents(status);

-- Limit Orders indexes
CREATE INDEX IF NOT EXISTS idx_limit_orders_user_lower ON public.limit_orders(lower(user_address));
CREATE INDEX IF NOT EXISTS idx_limit_orders_status ON public.limit_orders(status);
CREATE INDEX IF NOT EXISTS idx_limit_orders_active ON public.limit_orders(user_address, status) WHERE status = 'pending';

-- DCA Orders indexes
CREATE INDEX IF NOT EXISTS idx_dca_orders_user_lower ON public.dca_orders(lower(user_address));
CREATE INDEX IF NOT EXISTS idx_dca_orders_status ON public.dca_orders(status);
CREATE INDEX IF NOT EXISTS idx_dca_orders_next_exec ON public.dca_orders(next_execution) WHERE status = 'active';

-- Referral indexes
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referrer ON public.referral_earnings(lower(referrer_address));
CREATE INDEX IF NOT EXISTS idx_referral_earnings_status ON public.referral_earnings(status);

-- Portfolio snapshots index
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_user_date ON public.portfolio_snapshots(lower(user_address), snapshot_date DESC);

-- Push subscriptions index
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_wallet ON public.push_subscriptions(lower(wallet_address));

-- Rebalance schedules index
CREATE INDEX IF NOT EXISTS idx_rebalance_schedules_user ON public.rebalance_schedules(lower(user_address));