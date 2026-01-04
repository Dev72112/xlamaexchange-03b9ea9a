import { useState } from 'react';
import { Bell, TrendingUp, TrendingDown, Trash2, Plus, Minus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useDexPriceAlerts, DexPriceAlert } from '@/hooks/useDexPriceAlerts';

interface PriceAlertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: {
    chainIndex: string;
    tokenContractAddress: string;
    tokenSymbol: string;
    tokenLogoUrl: string;
    currentPrice?: number;
  };
}

export function PriceAlertModal({ open, onOpenChange, token }: PriceAlertModalProps) {
  const { createAlert, deleteAlert, getAlertsForToken } = useDexPriceAlerts();
  const [targetPrice, setTargetPrice] = useState<string>(token.currentPrice?.toString() || '');
  const [condition, setCondition] = useState<'above' | 'below'>('above');

  const tokenAlerts = getAlertsForToken(token.chainIndex, token.tokenContractAddress);
  const currentPrice = token.currentPrice || 0;

  const handleCreateAlert = () => {
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) return;

    createAlert(token, price, condition);
    setTargetPrice(currentPrice.toString());
  };

  const adjustPrice = (percent: number) => {
    const current = parseFloat(targetPrice) || currentPrice;
    const adjusted = current * (1 + percent / 100);
    setTargetPrice(adjusted.toFixed(6));
  };

  const formatPrice = (price: number) => {
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.0001) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Price Alert for {token.tokenSymbol}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Token Info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
            <img
              src={token.tokenLogoUrl}
              alt={token.tokenSymbol}
              className="w-10 h-10 rounded-full"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${token.tokenSymbol}&background=random`;
              }}
            />
            <div>
              <div className="font-semibold">{token.tokenSymbol}</div>
              <div className="text-sm text-muted-foreground">
                Current: {formatPrice(currentPrice)}
              </div>
            </div>
          </div>

          {/* Condition Toggle */}
          <div className="flex gap-2">
            <Button
              variant={condition === 'above' ? 'default' : 'outline'}
              className={cn("flex-1", condition === 'above' && "bg-success hover:bg-success/90")}
              onClick={() => setCondition('above')}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Above
            </Button>
            <Button
              variant={condition === 'below' ? 'default' : 'outline'}
              className={cn("flex-1", condition === 'below' && "bg-destructive hover:bg-destructive/90")}
              onClick={() => setCondition('below')}
            >
              <TrendingDown className="w-4 h-4 mr-2" />
              Below
            </Button>
          </div>

          {/* Target Price Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Target Price (USD)</label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="any"
                placeholder="Enter target price"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={() => adjustPrice(-10)}>
                <Minus className="w-3 h-3 mr-1" /> 10%
              </Button>
              <Button variant="outline" size="sm" onClick={() => adjustPrice(-5)}>
                <Minus className="w-3 h-3 mr-1" /> 5%
              </Button>
              <Button variant="outline" size="sm" onClick={() => adjustPrice(5)}>
                <Plus className="w-3 h-3 mr-1" /> 5%
              </Button>
              <Button variant="outline" size="sm" onClick={() => adjustPrice(10)}>
                <Plus className="w-3 h-3 mr-1" /> 10%
              </Button>
            </div>
          </div>

          {/* Create Button */}
          <Button 
            onClick={handleCreateAlert} 
            className="w-full"
            disabled={!targetPrice || parseFloat(targetPrice) <= 0}
          >
            <Bell className="w-4 h-4 mr-2" />
            Create Alert
          </Button>

          {/* Existing Alerts */}
          {tokenAlerts.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium flex items-center justify-between">
                <span>Active Alerts</span>
                <Badge variant="secondary">{tokenAlerts.length}</Badge>
              </div>
              <ScrollArea className="h-[150px]">
                <div className="space-y-2">
                  {tokenAlerts.map((alert) => (
                    <AlertItem key={alert.id} alert={alert} onDelete={deleteAlert} />
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AlertItem({ alert, onDelete }: { alert: DexPriceAlert; onDelete: (id: string) => void }) {
  return (
    <div className={cn(
      "flex items-center justify-between p-2 rounded-lg",
      alert.triggered ? "bg-success/10" : "bg-secondary/30"
    )}>
      <div className="flex items-center gap-2">
        {alert.condition === 'above' ? (
          <TrendingUp className="w-4 h-4 text-success" />
        ) : (
          <TrendingDown className="w-4 h-4 text-destructive" />
        )}
        <div>
          <div className="text-sm font-mono">
            {alert.condition === 'above' ? '≥' : '≤'} ${alert.targetPrice.toFixed(4)}
          </div>
          {alert.triggered && (
            <div className="text-xs text-success">Triggered!</div>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-destructive hover:text-destructive"
        onClick={() => onDelete(alert.id)}
      >
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );
}

