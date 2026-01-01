import { AlertTriangle, ExternalLink, Shield } from "lucide-react";
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
  if (!token) return null;

  const explorerUrl = chain?.blockExplorer 
    ? `${chain.blockExplorer}/address/${token.tokenContractAddress}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="w-5 h-5" />
            Add Custom Token
          </DialogTitle>
          <DialogDescription>
            This token is not on our verified list. Please verify the contract address before trading.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Token Info */}
          <div className="p-4 bg-secondary/50 rounded-lg border border-border space-y-3">
            <div className="flex items-center gap-3">
              <img
                src={token.tokenLogoUrl || `https://ui-avatars.com/api/?name=${token.tokenSymbol}&background=random`}
                alt={token.tokenName}
                className="w-10 h-10 rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${token.tokenSymbol}&background=random`;
                }}
              />
              <div>
                <div className="font-semibold text-lg">{token.tokenSymbol}</div>
                <div className="text-sm text-muted-foreground">{token.tokenName}</div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Network</span>
                <span className="font-medium">{chain?.name || 'Unknown'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Decimals</span>
                <span className="font-mono">{token.decimals}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Contract Address</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-background px-2 py-1 rounded font-mono flex-1 truncate">
                    {token.tokenContractAddress}
                  </code>
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

          {/* Warning */}
          <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <div className="flex items-start gap-2.5">
              <Shield className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div className="text-sm space-y-1">
                <p className="font-medium text-warning">Trade at your own risk</p>
                <p className="text-muted-foreground">
                  Unverified tokens may be scams, have hidden fees, or may not be tradeable. 
                  Always verify the contract address on the blockchain explorer before trading.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              className="flex-1 bg-warning text-warning-foreground hover:bg-warning/90"
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
