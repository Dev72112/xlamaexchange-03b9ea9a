-- Add Take Profit and Stop Loss fields to limit_orders table
ALTER TABLE public.limit_orders 
ADD COLUMN IF NOT EXISTS take_profit_price NUMERIC NULL,
ADD COLUMN IF NOT EXISTS stop_loss_price NUMERIC NULL,
ADD COLUMN IF NOT EXISTS tp_triggered_at TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN IF NOT EXISTS sl_triggered_at TIMESTAMP WITH TIME ZONE NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.limit_orders.take_profit_price IS 'Optional take profit price level';
COMMENT ON COLUMN public.limit_orders.stop_loss_price IS 'Optional stop loss price level';
COMMENT ON COLUMN public.limit_orders.tp_triggered_at IS 'When take profit was triggered';
COMMENT ON COLUMN public.limit_orders.sl_triggered_at IS 'When stop loss was triggered';