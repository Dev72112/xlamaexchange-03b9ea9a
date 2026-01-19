import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Layers, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { ZerionPosition } from '@/services/zerion';

interface ProtocolBreakdownProps {
  positions: ZerionPosition[];
  isLoading?: boolean;
}

interface ProtocolData {
  name: string;
  chain: string;
  totalValue: number;
  positionCount: number;
  pnl: number;
  pnlPercentage: number;
  icon?: string;
}

export const ProtocolBreakdown: React.FC<ProtocolBreakdownProps> = ({
  positions,
  isLoading = false,
}) => {
  const protocolData = useMemo(() => {
    const protocolMap = new Map<string, ProtocolData>();

    positions.forEach((position) => {
      const key = `${position.protocol}-${position.chainId}`;
      const existing = protocolMap.get(key);

      const value = position.value || 0;
      const pnl = position.absoluteChange1d || 0;

      if (existing) {
        existing.totalValue += value;
        existing.positionCount += 1;
        existing.pnl += pnl;
      } else {
        protocolMap.set(key, {
          name: position.protocol || 'Unknown',
          chain: position.chainName || position.chainId,
          totalValue: value,
          positionCount: 1,
          pnl,
          pnlPercentage: position.percentChange1d || 0,
          icon: position.protocolIcon || undefined,
        });
      }
    });

    return Array.from(protocolMap.values())
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);
  }, [positions]);

  const totalValue = useMemo(
    () => protocolData.reduce((sum, p) => sum + p.totalValue, 0),
    [protocolData]
  );

  if (isLoading) {
    return (
      <Card className="glass-ultra border-border/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Protocol Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (protocolData.length === 0) {
    return (
      <Card className="glass-ultra border-border/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Protocol Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Layers className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No DeFi positions found</p>
            <p className="text-xs mt-1">
              Connect your wallet and use DeFi protocols to see breakdown
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-ultra border-border/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Protocol Breakdown
          <Badge variant="secondary" className="ml-auto text-xs">
            {protocolData.length} protocols
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {protocolData.map((protocol, index) => {
          const percentage = totalValue > 0 ? (protocol.totalValue / totalValue) * 100 : 0;
          const isPositive = protocol.pnl >= 0;

          return (
            <div key={`${protocol.name}-${protocol.chain}-${index}`} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {protocol.icon ? (
                    <img
                      src={protocol.icon}
                      alt={protocol.name}
                      className="h-5 w-5 rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
                      <Layers className="h-3 w-3 text-primary" />
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-sm">{protocol.name}</span>
                    <Badge variant="outline" className="ml-2 text-[10px] py-0 capitalize">
                      {protocol.chain}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm">
                    ${protocol.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                  <div
                    className={`text-xs flex items-center gap-0.5 justify-end ${
                      isPositive ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {isPositive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {isPositive ? '+' : ''}
                    ${Math.abs(protocol.pnl).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Progress
                  value={percentage}
                  className="h-1.5 flex-1"
                />
                <span className="text-xs text-muted-foreground w-12 text-right">
                  {percentage.toFixed(1)}%
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {protocol.positionCount} position{protocol.positionCount !== 1 ? 's' : ''}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default ProtocolBreakdown;
