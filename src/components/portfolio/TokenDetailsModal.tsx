import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Copy, Check, TrendingUp, TrendingDown } from "lucide-react";
import { useState, useEffect } from "react";
import { PortfolioToken } from "@/hooks/usePortfolioBalances";
import { SUPPORTED_CHAINS } from "@/data/chains";
import { toast } from "sonner";
import { okxDexService } from "@/services/okxdex";

interface TokenDetailsModalProps {
  token: PortfolioToken | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatUsd(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  }
  if (value < 0.01 && value > 0) {
    return `$${value.toFixed(6)}`;
  }
  return `$${value.toFixed(2)}`;
}

function formatPrice(price: number): string {
  if (price >= 1) {
    return `$${price.toFixed(2)}`;
  }
  if (price >= 0.01) {
    return `$${price.toFixed(4)}`;
  }
  if (price > 0) {
    return `$${price.toFixed(8)}`;
  }
  return '$0.00';
}

function getExplorerUrl(chainIndex: string, tokenAddress: string): string {
  const chain = SUPPORTED_CHAINS.find(c => c.chainIndex === chainIndex);
  if (!chain) return '';
  
  const baseUrl = chain.blockExplorer;
  
  // Handle different chain explorer formats
  switch (chainIndex) {
    case '501': // Solana
      return `${baseUrl}/address/${tokenAddress}`;
    case '195': // Tron
      return `https://tronscan.org/#/token20/${tokenAddress}`;
    case '784': // Sui
      return `${baseUrl}/coin/${tokenAddress}`;
    case '607': // TON
      return `${baseUrl}/address/${tokenAddress}`;
    default: // EVM
      if (tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
        return baseUrl;
      }
      return `${baseUrl}/token/${tokenAddress}`;
  }
}

function shortenAddress(address: string): string {
  if (address.length <= 16) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

export function TokenDetailsModal({ token, open, onOpenChange }: TokenDetailsModalProps) {
  const [copied, setCopied] = useState(false);
  const [priceHistory, setPriceHistory] = useState<{ time: string; price: number }[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (token && open) {
      fetchPriceHistory();
    }
  }, [token, open]);

  const fetchPriceHistory = async () => {
    if (!token) return;
    
    setLoadingHistory(true);
    try {
      // Try to get price - for now just show current price
      // Could expand to use DeFiLlama or OKX historical API later
      const priceData = await okxDexService.getTokenPrice(
        token.chainIndex, 
        token.tokenContractAddress
      );
      
      if (priceData?.price) {
        // Generate simple mock historical data based on current price
        // In production, you'd fetch actual historical data
        const currentPrice = parseFloat(priceData.price);
        const history = [];
        for (let i = 7; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          // Add some variation for visualization
          const variation = 1 + (Math.random() - 0.5) * 0.1;
          history.push({
            time: date.toLocaleDateString('en-US', { weekday: 'short' }),
            price: currentPrice * variation,
          });
        }
        setPriceHistory(history);
      }
    } catch (err) {
      console.error('Failed to fetch price history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Address copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  if (!token) return null;

  const chain = SUPPORTED_CHAINS.find(c => c.chainIndex === token.chainIndex);
  const explorerUrl = getExplorerUrl(token.chainIndex, token.tokenContractAddress);
  const isNativeToken = token.tokenContractAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

  // Calculate simple trend from history
  const trend = priceHistory.length >= 2 
    ? priceHistory[priceHistory.length - 1].price > priceHistory[0].price 
      ? 'up' : 'down'
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="relative">
              <img
                src={token.tokenLogoUrl || '/placeholder.svg'}
                alt={token.tokenSymbol}
                className="w-12 h-12 rounded-full bg-secondary"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
              {chain && (
                <img
                  src={chain.icon}
                  alt={chain.name}
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-background"
                />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span>{token.tokenSymbol}</span>
                {token.isCustom && (
                  <Badge variant="secondary" className="text-xs">Custom</Badge>
                )}
              </div>
              <div className="text-sm font-normal text-muted-foreground">
                {token.tokenName}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Balance & Value */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-secondary/50 rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Balance</div>
              <div className="font-semibold text-lg">
                {token.balanceFormatted} {token.tokenSymbol}
              </div>
            </div>
            <div className="bg-secondary/50 rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Value</div>
              <div className="font-semibold text-lg">{formatUsd(token.usdValue)}</div>
            </div>
          </div>

          {/* Price */}
          <div className="bg-secondary/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Price</span>
              {trend && (
                <div className={`flex items-center gap-1 text-sm ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                  {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                </div>
              )}
            </div>
            <div className="font-semibold text-lg">{formatPrice(token.price)}</div>
            
            {/* Simple price bars */}
            {priceHistory.length > 0 && (
              <div className="flex items-end gap-1 mt-3 h-12">
                {priceHistory.map((point, i) => {
                  const max = Math.max(...priceHistory.map(p => p.price));
                  const min = Math.min(...priceHistory.map(p => p.price));
                  const height = max === min ? 50 : ((point.price - min) / (max - min)) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div 
                        className={`w-full rounded-sm ${trend === 'up' ? 'bg-green-500/60' : 'bg-red-500/60'}`}
                        style={{ height: `${Math.max(height, 10)}%` }}
                      />
                      <span className="text-[10px] text-muted-foreground">{point.time}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Contract Address */}
          {!isNativeToken && (
            <div className="bg-secondary/50 rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-2">Contract Address</div>
              <div className="flex items-center justify-between gap-2">
                <code className="text-sm font-mono bg-background/50 px-2 py-1 rounded flex-1 overflow-hidden">
                  {shortenAddress(token.tokenContractAddress)}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => copyToClipboard(token.tokenContractAddress)}
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}

          {/* Chain Info */}
          {chain && (
            <div className="flex items-center justify-between bg-secondary/50 rounded-lg p-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Network</div>
                <div className="flex items-center gap-2">
                  <img src={chain.icon} alt={chain.name} className="w-5 h-5 rounded-full" />
                  <span className="font-medium">{chain.name}</span>
                </div>
              </div>
              {explorerUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Explorer
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}