-- Add limit order timeout tracking
ALTER TABLE public.limit_orders 
ADD COLUMN IF NOT EXISTS trigger_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS user_dismissed BOOLEAN DEFAULT false;

-- Create index for efficient expired order queries  
CREATE INDEX IF NOT EXISTS idx_limit_orders_trigger_expires 
ON public.limit_orders (trigger_expires_at) 
WHERE status = 'triggered' AND trigger_expires_at IS NOT NULL;