/**
 * AccountSummaryCard - OKX-style account summary
 * Prominent display of portfolio value, 24h change, chain, and address
 */

import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  TrendingDown, 
  Copy, 
  Check,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccountSummaryCardProps {
  totalValue: number;
  change24h?: number;
  changePercent24h?: number;
  chainName: string;
  chainIcon?: string;
  address: string;
  isLoading?: boolean;
  className?: string;
}

export const AccountSummaryCard = memo(function AccountSummaryCard({
  totalValue,
  change24h = 0,
  changePercent24h = 0,
  chainName,
  chainIcon,
  address,
  isLoading,
  className,
}: AccountSummaryCardProps) {
  const [copied, setCopied] = useState(false);
  const isPositive = change24h >= 0;

  const formatValue = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(2)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(2)}K`;
    return `$${val.toFixed(2)}`;
  };

  const formatChange = (val: number) => {
    const abs = Math.abs(val);
    if (abs >= 1000) return `$${(abs / 1000).toFixed(2)}K`;
    return `$${abs.toFixed(2)}`;
  };

  const truncateAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copyAddress = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <Card className={cn("glass glow-sm border-primary/10", className)}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-12 w-48 mb-3" />
          <Skeleton className="h-5 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "glass glow-sm border-primary/10 overflow-hidden relative",
      className
    )}>
      {/* Gradient top border */}
      <motion.div 
        className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-chart-2 to-primary"
        initial={{ scaleX: 0, originX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      />
      
      <CardContent className="p-6">
        {/* Top row: Chain badge + Address */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {chainIcon && (
              <img 
                src={chainIcon} 
                alt={chainName}
                className="w-5 h-5 rounded-full"
              />
            )}
            <Badge variant="secondary" className="text-xs font-medium">
              {chainName}
            </Badge>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={copyAddress}
            className="h-7 px-2 text-xs gap-1.5 font-mono text-muted-foreground hover:text-foreground"
          >
            {truncateAddress(address)}
            {copied ? (
              <Check className="w-3 h-3 text-success" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </Button>
        </div>

        {/* Main value with animation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-3"
        >
          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
            <Wallet className="w-3 h-3" />
            Total Portfolio Value
          </p>
          <p className="text-4xl sm:text-5xl font-bold tracking-tight">
            {formatValue(totalValue)}
          </p>
        </motion.div>

        {/* 24h Change */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={cn(
            "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg",
            isPositive ? "bg-success/10" : "bg-destructive/10"
          )}
        >
          {isPositive ? (
            <ArrowUpRight className="w-4 h-4 text-success" />
          ) : (
            <ArrowDownRight className="w-4 h-4 text-destructive" />
          )}
          <span className={cn(
            "text-sm font-medium",
            isPositive ? "text-success" : "text-destructive"
          )}>
            {isPositive ? '+' : '-'}{formatChange(change24h)}
          </span>
          <span className={cn(
            "text-sm",
            isPositive ? "text-success/80" : "text-destructive/80"
          )}>
            ({isPositive ? '+' : ''}{changePercent24h.toFixed(2)}%)
          </span>
          <span className="text-xs text-muted-foreground ml-1">24h</span>
        </motion.div>
      </CardContent>
    </Card>
  );
});

export default AccountSummaryCard;
