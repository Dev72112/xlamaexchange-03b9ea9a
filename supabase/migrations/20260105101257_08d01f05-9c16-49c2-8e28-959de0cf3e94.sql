-- Create nonce tracking table to prevent signature replay attacks
CREATE TABLE IF NOT EXISTS public.signature_nonces (
  nonce TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  action TEXT NOT NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index for cleanup of old nonces
CREATE INDEX IF NOT EXISTS idx_signature_nonces_used_at ON public.signature_nonces(used_at);

-- Enable RLS (service role will bypass, but good practice)
ALTER TABLE public.signature_nonces ENABLE ROW LEVEL SECURITY;

-- No client access - only service role can interact
CREATE POLICY "Block all client access to nonces"
ON public.signature_nonces
FOR ALL
USING (false)
WITH CHECK (false);

-- Add comment explaining purpose
COMMENT ON TABLE public.signature_nonces IS 'Tracks used signature nonces to prevent replay attacks on signed operations';