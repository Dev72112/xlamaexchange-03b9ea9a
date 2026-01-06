-- Phase 6 & 7: Add execution tracking columns to limit_orders and dca_orders

-- Add execution tracking to limit_orders
ALTER TABLE public.limit_orders 
ADD COLUMN IF NOT EXISTS execution_tx_hash TEXT,
ADD COLUMN IF NOT EXISTS executed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS execution_error TEXT;

-- Add execution time and tracking to dca_orders
ALTER TABLE public.dca_orders 
ADD COLUMN IF NOT EXISTS execution_hour INTEGER DEFAULT 9,
ADD COLUMN IF NOT EXISTS last_execution_tx_hash TEXT,
ADD COLUMN IF NOT EXISTS last_execution_error TEXT;

-- Add indexes for efficient order querying during execution
CREATE INDEX IF NOT EXISTS idx_limit_orders_status_expires ON public.limit_orders(status, expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_dca_orders_next_execution ON public.dca_orders(next_execution) WHERE status = 'active';