import { memo, useState } from 'react';
import { 
  Users, 
  DollarSign, 
  Copy, 
  Check, 
  Twitter, 
  Send,
  Gift,
  ChevronDown,
  ChevronUp,
  Wallet,
  Clock,
  AlertCircle,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useReferral } from '@/hooks/useReferral';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const PAYOUT_CHAINS = [
  { id: '1', name: 'Ethereum', symbol: 'ETH' },
  { id: '56', name: 'BNB Chain', symbol: 'BNB' },
  { id: '137', name: 'Polygon', symbol: 'MATIC' },
  { id: '42161', name: 'Arbitrum', symbol: 'ARB' },
  { id: '8453', name: 'Base', symbol: 'BASE' },
  { id: '10', name: 'Optimism', symbol: 'OP' },
  { id: '43114', name: 'Avalanche', symbol: 'AVAX' },
];

export const ReferralDashboard = memo(function ReferralDashboard() {
  const { activeAddress, isConnected } = useMultiWallet();
  const { toast } = useToast();
  const { 
    data, 
    pendingClaim,
    claimHistory,
    isLoading, 
    isSubmittingClaim,
    referralCode, 
    referralLink,
    canClaim,
    minimumClaimAmount,
    copyReferralLink,
    shareOnTwitter,
    shareOnTelegram,
    submitClaim,
    refetch,
  } = useReferral(activeAddress);
  
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [payoutAddress, setPayoutAddress] = useState('');
  const [payoutChain, setPayoutChain] = useState('');

  const handleCopy = async () => {
    const success = await copyReferralLink();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmitClaim = async () => {
    if (!payoutAddress || !payoutChain) {
      toast({
        title: 'Missing Information',
        description: 'Please enter a payout address and select a chain.',
        variant: 'destructive',
      });
      return;
    }

    const result = await submitClaim(payoutAddress, payoutChain);
    
    if (result.success) {
      toast({
        title: 'Claim Submitted! 🎉',
        description: `Your claim for $${result.claimAmount?.toFixed(2)} has been submitted for review.`,
      });
      setShowClaimDialog(false);
      setPayoutAddress('');
      setPayoutChain('');
    } else {
      toast({
        title: 'Claim Failed',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const openClaimDialog = () => {
    setPayoutAddress(activeAddress || '');
    setShowClaimDialog(true);
  };

  if (!isConnected) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardContent className="py-8 text-center">
          <Gift className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            Connect your wallet to access the referral program
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/50 bg-card/50 overflow-hidden">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-secondary/30 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Gift className="w-4 h-4 text-primary" />
                  Referral Program
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    0.5% commission
                  </Badge>
                </CardTitle>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 rounded-lg bg-secondary/30 border border-border/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-[10px] sm:text-xs text-muted-foreground truncate">Total Referrals</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-semibold font-mono">
                    {data?.totalReferrals || 0}
                  </p>
                </div>
                <div className="p-3 sm:p-4 rounded-lg bg-secondary/30 border border-border/30">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-[10px] sm:text-xs text-muted-foreground truncate">Total Earnings</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-semibold font-mono truncate">
                    ${(data?.totalEarnings || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Claimable Balance & Claim Button */}
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Wallet className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Claimable Balance</span>
                    </div>
                    <p className="text-2xl font-bold font-mono text-primary">
                      ${(data?.claimableEarnings || 0).toFixed(2)}
                    </p>
                  </div>
                  <Button
                    onClick={openClaimDialog}
                    disabled={!canClaim || isSubmittingClaim}
                    size="sm"
                  >
                    {isSubmittingClaim ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Request Payout'
                    )}
                  </Button>
                </div>
                {!canClaim && (data?.claimableEarnings || 0) < minimumClaimAmount && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Minimum ${minimumClaimAmount} required to claim
                  </p>
                )}
              </div>

              {/* Pending Claim Status */}
              {pendingClaim && (
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-warning" />
                    <span className="font-medium text-warning">Pending Claim</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    ${pendingClaim.claimAmountUsd.toFixed(2)} submitted on{' '}
                    {new Date(pendingClaim.createdAt).toLocaleDateString()} • Under review
                  </p>
                </div>
              )}

              {/* Pending Earnings (locked in pending claims) */}
              {(data?.pendingEarnings || 0) > 0 && (
                <div className="text-xs text-muted-foreground">
                  ${data?.pendingEarnings.toFixed(2)} pending in active claims
                </div>
              )}

              {/* Referral Link */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Your Referral Link</label>
                <div className="flex gap-2">
                  <Input
                    value={referralLink || ''}
                    readOnly
                    className="font-mono text-xs bg-secondary/30"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-primary" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Code: <span className="font-mono text-foreground">{referralCode}</span>
                </p>
              </div>

              {/* Share Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 min-h-[44px]"
                  onClick={shareOnTwitter}
                >
                  <Twitter className="w-4 h-4 mr-2" />
                  Twitter
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 min-h-[44px]"
                  onClick={shareOnTelegram}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Telegram
                </Button>
              </div>

              {/* Recent Referrals */}
              {data?.referrals && data.referrals.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Recent Referrals</h4>
                  <div className="space-y-2">
                    {data.referrals.slice(0, 3).map((ref, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded-lg bg-secondary/20 text-sm"
                      >
                        <span className="font-mono text-xs truncate max-w-[150px]">
                          {ref.address.slice(0, 6)}...{ref.address.slice(-4)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(ref.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Claim History */}
              {claimHistory.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Claim History</h4>
                  <div className="space-y-2">
                    {claimHistory.slice(0, 3).map((claim) => (
                      <div
                        key={claim.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-secondary/20 text-sm"
                      >
                        <div>
                          <span className="font-mono">${claim.claimAmountUsd.toFixed(2)}</span>
                          <Badge 
                            variant={claim.status === 'paid' ? 'default' : 'secondary'}
                            className="ml-2 text-[10px]"
                          >
                            {claim.status}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(claim.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* How it works */}
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">How it works:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Share your unique referral link</li>
                  <li>Earn 0.5% commission on every swap your referrals make</li>
                  <li>Minimum ${minimumClaimAmount} to request payout</li>
                  <li>Payouts reviewed and processed manually</li>
                </ul>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Claim Dialog */}
      <Dialog open={showClaimDialog} onOpenChange={setShowClaimDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Payout</DialogTitle>
            <DialogDescription>
              Submit your commission payout request. Our team will review and process it manually.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-center">
              <p className="text-sm text-muted-foreground">Amount to claim</p>
              <p className="text-2xl font-bold font-mono text-primary">
                ${(data?.claimableEarnings || 0).toFixed(2)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payout-address">Payout Wallet Address</Label>
              <Input
                id="payout-address"
                placeholder="0x..."
                value={payoutAddress}
                onChange={(e) => setPayoutAddress(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Enter the wallet address where you want to receive your payout
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payout-chain">Payout Chain</Label>
              <Select value={payoutChain} onValueChange={setPayoutChain}>
                <SelectTrigger id="payout-chain">
                  <SelectValue placeholder="Select chain" />
                </SelectTrigger>
                <SelectContent>
                  {PAYOUT_CHAINS.map((chain) => (
                    <SelectItem key={chain.id} value={chain.name}>
                      {chain.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose which blockchain you'd like to receive payment on
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClaimDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitClaim} disabled={isSubmittingClaim || !payoutAddress || !payoutChain}>
              {isSubmittingClaim ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Claim'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});
