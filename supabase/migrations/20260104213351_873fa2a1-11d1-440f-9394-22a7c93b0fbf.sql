-- Create rebalance_schedules table for automatic portfolio rebalancing
CREATE TABLE public.rebalance_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'My Rebalance',
  target_allocations JSONB NOT NULL DEFAULT '{}',
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),
  threshold_percent NUMERIC DEFAULT 5.0,
  next_execution TIMESTAMPTZ NOT NULL,
  last_execution TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  chains TEXT NOT NULL,
  slippage TEXT DEFAULT '0.5',
  total_rebalances INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.rebalance_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own rebalance schedules"
ON public.rebalance_schedules
FOR SELECT
USING (lower(user_address) = lower(current_setting('request.headers', true)::json->>'x-wallet-address'));

CREATE POLICY "Users can create their own rebalance schedules"
ON public.rebalance_schedules
FOR INSERT
WITH CHECK (lower(user_address) = lower(current_setting('request.headers', true)::json->>'x-wallet-address'));

CREATE POLICY "Users can update their own rebalance schedules"
ON public.rebalance_schedules
FOR UPDATE
USING (lower(user_address) = lower(current_setting('request.headers', true)::json->>'x-wallet-address'));

CREATE POLICY "Users can delete their own rebalance schedules"
ON public.rebalance_schedules
FOR DELETE
USING (lower(user_address) = lower(current_setting('request.headers', true)::json->>'x-wallet-address'));

-- Performance index
CREATE INDEX idx_rebalance_schedules_user_status ON public.rebalance_schedules(user_address, status);
CREATE INDEX idx_rebalance_schedules_next_execution ON public.rebalance_schedules(next_execution) WHERE status = 'active';

-- Trigger for updated_at
CREATE TRIGGER update_rebalance_schedules_updated_at
BEFORE UPDATE ON public.rebalance_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();