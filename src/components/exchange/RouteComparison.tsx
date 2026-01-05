import { memo, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Zap, 
  Award, 
  ArrowRight,
  Check,
  Loader2,
  Route as RouteIcon,
  TrendingUp,
  Coins,
  Sparkles,
  DollarSign
} from "lucide-react";
import { RouteOption, RoutePreference } from "@/hooks/useLiFiRoutes";
import { cn } from "@/lib/utils";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";

interface RouteComparisonProps {
  routes: RouteOption[];
  selectedRoute: RouteOption | null;
  onSelectRoute: (routeId: string) => void;
  isLoading?: boolean;
  toTokenSymbol: string;
  toTokenDecimals: number;
  routePreference?: RoutePreference;
  onRoutePreferenceChange?: (pref: RoutePreference) => void;
}

function formatAmount(amount: string, decimals: number): string {
  const value = parseFloat(amount) / Math.pow(10, decimals);
  if (value >= 1000) return value.toFixed(2);
  if (value >= 1) return value.toFixed(4);
  return value.toFixed(6);
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `~${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `~${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `~${hours}h ${remainingMinutes}m`;
}

// Calculate savings compared to worst route
function calculateSavings(route: RouteOption, allRoutes: RouteOption[], toTokenDecimals: number): {
  gasSavings: string | null;
  outputGain: string | null;
  outputGainPercent: string | null;
} {
  if (allRoutes.length < 2) return { gasSavings: null, outputGain: null, outputGainPercent: null };

  // Find highest gas cost (worst)
  const maxGas = Math.max(...allRoutes.map(r => parseFloat(r.totalFeesUSD)));
  const currentGas = parseFloat(route.totalFeesUSD);
  const gasSavings = maxGas > currentGas ? (maxGas - currentGas).toFixed(2) : null;

  // Find lowest output (worst)
  const minOutput = Math.min(...allRoutes.map(r => parseFloat(r.toAmount)));
  const currentOutput = parseFloat(route.toAmount);
  const outputDiff = currentOutput - minOutput;
  const outputGain = outputDiff > 0 
    ? (outputDiff / Math.pow(10, toTokenDecimals)).toFixed(4)
    : null;
  const outputGainPercent = minOutput > 0 && outputDiff > 0
    ? ((outputDiff / minOutput) * 100).toFixed(2)
    : null;

  return { gasSavings, outputGain, outputGainPercent };
}

const RouteCard = memo(function RouteCard({
  route,
  isSelected,
  onSelect,
  toTokenSymbol,
  toTokenDecimals,
  allRoutes,
}: {
  route: RouteOption;
  isSelected: boolean;
  onSelect: () => void;
  toTokenSymbol: string;
  toTokenDecimals: number;
  allRoutes: RouteOption[];
}) {
  const [showSteps, setShowSteps] = useState(false);
  const savings = useMemo(() => calculateSavings(route, allRoutes, toTokenDecimals), [route, allRoutes, toTokenDecimals]);

  return (
    <div
      className={cn(
        "relative p-4 rounded-xl border-2 transition-all cursor-pointer hover:border-primary/50",
        isSelected 
          ? "border-primary bg-primary/5" 
          : "border-border bg-card/50 hover:bg-card"
      )}
      onClick={onSelect}
    >
      {/* Tags */}
      <div className="absolute -top-2 left-3 flex gap-1">
        {route.tags.isBest && (
          <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
            <Award className="w-3 h-3 mr-0.5" />
            Best
          </Badge>
        )}
        {route.tags.isFastest && !route.tags.isBest && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            <Zap className="w-3 h-3 mr-0.5" />
            Fastest
          </Badge>
        )}
        {route.tags.isCheapest && !route.tags.isBest && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            <Check className="w-3 h-3 mr-0.5" />
            Best Rate
          </Badge>
        )}
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-3 h-3 text-primary-foreground" />
        </div>
      )}

      {/* Main content */}
      <div className="flex items-center justify-between gap-4 mt-2">
        {/* Bridge info */}
        <div className="flex items-center gap-2">
          {route.bridgeLogo && (
            <img 
              src={route.bridgeLogo} 
              alt={route.bridgeName} 
              className="w-8 h-8 rounded-lg"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <div>
            <p className="font-medium text-sm">{route.bridgeName}</p>
            <p className="text-xs text-muted-foreground">
              via {route.steps.length} step{route.steps.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Output amount */}
        <div className="text-right">
          <p className="font-bold text-lg">
            {formatAmount(route.toAmount, toTokenDecimals)} {toTokenSymbol}
          </p>
          {parseFloat(route.toAmountUsd) > 0 && (
            <p className="text-xs text-muted-foreground">
              ≈ ${parseFloat(route.toAmountUsd).toFixed(2)}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{formatTime(route.estimatedTimeSeconds)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>Gas: ${route.estimatedGasCostUSD}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>Fees: ${route.totalFeesUSD}</span>
        </div>
      </div>

      {/* Savings indicators */}
      {(savings.gasSavings || savings.outputGain) && (
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {savings.gasSavings && parseFloat(savings.gasSavings) > 0.01 && (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-green-600 border-green-600/30 bg-green-500/5">
              <Coins className="w-3 h-3 mr-0.5" />
              Save ${savings.gasSavings} fees
            </Badge>
          )}
          {savings.outputGain && savings.outputGainPercent && parseFloat(savings.outputGainPercent) > 0.1 && (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-primary border-primary/30 bg-primary/5">
              <TrendingUp className="w-3 h-3 mr-0.5" />
              +{savings.outputGainPercent}% output
            </Badge>
          )}
        </div>
      )}

      {/* Route steps (expandable) */}
      {route.steps.length > 1 && (
        <div className="mt-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              setShowSteps(!showSteps);
            }}
          >
            {showSteps ? (
              <>
                <ChevronUp className="w-3 h-3 mr-1" />
                Hide route
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 mr-1" />
                View route
              </>
            )}
          </Button>

          {showSteps && (
            <div className="mt-2 flex flex-wrap items-center gap-1 text-xs">
              {route.steps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <span className="text-muted-foreground">{step.fromToken}</span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <Badge variant="outline" className="text-[10px] py-0 px-1">
                    {step.toolName}
                  </Badge>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{step.toToken}</span>
                  {idx < route.steps.length - 1 && (
                    <span className="text-muted-foreground mx-1">→</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export const RouteComparison = memo(function RouteComparison({
  routes,
  selectedRoute,
  onSelectRoute,
  isLoading,
  toTokenSymbol,
  toTokenDecimals,
  routePreference = 'best',
  onRoutePreferenceChange,
}: RouteComparisonProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate savings vs default (first/best) route
  const savingsSummary = useMemo(() => {
    if (!selectedRoute || routes.length < 2) return null;
    
    const defaultRoute = routes[0];
    if (selectedRoute.id === defaultRoute.id) return null;
    
    const outputDiff = parseFloat(selectedRoute.toAmount) - parseFloat(defaultRoute.toAmount);
    const outputDiffFormatted = outputDiff / Math.pow(10, toTokenDecimals);
    const feesDiff = parseFloat(defaultRoute.totalFeesUSD) - parseFloat(selectedRoute.totalFeesUSD);
    const timeDiff = defaultRoute.estimatedTimeSeconds - selectedRoute.estimatedTimeSeconds;
    
    // Only show if there are meaningful savings
    const hasOutputSavings = outputDiffFormatted > 0.0001;
    const hasFeeSavings = feesDiff > 0.01;
    const hasFaster = timeDiff > 30;
    
    if (!hasOutputSavings && !hasFeeSavings && !hasFaster) return null;
    
    return {
      outputDiff: hasOutputSavings ? outputDiffFormatted : null,
      outputDiffPercent: hasOutputSavings ? ((outputDiff / parseFloat(defaultRoute.toAmount)) * 100).toFixed(2) : null,
      feesSaved: hasFeeSavings ? feesDiff.toFixed(2) : null,
      timeSaved: hasFaster ? Math.floor(timeDiff / 60) : null,
    };
  }, [selectedRoute, routes, toTokenDecimals]);

  if (routes.length === 0 && !isLoading) {
    return null;
  }

  return (
    <Card className="bg-card/50 border-border overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <RouteIcon className="w-4 h-4 text-primary" />
            Route Options
            {routes.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {routes.length} found
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {routes.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs h-7"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-3 h-3 mr-1" />
                    Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3 mr-1" />
                    All ({routes.length})
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
        
        {/* Route Preference Toggle */}
        {onRoutePreferenceChange && routes.length > 1 && (
          <ToggleGroup 
            type="single" 
            value={routePreference}
            onValueChange={(value) => value && onRoutePreferenceChange(value as RoutePreference)}
            className="justify-start mt-2"
          >
            <ToggleGroupItem value="best" size="sm" className="text-xs h-7 px-2.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              <Award className="w-3 h-3 mr-1" />
              Best
            </ToggleGroupItem>
            <ToggleGroupItem value="fastest" size="sm" className="text-xs h-7 px-2.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              <Zap className="w-3 h-3 mr-1" />
              Fastest
            </ToggleGroupItem>
            <ToggleGroupItem value="cheapest" size="sm" className="text-xs h-7 px-2.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              <DollarSign className="w-3 h-3 mr-1" />
              Best Rate
            </ToggleGroupItem>
          </ToggleGroup>
        )}
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Savings Summary Panel */}
        {savingsSummary && selectedRoute && (
          <div className="p-3 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Your Selected Route Saves</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {savingsSummary.outputDiff && (
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">
                    +{savingsSummary.outputDiff.toFixed(4)} {toTokenSymbol}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({savingsSummary.outputDiffPercent}% more)
                  </span>
                </div>
              )}
              {savingsSummary.feesSaved && (
                <div className="flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">
                    ${savingsSummary.feesSaved} saved
                  </span>
                  <span className="text-xs text-muted-foreground">on fees</span>
                </div>
              )}
              {savingsSummary.timeSaved && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold text-primary">
                    {savingsSummary.timeSaved}m faster
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Finding best routes...</span>
          </div>
        ) : (
          <>
            {(isExpanded ? routes : routes.slice(0, 3)).map(route => (
              <RouteCard
                key={route.id}
                route={route}
                isSelected={selectedRoute?.id === route.id}
                onSelect={() => onSelectRoute(route.id)}
                toTokenSymbol={toTokenSymbol}
                toTokenDecimals={toTokenDecimals}
                allRoutes={routes}
              />
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
});
