import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  corsPreflightResponse,
  corsHeaders,
  secureJsonResponse,
  secureErrorResponse,
  sanitizeInput,
  isValidWalletAddress,
} from '../_shared/security-headers.ts';
import { checkRateLimit, getClientIp, rateLimitResponse } from '../_shared/rate-limit.ts';

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

  const clientIp = getClientIp(req);

  // Check persistent rate limit (10 req/min for referral registration)
  const rateCheck = await checkRateLimit('register-referral', clientIp);
  if (!rateCheck.allowed) {
    console.warn(`Rate limit exceeded for register-referral from ${clientIp}`);
    return rateLimitResponse(corsHeaders);
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

    // If no existing referral with this code, we need the referrer to self-register
    // The code format is: XLAMA + address.slice(2, 10).toUpperCase()
    // We cannot reverse this to get the full address, so we need referrer registration
    if (!referrerAddress) {
      // Check if the client provided the referrer address for first-time registration
      const providedReferrer = req.headers.get('x-referrer-address');
      
      if (providedReferrer && isValidWalletAddress(providedReferrer)) {
        // Verify the provided address matches the code
        const expectedCode = 'XLAMA' + providedReferrer.slice(2, 10).toUpperCase();
        if (expectedCode === referralCode) {
          referrerAddress = providedReferrer.toLowerCase();
          console.log('First referral - verified referrer from header:', referrerAddress.slice(0, 10));
        } else {
          console.log('Referrer address does not match code:', { expectedCode, referralCode });
          return secureErrorResponse('Referrer address does not match code', 400, 'CODE_MISMATCH');
        }
      } else {
        // For security, we need to know who the referrer is
        // The referrer can share their link with their full address
        console.log('Referral code not found and no referrer address provided');
        return secureErrorResponse('Referral code not yet activated. Ask your referrer to share their full link.', 400, 'CODE_NOT_ACTIVATED');
      }
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
