import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  corsPreflightResponse,
  secureJsonResponse,
  secureErrorResponse,
  sanitizeInput,
  isValidWalletAddress,
} from '../_shared/security-headers.ts';

interface RegisterReferralRequest {
  referralCode: string;
  refereeAddress: string;
}

// Validate referral code format: XLAMA[8 hex chars]
function isValidReferralCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  return /^XLAMA[0-9A-Fa-f]{8}$/i.test(code);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  if (req.method !== 'POST') {
    return secureErrorResponse('Method not allowed', 405);
  }

  try {
    const body: RegisterReferralRequest = await req.json();
    const referralCode = sanitizeInput(body.referralCode || '', 20).toUpperCase();
    const refereeAddress = sanitizeInput(body.refereeAddress || '', 100);

    console.log('Register referral request:', { referralCode, refereeAddress: refereeAddress.slice(0, 10) + '...' });

    // Validate referral code format
    if (!isValidReferralCode(referralCode)) {
      console.log('Invalid referral code format:', referralCode);
      return secureErrorResponse('Invalid referral code format', 400, 'INVALID_CODE');
    }

    // Validate wallet address
    if (!isValidWalletAddress(refereeAddress)) {
      console.log('Invalid wallet address:', refereeAddress);
      return secureErrorResponse('Invalid wallet address', 400, 'INVALID_ADDRESS');
    }

    // Create service role client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check if referee is already referred (unique constraint will also prevent this)
    const { data: existing } = await supabase
      .from('referrals')
      .select('id')
      .eq('referee_address', refereeAddress.toLowerCase())
      .maybeSingle();

    if (existing) {
      console.log('User already referred:', refereeAddress.slice(0, 10));
      return secureJsonResponse({ success: false, error: 'Already referred' });
    }

    // Look up referrer by finding any existing referral with this code
    // The code is derived from the referrer's address: XLAMA + address.slice(2, 10).toUpperCase()
    const { data: referrerData } = await supabase
      .from('referrals')
      .select('referrer_address')
      .eq('referral_code', referralCode)
      .limit(1)
      .maybeSingle();

    let referrerAddress: string | null = referrerData?.referrer_address || null;

    // If no existing referral with this code, try to derive the referrer
    // For new referrers who haven't referred anyone yet, we need to accept the code
    // The code format is: XLAMA + address.slice(2, 10).toUpperCase()
    // We can't reverse this, but we can verify if a known address matches
    if (!referrerAddress) {
      // For the first referral, we need to trust the code format
      // The referrer will be set when they claim by connecting their wallet
      // For now, we'll store the code and use it for commission tracking
      console.log('First referral with this code - storing with code as referrer marker');
      
      // We can't know the referrer address from just the code for the first referral
      // The client should provide additional context or we need a registration step
      // For security, we reject codes that don't have an existing referrer
      return secureErrorResponse('Referral code not registered. The referrer must make at least one referral first.', 400, 'CODE_NOT_FOUND');
    }

    // Prevent self-referral
    if (referrerAddress.toLowerCase() === refereeAddress.toLowerCase()) {
      console.log('Self-referral attempt blocked');
      return secureErrorResponse('Cannot refer yourself', 400, 'SELF_REFERRAL');
    }

    // Insert the new referral using service role (bypasses RLS)
    const { error: insertError } = await supabase.from('referrals').insert({
      referrer_address: referrerAddress.toLowerCase(),
      referee_address: refereeAddress.toLowerCase(),
      referral_code: referralCode,
    });

    if (insertError) {
      console.error('Insert error:', insertError);
      // Check for unique constraint violation
      if (insertError.code === '23505') {
        return secureJsonResponse({ success: false, error: 'Already referred' });
      }
      return secureErrorResponse('Failed to register referral', 500);
    }

    console.log('Referral registered successfully:', { referrer: referrerAddress.slice(0, 10), referee: refereeAddress.slice(0, 10) });
    return secureJsonResponse({ success: true });

  } catch (error) {
    console.error('Register referral error:', error);
    return secureErrorResponse('Internal server error', 500);
  }
});
