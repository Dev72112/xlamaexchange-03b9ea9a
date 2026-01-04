import { memo, useState } from 'react';
import { 
  Users, 
  DollarSign, 
  Copy, 
  Check, 
  Share2, 
  Twitter, 
  Send,
  Gift,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useReferral } from '@/hooks/useReferral';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { cn } from '@/lib/utils';

export const ReferralDashboard = memo(function ReferralDashboard() {
  const { activeAddress, isConnected } = useMultiWallet();
  const { 
    data, 
    isLoading, 
    referralCode, 
    referralLink,
    copyReferralLink,
    shareOnTwitter,
    shareOnTelegram,
  } = useReferral(activeAddress);
  
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleCopy = async () => {
    const success = await copyReferralLink();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-secondary/30 border border-border/30">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Total Referrals</span>
                </div>
                <p className="text-2xl font-semibold font-mono">
                  {data?.totalReferrals || 0}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30 border border-border/30">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Total Earnings</span>
                </div>
                <p className="text-2xl font-semibold font-mono">
                  ${(data?.totalEarnings || 0).toFixed(2)}
                </p>
              </div>
            </div>

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
                size="sm"
                className="flex-1"
                onClick={shareOnTwitter}
              >
                <Twitter className="w-4 h-4 mr-2" />
                Twitter
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
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

            {/* How it works */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">How it works:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Share your unique referral link</li>
                <li>Earn 0.5% commission on every swap your referrals make</li>
                <li>No limits on earnings</li>
              </ul>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
});
