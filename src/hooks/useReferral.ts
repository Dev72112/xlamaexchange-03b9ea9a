import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const MINIMUM_CLAIM_USD = 150;

interface ReferralData {
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  claimableEarnings: number;
  referrals: {
    address: string;
    createdAt: string;
  }[];
  earnings: {
    amount: number;
    tokenSymbol: string;
    createdAt: string;
    status: string;
  }[];
}

interface ClaimData {
  id: string;
  claimAmountUsd: number;
  status: string;
  payoutAddress: string;
  payoutChain: string;
  createdAt: string;
  paidAt: string | null;
  payoutTxHash: string | null;
}

function generateReferralCode(address: string): string {
  const hash = address.slice(2, 10).toUpperCase();
  return `XLAMA${hash}`;
}

export function useReferral(walletAddress: string | null) {
  const [data, setData] = useState<ReferralData | null>(null);
  const [pendingClaim, setPendingClaim] = useState<ClaimData | null>(null);
  const [claimHistory, setClaimHistory] = useState<ClaimData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const referralCode = useMemo(() => {
    if (!walletAddress) return null;
    return generateReferralCode(walletAddress);
  }, [walletAddress]);

  const referralLink = useMemo(() => {
    if (!referralCode || !walletAddress) return null;
    // Include wallet address in referral link for first-time referral verification
    return `${window.location.origin}?ref=${referralCode}&ra=${walletAddress}`;
  }, [referralCode, walletAddress]);

  const canClaim = useMemo(() => {
    return data && data.claimableEarnings >= MINIMUM_CLAIM_USD && !pendingClaim;
  }, [data, pendingClaim]);

  // Fetch referral data
  const fetchReferralData = useCallback(async () => {
    if (!walletAddress || !referralCode) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get referrals where user is the referrer
      const { data: referrals, error: refError } = await supabase
        .from('referrals')
        .select('referee_address, created_at')
        .eq('referrer_address', walletAddress);

      if (refError) throw refError;

      // Get earnings with status
      const { data: earnings, error: earnError } = await supabase
        .from('referral_earnings')
        .select('commission_usd, token_symbol, created_at, status')
        .eq('referrer_address', walletAddress)
        .order('created_at', { ascending: false })
        .limit(50);

      if (earnError) throw earnError;

      // Get pending claim
      const { data: claims, error: claimError } = await supabase
        .from('commission_claims')
        .select('*')
        .eq('referrer_address', walletAddress.toLowerCase())
        .order('created_at', { ascending: false });

      if (claimError) throw claimError;

      const pending = claims?.find(c => c.status === 'pending') || null;
      setPendingClaim(pending ? {
        id: pending.id,
        claimAmountUsd: parseFloat(String(pending.claim_amount_usd)),
        status: pending.status,
        payoutAddress: pending.payout_address,
        payoutChain: pending.payout_chain,
        createdAt: pending.created_at,
        paidAt: pending.paid_at,
        payoutTxHash: pending.payout_tx_hash,
      } : null);

      setClaimHistory(claims?.filter(c => c.status !== 'pending').map(c => ({
        id: c.id,
        claimAmountUsd: parseFloat(String(c.claim_amount_usd)),
        status: c.status,
        payoutAddress: c.payout_address,
        payoutChain: c.payout_chain,
        createdAt: c.created_at,
        paidAt: c.paid_at,
        payoutTxHash: c.payout_tx_hash,
      })) || []);

      const totalEarnings = earnings?.reduce((sum, e) => sum + parseFloat(String(e.commission_usd)), 0) || 0;
      const claimableEarnings = earnings?.filter(e => e.status === 'earned')
        .reduce((sum, e) => sum + parseFloat(String(e.commission_usd)), 0) || 0;
      const pendingEarnings = earnings?.filter(e => e.status === 'pending_claim')
        .reduce((sum, e) => sum + parseFloat(String(e.commission_usd)), 0) || 0;

      setData({
        referralCode,
        referralLink: referralLink!,
        totalReferrals: referrals?.length || 0,
        totalEarnings,
        claimableEarnings,
        pendingEarnings,
        referrals: referrals?.map(r => ({
          address: r.referee_address,
          createdAt: r.created_at,
        })) || [],
        earnings: earnings?.map(e => ({
          amount: parseFloat(String(e.commission_usd)),
          tokenSymbol: e.token_symbol,
          createdAt: e.created_at,
          status: e.status,
        })) || [],
      });
    } catch (err: any) {
      console.error('Failed to fetch referral data:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, referralCode, referralLink]);

  // Check URL for referral code and register if new user via secure edge function
  useEffect(() => {
    const registerReferral = async () => {
      if (!walletAddress) return;

      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref');
      const referrerAddr = urlParams.get('ra'); // Referrer address for first-time verification
      
      if (!refCode || refCode === referralCode) return;

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        // Include referrer address header for first-time referral verification
        if (referrerAddr) {
          headers['x-referrer-address'] = referrerAddr;
        }

        const response = await fetch(`${SUPABASE_URL}/functions/v1/register-referral`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            referralCode: refCode,
            refereeAddress: walletAddress,
          }),
        });

        const result = await response.json();
        
        if (!result.success && result.error) {
          console.log('Referral registration:', result.error);
        }

        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('ref');
        newUrl.searchParams.delete('ra');
        window.history.replaceState({}, '', newUrl.toString());

      } catch (err) {
        console.error('Failed to register referral:', err);
      }
    };

    registerReferral();
  }, [walletAddress, referralCode]);

  // Initial fetch
  useEffect(() => {
    fetchReferralData();
  }, [fetchReferralData]);

  // Record a trade for commission via secure edge function (called after successful swap)
  const recordTradeCommission = useCallback(async (
    tradeHash: string,
    chainIndex: string,
    tokenSymbol: string,
    amountUsd: number
  ) => {
    if (!walletAddress) return;

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/record-commission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tradeHash,
          chainIndex,
          tokenSymbol,
          amountUsd,
          walletAddress,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to record commission:', error);
      }
    } catch (err) {
      console.error('Failed to record trade commission:', err);
    }
  }, [walletAddress]);

  // Submit a claim request
  const submitClaim = useCallback(async (payoutAddress: string, payoutChain: string) => {
    if (!walletAddress || !canClaim) return { success: false, error: 'Cannot submit claim' };

    setIsSubmittingClaim(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/submit-claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          referrerAddress: walletAddress,
          payoutAddress,
          payoutChain,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to submit claim' };
      }

      // Refetch data to update UI
      await fetchReferralData();

      return { success: true, claimId: result.claimId, claimAmount: result.claimAmount };
    } catch (err: any) {
      console.error('Failed to submit claim:', err);
      return { success: false, error: err.message || 'Failed to submit claim' };
    } finally {
      setIsSubmittingClaim(false);
    }
  }, [walletAddress, canClaim, fetchReferralData]);

  // Copy referral link to clipboard
  const copyReferralLink = useCallback(async () => {
    if (!referralLink) return false;
    try {
      await navigator.clipboard.writeText(referralLink);
      return true;
    } catch {
      return false;
    }
  }, [referralLink]);

  // Share on social media
  const shareOnTwitter = useCallback(() => {
    if (!referralLink) return;
    const text = `Trade crypto with the best rates on xlama! Use my referral link:`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralLink)}`,
      '_blank'
    );
  }, [referralLink]);

  const shareOnTelegram = useCallback(() => {
    if (!referralLink) return;
    const text = `Trade crypto with the best rates on xlama! Use my referral link: ${referralLink}`;
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`,
      '_blank'
    );
  }, [referralLink]);

  return {
    data,
    pendingClaim,
    claimHistory,
    isLoading,
    isSubmittingClaim,
    error,
    referralCode,
    referralLink,
    canClaim,
    minimumClaimAmount: MINIMUM_CLAIM_USD,
    copyReferralLink,
    shareOnTwitter,
    shareOnTelegram,
    recordTradeCommission,
    submitClaim,
    refetch: fetchReferralData,
  };
}
