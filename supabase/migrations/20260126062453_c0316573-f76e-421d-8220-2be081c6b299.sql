-- Enable realtime for limit_orders and dca_orders tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.limit_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dca_orders;