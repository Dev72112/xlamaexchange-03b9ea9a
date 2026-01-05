/**
 * SECURITY NOTICE: This endpoint is DISABLED until proper on-chain verification is implemented.
 * 
 * The previous implementation accepted any trade data from clients without verification.
 * This allowed malicious actors to:
 * 1. Submit fake trade hashes to create fraudulent referral earnings
 * 2. Inflate referral statistics and drain reward pools
 * 3. Forge commissions for any wallet address
 * 
 * To re-enable, implement one of these security measures:
 * - On-chain verification: Query the blockchain to verify tx exists and amounts match
 * - Backend-only recording: Record commissions only from server-side swap processing
 * - Signed requests with on-chain verification: Require wallet signature + verify tx on-chain
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // SECURITY: This endpoint is disabled until proper on-chain verification is implemented
  console.error('record-commission endpoint is disabled for security - no on-chain verification');
  
  return new Response(
    JSON.stringify({ 
      error: 'Commission recording is temporarily disabled for security hardening',
      message: 'This feature will be re-enabled once on-chain transaction verification is implemented'
    }),
    { 
      status: 503, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
});
