/**
 * DeFi Positions Component
 * Displays DeFi positions grouped by protocol (LP, staking, lending, etc.)
 */

import React, { memo, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  Wallet, 
  Lock, 
  Coins, 
  ArrowDownCircle,
  Gift,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Define Position type locally (no longer depends on Zerion)
export interface DeFiPosition {
  id: string;
  protocol: string;
  protocolIcon?: string | null;
  positionType: 'wallet' | 'deposited' | 'staked' | 'locked' | 'borrowed' | 'claimable';
  name: string;
  value: number;
  quantity: number;
  price: number;
  absoluteChange1d: number;
  percentChange1d: number;
  chainId: string;
  chainName: string;
  tokenAddress: string;
  tokenSymbol: string;
  tokenIcon?: string | null;
}

interface DeFiPositionsProps {
  positions: DeFiPosition[];
  isLoading?: boolean;
  className?: string;
}

// Position type icons and colors
const positionTypeConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  wallet: { icon: <Wallet className="h-3.5 w-3.5" />, label: 'Wallet', color: 'bg-blue-500/10 text-blue-500' },
  deposited: { icon: <Coins className="h-3.5 w-3.5" />, label: 'Deposited', color: 'bg-green-500/10 text-green-500' },
  staked: { icon: <Lock className="h-3.5 w-3.5" />, label: 'Staked', color: 'bg-purple-500/10 text-purple-500' },
  locked: { icon: <Lock className="h-3.5 w-3.5" />, label: 'Locked', color: 'bg-orange-500/10 text-orange-500' },
  borrowed: { icon: <ArrowDownCircle className="h-3.5 w-3.5" />, label: 'Borrowed', color: 'bg-red-500/10 text-red-500' },
  claimable: { icon: <Gift className="h-3.5 w-3.5" />, label: 'Claimable', color: 'bg-yellow-500/10 text-yellow-500' },
};

interface ProtocolGroup {
  protocol: string;
  protocolIcon: string | null;
  positions: DeFiPosition[];
  totalValue: number;
  totalChange: number;
}

export const DeFiPositions = memo(function DeFiPositions({ 
  positions, 
  isLoading,
  className 
}: DeFiPositionsProps) {
  const [expandedProtocols, setExpandedProtocols] = useState<Set<string>>(new Set());

  // Group positions by protocol
  const protocolGroups = useMemo(() => {
    const groups = new Map<string, ProtocolGroup>();
    
    for (const position of positions) {
      const key = position.protocol;
      const existing = groups.get(key);
      
      if (existing) {
        existing.positions.push(position);
        existing.totalValue += position.value;
        existing.totalChange += position.absoluteChange1d;
      } else {
        groups.set(key, {
          protocol: position.protocol,
          protocolIcon: position.protocolIcon,
          positions: [position],
          totalValue: position.value,
          totalChange: position.absoluteChange1d,
        });
      }
    }
    
    // Sort by total value descending
    return Array.from(groups.values()).sort((a, b) => b.totalValue - a.totalValue);
  }, [positions]);

  const toggleProtocol = (protocol: string) => {
    setExpandedProtocols(prev => {
      const next = new Set(prev);
      if (next.has(protocol)) {
        next.delete(protocol);
      } else {
        next.add(protocol);
      }
      return next;
    });
  };

  const formatValue = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatChange = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    if (Math.abs(value) >= 1000) return `${sign}$${(value / 1000).toFixed(2)}K`;
    return `${sign}$${value.toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <Card className={cn("glass-card", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            DeFi Positions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (positions.length === 0) {
    return (
      <Card className={cn("glass-card", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            DeFi Positions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No DeFi positions found</p>
            <p className="text-sm mt-1">Deposit into protocols to see your positions here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("glass-card", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          DeFi Positions
          <Badge variant="secondary" className="ml-auto">
            {positions.length} positions
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {protocolGroups.map(group => {
          const isExpanded = expandedProtocols.has(group.protocol);
          
          return (
            <div key={group.protocol} className="rounded-lg border border-border/50 overflow-hidden">
              {/* Protocol Header */}
              <Button
                variant="ghost"
                className="w-full justify-between p-3 h-auto hover:bg-muted/50"
                onClick={() => toggleProtocol(group.protocol)}
              >
                <div className="flex items-center gap-3">
                  {group.protocolIcon ? (
                    <img 
                      src={group.protocolIcon} 
                      alt={group.protocol}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <Layers className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className="text-left">
                    <div className="font-medium">{group.protocol}</div>
                    <div className="text-xs text-muted-foreground">
                      {group.positions.length} position{group.positions.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-semibold">{formatValue(group.totalValue)}</div>
                    <div className={cn(
                      "text-xs flex items-center justify-end gap-1",
                      group.totalChange >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {group.totalChange >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {formatChange(group.totalChange)}
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </Button>

              {/* Expanded Positions */}
              {isExpanded && (
                <div className="border-t border-border/50 bg-muted/20">
                  {group.positions.map(position => {
                    const typeConfig = positionTypeConfig[position.positionType] || positionTypeConfig.wallet;
                    
                    return (
                      <div 
                        key={position.id}
                        className="flex items-center justify-between p-3 border-b border-border/30 last:border-b-0"
                      >
                        <div className="flex items-center gap-3">
                          {position.tokenIcon ? (
                            <img 
                              src={position.tokenIcon} 
                              alt={position.tokenSymbol}
                              className="h-8 w-8 rounded-full"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                              {position.tokenSymbol.slice(0, 2)}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-sm">{position.tokenSymbol}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge className={cn("text-[10px] px-1.5 py-0", typeConfig.color)}>
                                {typeConfig.icon}
                                <span className="ml-1">{typeConfig.label}</span>
                              </Badge>
                              <span>{position.chainName}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-sm">{formatValue(position.value)}</div>
                          <div className="text-xs text-muted-foreground">
                            {position.quantity.toFixed(4)} {position.tokenSymbol}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
});
