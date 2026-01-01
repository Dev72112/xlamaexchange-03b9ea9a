import { AlertTriangle, ExternalLink, Shield, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OkxToken } from "@/services/okxdex";
import { Chain } from "@/data/chains";
import { useState } from "react";

interface CustomTokenConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: OkxToken | null;
  chain: Chain | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CustomTokenConfirmDialog({
  open,
  onOpenChange,
  token,
  chain,
  onConfirm,
  onCancel,
}: CustomTokenConfirmDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!token) return null;

  const explorerUrl = chain?.blockExplorer 
    ? `${chain.blockExplorer}/address/${token.tokenContractAddress}`
    : null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(token.tokenContractAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md mx-auto p-4 sm:p-6">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2 text-warning text-base sm:text-lg">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>Add Custom Token</span>
          </DialogTitle>
          <DialogDescription className="text-sm">
            This token is not on our verified list. Please verify the contract address before trading.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Token Info */}
          <div className="p-3 sm:p-4 bg-secondary/50 rounded-lg border border-border space-y-3">
            <div className="flex items-center gap-3">
              <img
                src={token.tokenLogoUrl || `https://ui-avatars.com/api/?name=${token.tokenSymbol}&background=random`}
                alt={token.tokenName}
                className="w-10 h-10 rounded-full shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${token.tokenSymbol}&background=random`;
                }}
              />
              <div className="min-w-0">
                <div className="font-semibold text-base sm:text-lg truncate">{token.tokenSymbol}</div>
                <div className="text-xs sm:text-sm text-muted-foreground truncate">{token.tokenName}</div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Network</span>
                <span className="font-medium truncate ml-2">{chain?.name || 'Unknown'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Decimals</span>
                <span className="font-mono">{token.decimals}</span>
              </div>
              <div className="space-y-1.5">
                <span className="text-muted-foreground">Contract Address</span>
                <div className="flex items-center gap-2 bg-background rounded p-2">
                  <code className="text-xs font-mono flex-1 break-all leading-relaxed">
                    {token.tokenContractAddress}
                  </code>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={handleCopy}
                      className="p-1.5 hover:bg-secondary rounded transition-colors"
                      title="Copy address"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-primary" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                    {explorerUrl && (
                      <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-secondary rounded transition-colors"
                        title="View on explorer"
                      >
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <div className="flex items-start gap-2.5">
              <Shield className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div className="text-sm space-y-1 min-w-0">
                <p className="font-medium text-warning">Trade at your own risk</p>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  Unverified tokens may be scams, have hidden fees, or may not be tradeable. 
                  Always verify the contract address on the blockchain explorer before trading.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              className="flex-1 h-10 sm:h-11"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              className="flex-1 h-10 sm:h-11 bg-warning text-warning-foreground hover:bg-warning/90 text-sm"
              onClick={onConfirm}
            >
              I Understand, Add Token
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
