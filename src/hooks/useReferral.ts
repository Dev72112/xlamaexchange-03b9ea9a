import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface ReferralData {
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  referrals: {
    address: string;
    createdAt: string;
  }[];
  earnings: {
    amount: number;
    tokenSymbol: string;
    createdAt: string;
  }[];
}



function generateReferralCode(address: string): string {
  // Create a short code from wallet address
  const hash = address.slice(2, 10).toUpperCase();
  return `XLAMA${hash}`;
}

export function useReferral(walletAddress: string | null) {
  const [data, setData] = useState<ReferralData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const referralCode = useMemo(() => {
    if (!walletAddress) return null;
    return generateReferralCode(walletAddress);
  }, [walletAddress]);

  const referralLink = useMemo(() => {
    if (!referralCode) return null;
    return `${window.location.origin}?ref=${referralCode}`;
  }, [referralCode]);

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

      // Get earnings
      const { data: earnings, error: earnError } = await supabase
        .from('referral_earnings')
        .select('commission_usd, token_symbol, created_at')
        .eq('referrer_address', walletAddress)
        .order('created_at', { ascending: false })
        .limit(20);

      if (earnError) throw earnError;

      const totalEarnings = earnings?.reduce((sum, e) => sum + parseFloat(String(e.commission_usd)), 0) || 0;

      setData({
        referralCode,
        referralLink: referralLink!,
        totalReferrals: referrals?.length || 0,
        totalEarnings,
        pendingEarnings: 0,
        referrals: referrals?.map(r => ({
          address: r.referee_address,
          createdAt: r.created_at,
        })) || [],
        earnings: earnings?.map(e => ({
          amount: parseFloat(String(e.commission_usd)),
          tokenSymbol: e.token_symbol,
          createdAt: e.created_at,
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
      
      if (!refCode || refCode === referralCode) return;

      try {
        // Call secure edge function to register referral
        const response = await fetch(`${SUPABASE_URL}/functions/v1/register-referral`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            referralCode: refCode,
            refereeAddress: walletAddress,
          }),
        });

        const result = await response.json();
        
        if (!result.success && result.error) {
          console.log('Referral registration:', result.error);
        }

        // Clear ref from URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('ref');
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
      // Call edge function for server-side commission recording
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
    isLoading,
    error,
    referralCode,
    referralLink,
    copyReferralLink,
    shareOnTwitter,
    shareOnTelegram,
    recordTradeCommission,
    refetch: fetchReferralData,
  };
}
