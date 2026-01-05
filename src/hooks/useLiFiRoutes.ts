import { useState, useCallback, useEffect, useMemo } from 'react';
import { getRoutes, type Route, type RoutesRequest, type LiFiStep } from '@lifi/sdk';
import { apiCoordinator } from '@/lib/apiCoordinator';

export interface RouteOption {
  id: string;
  route: Route;
  bridgeName: string;
  bridgeLogo: string;
  toAmount: string;
  toAmountMin: string;
  toAmountUsd: string;
  estimatedGasCostUSD: string;
  estimatedTimeSeconds: number;
  totalFeesUSD: string;
  steps: Array<{
    type: string;
    tool: string;
    toolName: string;
    toolLogo: string;
    fromToken: string;
    toToken: string;
  }>;
  tags: {
    isBest: boolean;
    isFastest: boolean;
    isCheapest: boolean;
  };
}

interface UseLiFiRoutesOptions {
  fromChainId: number;
  toChainId: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  slippage?: number;
  enabled?: boolean;
}

interface UseLiFiRoutesReturn {
  routes: RouteOption[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  selectedRoute: RouteOption | null;
  selectRoute: (routeId: string) => void;
}

const PLATFORM_FEE = 0.015;

function parseSteps(route: Route): RouteOption['steps'] {
  return route.steps.map((step: LiFiStep) => ({
    type: step.type,
    tool: step.tool,
    toolName: step.toolDetails?.name || step.tool,
    toolLogo: step.toolDetails?.logoURI || '',
    fromToken: step.action.fromToken.symbol,
    toToken: step.action.toToken.symbol,
  }));
}

function calculateTotalGasCost(route: Route): string {
  let total = 0;
  route.steps.forEach((step: LiFiStep) => {
    step.estimate?.gasCosts?.forEach(cost => {
      total += parseFloat(cost.amountUSD || '0');
    });
  });
  return total.toFixed(2);
}

function calculateTotalFees(route: Route): string {
  let total = 0;
  route.steps.forEach((step: LiFiStep) => {
    step.estimate?.feeCosts?.forEach(cost => {
      total += parseFloat(cost.amountUSD || '0');
    });
    step.estimate?.gasCosts?.forEach(cost => {
      total += parseFloat(cost.amountUSD || '0');
    });
  });
  return total.toFixed(2);
}

export function useLiFiRoutes(options: UseLiFiRoutesOptions): UseLiFiRoutesReturn {
  const {
    fromChainId,
    toChainId,
    fromToken,
    toToken,
    fromAmount,
    fromAddress,
    slippage = 0.01,
    enabled = true,
  } = options;

  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoutes = useCallback(async () => {
    if (!enabled || !fromChainId || !toChainId || !fromToken || !toToken || !fromAmount || !fromAddress) {
      setRoutes([]);
      return;
    }

    const cacheKey = `lifi-routes-${fromChainId}-${toChainId}-${fromToken}-${toToken}-${fromAmount}`;
    
    // Check for throttling
    if (apiCoordinator.shouldThrottle(cacheKey)) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      apiCoordinator.recordRequest(cacheKey);

      const routesRequest: RoutesRequest = {
        fromChainId,
        toChainId,
        fromTokenAddress: fromToken,
        toTokenAddress: toToken,
        fromAmount,
        fromAddress,
        options: {
          slippage,
          order: 'RECOMMENDED',
          maxPriceImpact: 0.4,
          fee: PLATFORM_FEE,
        },
      };

      const result = await getRoutes(routesRequest);
      
      if (!result.routes || result.routes.length === 0) {
        setRoutes([]);
        setError('No routes found for this swap');
        return;
      }

      // Process routes and add tags
      const processedRoutes: RouteOption[] = result.routes.map((route, index) => {
        const firstStep = route.steps[0];
        return {
          id: route.id,
          route,
          bridgeName: firstStep?.toolDetails?.name || firstStep?.tool || 'Unknown',
          bridgeLogo: firstStep?.toolDetails?.logoURI || '',
          toAmount: route.toAmount,
          toAmountMin: route.toAmountMin,
          toAmountUsd: route.toAmountUSD || '0',
          estimatedGasCostUSD: calculateTotalGasCost(route),
          estimatedTimeSeconds: route.steps.reduce((acc, step) => acc + (step.estimate?.executionDuration || 0), 0),
          totalFeesUSD: calculateTotalFees(route),
          steps: parseSteps(route),
          tags: {
            isBest: index === 0, // First route is recommended (best)
            isFastest: false,
            isCheapest: false,
          },
        };
      });

      // Calculate fastest and cheapest
      if (processedRoutes.length > 1) {
        // Find fastest
        const minTime = Math.min(...processedRoutes.map(r => r.estimatedTimeSeconds));
        processedRoutes.forEach(r => {
          if (r.estimatedTimeSeconds === minTime && minTime > 0) {
            r.tags.isFastest = true;
          }
        });

        // Find cheapest (highest output amount)
        const maxOutput = Math.max(...processedRoutes.map(r => parseFloat(r.toAmount)));
        processedRoutes.forEach(r => {
          if (parseFloat(r.toAmount) === maxOutput) {
            r.tags.isCheapest = true;
          }
        });
      }

      setRoutes(processedRoutes);
      
      // Auto-select best route
      if (processedRoutes.length > 0 && !selectedRouteId) {
        setSelectedRouteId(processedRoutes[0].id);
      }
    } catch (err) {
      console.error('Li.Fi routes error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch routes');
      setRoutes([]);
    } finally {
      setIsLoading(false);
    }
  }, [fromChainId, toChainId, fromToken, toToken, fromAmount, fromAddress, slippage, enabled, selectedRouteId]);

  // Debounced fetch
  useEffect(() => {
    if (!enabled) return;
    
    const timeoutId = setTimeout(() => {
      fetchRoutes();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [fetchRoutes, enabled]);

  const selectRoute = useCallback((routeId: string) => {
    setSelectedRouteId(routeId);
  }, []);

  const selectedRoute = useMemo(() => {
    return routes.find(r => r.id === selectedRouteId) || routes[0] || null;
  }, [routes, selectedRouteId]);

  return {
    routes,
    isLoading,
    error,
    refetch: fetchRoutes,
    selectedRoute,
    selectRoute,
  };
}
