/**
 * Builder Fee Approval Component
 * 
 * Modal for one-time EIP-712 builder fee approval on Hyperliquid.
 */

import { memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Loader2, 
  Check, 
  Info,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BuilderFeeApprovalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => Promise<boolean>;
  isLoading: boolean;
  feePercent: string;
  builderAddress: string;
}

export const BuilderFeeApproval = memo(function BuilderFeeApproval({
  isOpen,
  onClose,
  onApprove,
  isLoading,
  feePercent,
  builderAddress,
}: BuilderFeeApprovalProps) {
  const handleApprove = async () => {
    const success = await onApprove();
    if (success) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="glass max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            One-Time Approval Required
          </DialogTitle>
          <DialogDescription>
            Approve the platform fee to start trading on xlama
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Fee Explanation */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Platform Fee</span>
              <Badge variant="outline" className="font-mono text-primary border-primary/30">
                {feePercent}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              This small fee helps support xlama development and is only charged on filled orders.
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-2">
            <div className="flex items-start gap-3 text-sm">
              <Check className="w-4 h-4 text-success mt-0.5 shrink-0" />
              <span>One-time signature - never asked again</span>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Check className="w-4 h-4 text-success mt-0.5 shrink-0" />
              <span>No funds are transferred during approval</span>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Check className="w-4 h-4 text-success mt-0.5 shrink-0" />
              <span>Fee only charged when your orders fill</span>
            </div>
          </div>

          {/* Builder Address */}
          <div className="p-3 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Wallet className="w-3.5 h-3.5" />
              Builder Address
            </div>
            <p className="font-mono text-xs break-all">
              {builderAddress || 'Not configured'}
            </p>
          </div>

          {/* Info Note */}
          <div className="flex gap-2 text-xs text-muted-foreground">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              This approval authorizes xlama to include a small fee in your trades. 
              Your wallet will prompt you to sign a message (no transaction required).
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleApprove} 
            disabled={isLoading || !builderAddress}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                Approve & Continue
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
