-- =============================================
-- PHASE 1: FIX CRITICAL RLS SECURITY ISSUES
-- =============================================

-- Drop existing overly permissive policies on limit_orders
DROP POLICY IF EXISTS "Public delete access for limit orders" ON public.limit_orders;
DROP POLICY IF EXISTS "Public insert access for limit orders" ON public.limit_orders;
DROP POLICY IF EXISTS "Public read access for limit orders" ON public.limit_orders;
DROP POLICY IF EXISTS "Public update access for limit orders" ON public.limit_orders;

-- Create secure wallet-address-based RLS policies for limit_orders
-- Users can only read their own orders
CREATE POLICY "Users can read own limit orders"
ON public.limit_orders
FOR SELECT
USING (
  user_address = COALESCE(
    current_setting('request.headers', true)::json->>'x-wallet-address',
    ''
  )
);

-- Users can only insert orders with their own wallet address
CREATE POLICY "Users can insert own limit orders"
ON public.limit_orders
FOR INSERT
WITH CHECK (
  user_address = COALESCE(
    current_setting('request.headers', true)::json->>'x-wallet-address',
    ''
  )
);

-- Users can only update their own orders
CREATE POLICY "Users can update own limit orders"
ON public.limit_orders
FOR UPDATE
USING (
  user_address = COALESCE(
    current_setting('request.headers', true)::json->>'x-wallet-address',
    ''
  )
);

-- Users can only delete their own orders
CREATE POLICY "Users can delete own limit orders"
ON public.limit_orders
FOR DELETE
USING (
  user_address = COALESCE(
    current_setting('request.headers', true)::json->>'x-wallet-address',
    ''
  )
);

-- Drop existing overly permissive policies on portfolio_snapshots
DROP POLICY IF EXISTS "Public insert access for portfolio snapshots" ON public.portfolio_snapshots;
DROP POLICY IF EXISTS "Public read access for portfolio snapshots" ON public.portfolio_snapshots;

-- Create secure wallet-address-based RLS policies for portfolio_snapshots
-- Users can only read their own snapshots
CREATE POLICY "Users can read own portfolio snapshots"
ON public.portfolio_snapshots
FOR SELECT
USING (
  user_address = COALESCE(
    current_setting('request.headers', true)::json->>'x-wallet-address',
    ''
  )
);

-- Users can only insert snapshots with their own wallet address
CREATE POLICY "Users can insert own portfolio snapshots"
ON public.portfolio_snapshots
FOR INSERT
WITH CHECK (
  user_address = COALESCE(
    current_setting('request.headers', true)::json->>'x-wallet-address',
    ''
  )
);

-- Users can update their own snapshots (needed for upsert)
CREATE POLICY "Users can update own portfolio snapshots"
ON public.portfolio_snapshots
FOR UPDATE
USING (
  user_address = COALESCE(
    current_setting('request.headers', true)::json->>'x-wallet-address',
    ''
  )
);

-- Users can delete their own snapshots
CREATE POLICY "Users can delete own portfolio snapshots"
ON public.portfolio_snapshots
FOR DELETE
USING (
  user_address = COALESCE(
    current_setting('request.headers', true)::json->>'x-wallet-address',
    ''
  )
);

-- =============================================
-- PHASE 2: ADD MISSING CONSTRAINTS & INDEXES
-- =============================================

-- Add unique constraint for portfolio_snapshots upsert functionality
ALTER TABLE public.portfolio_snapshots
ADD CONSTRAINT portfolio_snapshots_user_chain_date_unique
UNIQUE (user_address, chain_index, snapshot_date);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_limit_orders_user_status 
ON public.limit_orders(user_address, status);

CREATE INDEX IF NOT EXISTS idx_limit_orders_status_expires 
ON public.limit_orders(status, expires_at);

CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_user_date 
ON public.portfolio_snapshots(user_address, snapshot_date DESC);