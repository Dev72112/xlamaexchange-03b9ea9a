-- Fix RLS Policy Case Sensitivity Issues
-- Drop and recreate policies with case-insensitive matching using lower()

-- ============================================
-- LIMIT_ORDERS TABLE - 4 policies
-- ============================================
DROP POLICY IF EXISTS "Users can create own limit orders" ON limit_orders;
DROP POLICY IF EXISTS "Users can read own limit orders" ON limit_orders;
DROP POLICY IF EXISTS "Users can update own limit orders" ON limit_orders;
DROP POLICY IF EXISTS "Users can delete own limit orders" ON limit_orders;

CREATE POLICY "Users can create own limit orders" ON limit_orders
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    lower(user_address) = lower(COALESCE(
      (current_setting('request.headers'::text, true)::json ->> 'x-wallet-address'),
      ''
    ))
  );

CREATE POLICY "Users can read own limit orders" ON limit_orders
  FOR SELECT
  TO authenticated, anon
  USING (
    lower(user_address) = lower(COALESCE(
      (current_setting('request.headers'::text, true)::json ->> 'x-wallet-address'),
      ''
    ))
  );

CREATE POLICY "Users can update own limit orders" ON limit_orders
  FOR UPDATE
  TO authenticated, anon
  USING (
    lower(user_address) = lower(COALESCE(
      (current_setting('request.headers'::text, true)::json ->> 'x-wallet-address'),
      ''
    ))
  );

CREATE POLICY "Users can delete own limit orders" ON limit_orders
  FOR DELETE
  TO authenticated, anon
  USING (
    lower(user_address) = lower(COALESCE(
      (current_setting('request.headers'::text, true)::json ->> 'x-wallet-address'),
      ''
    ))
  );

-- ============================================
-- PORTFOLIO_SNAPSHOTS TABLE - 4 policies
-- ============================================
DROP POLICY IF EXISTS "Users can create own snapshots" ON portfolio_snapshots;
DROP POLICY IF EXISTS "Users can read own snapshots" ON portfolio_snapshots;
DROP POLICY IF EXISTS "Users can update own snapshots" ON portfolio_snapshots;
DROP POLICY IF EXISTS "Users can delete own snapshots" ON portfolio_snapshots;

CREATE POLICY "Users can create own snapshots" ON portfolio_snapshots
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    lower(user_address) = lower(COALESCE(
      (current_setting('request.headers'::text, true)::json ->> 'x-wallet-address'),
      ''
    ))
  );

CREATE POLICY "Users can read own snapshots" ON portfolio_snapshots
  FOR SELECT
  TO authenticated, anon
  USING (
    lower(user_address) = lower(COALESCE(
      (current_setting('request.headers'::text, true)::json ->> 'x-wallet-address'),
      ''
    ))
  );

CREATE POLICY "Users can update own snapshots" ON portfolio_snapshots
  FOR UPDATE
  TO authenticated, anon
  USING (
    lower(user_address) = lower(COALESCE(
      (current_setting('request.headers'::text, true)::json ->> 'x-wallet-address'),
      ''
    ))
  );

CREATE POLICY "Users can delete own snapshots" ON portfolio_snapshots
  FOR DELETE
  TO authenticated, anon
  USING (
    lower(user_address) = lower(COALESCE(
      (current_setting('request.headers'::text, true)::json ->> 'x-wallet-address'),
      ''
    ))
  );

-- ============================================
-- DCA_ORDERS TABLE - 4 policies
-- ============================================
DROP POLICY IF EXISTS "Users can create own DCA orders" ON dca_orders;
DROP POLICY IF EXISTS "Users can read own DCA orders" ON dca_orders;
DROP POLICY IF EXISTS "Users can update own DCA orders" ON dca_orders;
DROP POLICY IF EXISTS "Users can delete own DCA orders" ON dca_orders;

CREATE POLICY "Users can create own DCA orders" ON dca_orders
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    lower(user_address) = lower(COALESCE(
      (current_setting('request.headers'::text, true)::json ->> 'x-wallet-address'),
      ''
    ))
  );

CREATE POLICY "Users can read own DCA orders" ON dca_orders
  FOR SELECT
  TO authenticated, anon
  USING (
    lower(user_address) = lower(COALESCE(
      (current_setting('request.headers'::text, true)::json ->> 'x-wallet-address'),
      ''
    ))
  );

CREATE POLICY "Users can update own DCA orders" ON dca_orders
  FOR UPDATE
  TO authenticated, anon
  USING (
    lower(user_address) = lower(COALESCE(
      (current_setting('request.headers'::text, true)::json ->> 'x-wallet-address'),
      ''
    ))
  );

CREATE POLICY "Users can delete own DCA orders" ON dca_orders
  FOR DELETE
  TO authenticated, anon
  USING (
    lower(user_address) = lower(COALESCE(
      (current_setting('request.headers'::text, true)::json ->> 'x-wallet-address'),
      ''
    ))
  );

-- ============================================
-- PUSH_SUBSCRIPTIONS TABLE - 4 policies
-- ============================================
DROP POLICY IF EXISTS "Users can create own subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can read own subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can delete own subscriptions" ON push_subscriptions;

CREATE POLICY "Users can create own subscriptions" ON push_subscriptions
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    lower(wallet_address) = lower(COALESCE(
      (current_setting('request.headers'::text, true)::json ->> 'x-wallet-address'),
      ''
    ))
  );

CREATE POLICY "Users can read own subscriptions" ON push_subscriptions
  FOR SELECT
  TO authenticated, anon
  USING (
    lower(wallet_address) = lower(COALESCE(
      (current_setting('request.headers'::text, true)::json ->> 'x-wallet-address'),
      ''
    ))
  );

CREATE POLICY "Users can update own subscriptions" ON push_subscriptions
  FOR UPDATE
  TO authenticated, anon
  USING (
    lower(wallet_address) = lower(COALESCE(
      (current_setting('request.headers'::text, true)::json ->> 'x-wallet-address'),
      ''
    ))
  );

CREATE POLICY "Users can delete own subscriptions" ON push_subscriptions
  FOR DELETE
  TO authenticated, anon
  USING (
    lower(wallet_address) = lower(COALESCE(
      (current_setting('request.headers'::text, true)::json ->> 'x-wallet-address'),
      ''
    ))
  );

-- ============================================
-- BRIDGE_INTENTS TABLE - Add DELETE blocking policy
-- ============================================
CREATE POLICY "Block client deletes on bridge intents" ON bridge_intents
  FOR DELETE
  TO authenticated, anon
  USING (false);

-- ============================================
-- REFERRALS TABLE - Add UPDATE/DELETE blocking policies
-- ============================================
CREATE POLICY "Block client updates on referrals" ON referrals
  FOR UPDATE
  TO authenticated, anon
  USING (false);

CREATE POLICY "Block client deletes on referrals" ON referrals
  FOR DELETE
  TO authenticated, anon
  USING (false);

-- ============================================
-- REFERRAL_EARNINGS TABLE - Add UPDATE/DELETE blocking policies
-- ============================================
CREATE POLICY "Block client updates on referral earnings" ON referral_earnings
  FOR UPDATE
  TO authenticated, anon
  USING (false);

CREATE POLICY "Block client deletes on referral earnings" ON referral_earnings
  FOR DELETE
  TO authenticated, anon
  USING (false);