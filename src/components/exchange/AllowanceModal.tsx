import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { OkxToken } from "@/services/okxdex";
import { AlertTriangle, Shield, Infinity, Edit3 } from "lucide-react";

export type AllowanceType = 'exact' | 'unlimited' | 'custom';

interface AllowanceModalProps {
  token: OkxToken;
  requiredAmount: string;
  onConfirm: (amount: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

// Max uint256 for unlimited approval
const MAX_UINT256 = '115792089237316195423570985008687907853269984665640564039457584007913129639935';

export function AllowanceModal({
  token,
  requiredAmount,
  onConfirm,
  onCancel,
  isLoading,
}: AllowanceModalProps) {
  const [allowanceType, setAllowanceType] = useState<AllowanceType>('unlimited');
  const [customAmount, setCustomAmount] = useState(requiredAmount);

  const handleConfirm = () => {
    let amount: string;
    switch (allowanceType) {
      case 'exact':
        amount = requiredAmount;
        break;
      case 'unlimited':
        amount = MAX_UINT256;
        break;
      case 'custom':
        // Convert custom amount to smallest unit
        const decimals = parseInt(token.decimals);
        amount = toSmallestUnit(customAmount, decimals);
        break;
      default:
        amount = requiredAmount;
    }
    onConfirm(amount);
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Token Approval</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Allow the DEX to spend your {token.tokenSymbol}
        </p>
      </div>

      <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
        <img
          src={token.tokenLogoUrl || `https://ui-avatars.com/api/?name=${token.tokenSymbol}&background=random`}
          alt={token.tokenSymbol}
          className="w-8 h-8 rounded-full"
        />
        <div>
          <div className="font-medium">{token.tokenSymbol}</div>
          <div className="text-xs text-muted-foreground">{token.tokenName}</div>
        </div>
      </div>

      <RadioGroup
        value={allowanceType}
        onValueChange={(v) => setAllowanceType(v as AllowanceType)}
        className="space-y-2"
      >
        <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-secondary/30 cursor-pointer">
          <RadioGroupItem value="unlimited" id="unlimited" />
          <Label htmlFor="unlimited" className="flex-1 cursor-pointer">
            <div className="flex items-center gap-2">
              <Infinity className="w-4 h-4 text-primary" />
              <span>Unlimited</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Approve once, never prompt again for this token
            </p>
          </Label>
        </div>

        <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-secondary/30 cursor-pointer">
          <RadioGroupItem value="exact" id="exact" />
          <Label htmlFor="exact" className="flex-1 cursor-pointer">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-500" />
              <span>Exact Amount</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Approve only {requiredAmount} {token.tokenSymbol} (more secure)
            </p>
          </Label>
        </div>

        <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-secondary/30 cursor-pointer">
          <RadioGroupItem value="custom" id="custom" />
          <Label htmlFor="custom" className="flex-1 cursor-pointer">
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-blue-500" />
              <span>Custom Amount</span>
            </div>
          </Label>
        </div>

        {allowanceType === 'custom' && (
          <div className="pl-8">
            <Input
              type="number"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="Enter amount"
              className="mt-2"
            />
          </div>
        )}
      </RadioGroup>

      <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-lg text-sm">
        <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
        <p className="text-warning text-xs">
          This approval lets the DEX contract spend your tokens. Only approve on trusted sites.
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={isLoading || (allowanceType === 'custom' && !customAmount)}
          className="flex-1"
        >
          {isLoading ? "Approving..." : "Approve"}
        </Button>
      </div>
    </div>
  );
}

// Convert amount to smallest unit without scientific notation
function toSmallestUnit(amount: string, decimals: number): string {
  if (!amount || isNaN(parseFloat(amount))) return '0';
  
  const [whole, fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  const combined = whole + paddedFraction;
  
  // Remove leading zeros but keep at least "0"
  return combined.replace(/^0+/, '') || '0';
}
