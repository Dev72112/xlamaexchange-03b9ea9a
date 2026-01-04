import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
};

const COMMISSION_RATE = 0.005; // 0.5% commission

interface CommissionRequest {
  tradeHash: string;
  chainIndex: string;
  tokenSymbol: string;
  amountUsd: number;
  walletAddress: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body: CommissionRequest = await req.json();
    const { tradeHash, chainIndex, tokenSymbol, amountUsd, walletAddress } = body;

    // Input validation
    if (!tradeHash || typeof tradeHash !== 'string' || tradeHash.length < 10 || tradeHash.length > 100) {
      console.error('Invalid tradeHash:', tradeHash);
      return new Response(
        JSON.stringify({ error: 'Invalid trade hash' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!chainIndex || typeof chainIndex !== 'string' || chainIndex.length > 20) {
      console.error('Invalid chainIndex:', chainIndex);
      return new Response(
        JSON.stringify({ error: 'Invalid chain index' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tokenSymbol || typeof tokenSymbol !== 'string' || tokenSymbol.length > 20) {
      console.error('Invalid tokenSymbol:', tokenSymbol);
      return new Response(
        JSON.stringify({ error: 'Invalid token symbol' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof amountUsd !== 'number' || amountUsd <= 0 || amountUsd > 1000000000) {
      console.error('Invalid amountUsd:', amountUsd);
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!walletAddress || typeof walletAddress !== 'string' || walletAddress.length < 10 || walletAddress.length > 100) {
      console.error('Invalid walletAddress:', walletAddress);
      return new Response(
        JSON.stringify({ error: 'Invalid wallet address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role key for bypassing RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if this trade hash has already been recorded (prevent duplicates)
    const { data: existingEarning, error: checkError } = await supabase
      .from('referral_earnings')
      .select('id')
      .eq('trade_hash', tradeHash)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing earning:', checkError);
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingEarning) {
      console.log('Trade hash already recorded:', tradeHash);
      return new Response(
        JSON.stringify({ success: true, message: 'Already recorded' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this wallet was referred
    const { data: referral, error: refError } = await supabase
      .from('referrals')
      .select('referrer_address')
      .eq('referee_address', walletAddress)
      .maybeSingle();

    if (refError) {
      console.error('Error fetching referral:', refError);
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!referral?.referrer_address) {
      // No referrer, no commission to record
      console.log('No referrer found for wallet:', walletAddress);
      return new Response(
        JSON.stringify({ success: true, message: 'No referrer' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate commission server-side
    const commissionUsd = amountUsd * COMMISSION_RATE;

    // Record the earning using service role (bypasses RLS)
    const { error: insertError } = await supabase
      .from('referral_earnings')
      .insert({
        referrer_address: referral.referrer_address,
        referee_address: walletAddress,
        trade_hash: tradeHash,
        chain_index: chainIndex,
        token_symbol: tokenSymbol,
        amount_usd: amountUsd,
        commission_rate: COMMISSION_RATE,
        commission_usd: commissionUsd,
      });

    if (insertError) {
      // Handle unique constraint violation gracefully
      if (insertError.code === '23505') {
        console.log('Duplicate trade hash (constraint):', tradeHash);
        return new Response(
          JSON.stringify({ success: true, message: 'Already recorded' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.error('Error inserting earning:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to record commission' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Commission recorded successfully:', {
      tradeHash,
      referrer: referral.referrer_address,
      referee: walletAddress,
      commissionUsd,
    });

    return new Response(
      JSON.stringify({ success: true, commissionUsd }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});