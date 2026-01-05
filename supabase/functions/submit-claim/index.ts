import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { 
  corsPreflightResponse, 
  secureJsonResponse, 
  secureErrorResponse,
  isValidWalletAddress,
} from '../_shared/security-headers.ts';

const MINIMUM_CLAIM_USD = 150; // $150 minimum
const SUPPORT_EMAIL = 'support@xlama.io'; // Update with your actual support email
const RESEND_API_URL = 'https://api.resend.com/emails';

interface ClaimRequest {
  referrerAddress: string;
  payoutAddress: string;
  payoutChain: string;
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
    const body: ClaimRequest = await req.json();
    const { referrerAddress, payoutAddress, payoutChain } = body;

    // Validate referrer address
    if (!referrerAddress || !isValidWalletAddress(referrerAddress)) {
      console.error('Invalid referrer address:', referrerAddress);
      return secureErrorResponse('Invalid referrer address', 400);
    }

    // Validate payout address
    if (!payoutAddress || !isValidWalletAddress(payoutAddress)) {
      console.error('Invalid payout address:', payoutAddress);
      return secureErrorResponse('Invalid payout address', 400);
    }

    // Validate payout chain
    if (!payoutChain || typeof payoutChain !== 'string' || payoutChain.length > 50) {
      console.error('Invalid payout chain:', payoutChain);
      return secureErrorResponse('Invalid payout chain', 400);
    }

    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for existing pending claim
    const { data: existingClaim, error: claimCheckError } = await supabase
      .from('commission_claims')
      .select('id, status')
      .eq('referrer_address', referrerAddress.toLowerCase())
      .eq('status', 'pending')
      .maybeSingle();

    if (claimCheckError) {
      console.error('Error checking existing claims:', claimCheckError);
      return secureErrorResponse('Database error', 500);
    }

    if (existingClaim) {
      return secureErrorResponse('You already have a pending claim. Please wait for it to be processed.', 400);
    }

    // Calculate total unclaimed earnings
    const { data: earnings, error: earningsError } = await supabase
      .from('referral_earnings')
      .select('id, commission_usd')
      .eq('referrer_address', referrerAddress.toLowerCase())
      .eq('status', 'earned');

    if (earningsError) {
      console.error('Error fetching earnings:', earningsError);
      return secureErrorResponse('Database error', 500);
    }

    if (!earnings || earnings.length === 0) {
      return secureErrorResponse('No unclaimed earnings found', 400);
    }

    const totalClaimableUsd = earnings.reduce((sum, e) => sum + parseFloat(String(e.commission_usd)), 0);

    if (totalClaimableUsd < MINIMUM_CLAIM_USD) {
      return secureErrorResponse(
        `Minimum claim amount is $${MINIMUM_CLAIM_USD}. Your current balance: $${totalClaimableUsd.toFixed(2)}`,
        400
      );
    }

    // Create claim record
    const claimId = crypto.randomUUID();
    const { error: insertClaimError } = await supabase
      .from('commission_claims')
      .insert({
        id: claimId,
        referrer_address: referrerAddress.toLowerCase(),
        claim_amount_usd: totalClaimableUsd,
        status: 'pending',
        payout_address: payoutAddress,
        payout_chain: payoutChain,
      });

    if (insertClaimError) {
      console.error('Error creating claim:', insertClaimError);
      return secureErrorResponse('Failed to create claim', 500);
    }

    // Update all unclaimed earnings to pending_claim status
    const earningIds = earnings.map(e => e.id);
    const { error: updateError } = await supabase
      .from('referral_earnings')
      .update({ 
        status: 'pending_claim',
        claimed_at: new Date().toISOString(),
        claim_id: claimId,
      })
      .in('id', earningIds);

    if (updateError) {
      console.error('Error updating earnings:', updateError);
      // Rollback claim creation
      await supabase.from('commission_claims').delete().eq('id', claimId);
      return secureErrorResponse('Failed to update earnings', 500);
    }

    // Send email notification to support using fetch (Resend API)
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
      try {
        const emailResponse = await fetch(RESEND_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'xlama Referrals <onboarding@resend.dev>',
            to: [SUPPORT_EMAIL],
            subject: `🔔 New Commission Claim Request - $${totalClaimableUsd.toFixed(2)}`,
            html: `
              <h2>New Commission Claim Request</h2>
              <hr />
              <h3>Claim Details:</h3>
              <ul>
                <li><strong>Claim ID:</strong> ${claimId}</li>
                <li><strong>Referrer Wallet:</strong> ${referrerAddress}</li>
                <li><strong>Payout Address:</strong> ${payoutAddress}</li>
                <li><strong>Payout Chain:</strong> ${payoutChain}</li>
                <li><strong>Total Amount:</strong> $${totalClaimableUsd.toFixed(2)}</li>
                <li><strong>Earnings Count:</strong> ${earnings.length} trades</li>
                <li><strong>Submitted:</strong> ${new Date().toISOString()}</li>
              </ul>
              <hr />
              <p>Please review in the database and process manually.</p>
              <p>To approve: Update commission_claims.status to 'approved' and referral_earnings.status to 'claimed'</p>
              <p>To mark as paid: Update commission_claims.status to 'paid' and add payout_tx_hash</p>
            `,
          }),
        });
        
        if (emailResponse.ok) {
          console.log('Claim notification email sent to support');
        } else {
          const emailError = await emailResponse.text();
          console.error('Failed to send email:', emailError);
        }
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the request if email fails
      }
    } else {
      console.warn('RESEND_API_KEY not configured, skipping email notification');
    }

    console.log('Claim submitted successfully:', {
      claimId,
      referrerAddress,
      totalClaimableUsd,
      earningsCount: earnings.length,
    });

    return secureJsonResponse({
      success: true,
      claimId,
      claimAmount: totalClaimableUsd,
      message: 'Your claim has been submitted for review. You will be notified when it is processed.',
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return secureErrorResponse('Internal server error', 500);
  }
});
