import { useEffect, useState } from 'react';
import { Scale, RefreshCw, ArrowRight, Percent, Zap, RotateCcw, ChevronDown, Loader2, Download, Clock, Play, Pause, X, ExternalLink, Calendar, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { usePortfolioRebalance, TokenAllocation, RebalanceTrade } from '@/hooks/usePortfolioRebalance';
import { useRebalanceSchedule, RebalanceSchedule } from '@/hooks/useRebalanceSchedule';
import { useTradePreFill } from '@/contexts/TradePreFillContext';
import { SUPPORTED_CHAINS } from '@/data/chains';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { exportTradesToCSV, exportTradesToJSON, generateShareableLink } from '@/lib/tradeExport';

interface PortfolioRebalancerProps {
  className?: string;
  standalone?: boolean;
}

export function PortfolioRebalancer({ className, standalone = false }: PortfolioRebalancerProps) {
  const {
    isConnected,
    isLoading,
    balances,
    targetAllocations,
    rebalanceResult,
    fetchCurrentPortfolio,
    setTargetAllocation,
    calculateRebalance,
    applyEqualWeight,
    applyMarketCapWeight,
    resetTargets,
  } = usePortfolioRebalance();

  const {
    schedules,
    fetchSchedules,
    createSchedule,
    pauseSchedule,
    resumeSchedule,
    cancelSchedule,
    isLoading: schedulesLoading,
  } = useRebalanceSchedule();

  const { setPreFill } = useTradePreFill();

  const [showTrades, setShowTrades] = useState(false);
  const [showSchedules, setShowSchedules] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  
  // Schedule form state
  const [scheduleName, setScheduleName] = useState('My Rebalance');
  const [scheduleFrequency, setScheduleFrequency] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [scheduleThreshold, setScheduleThreshold] = useState(5);

  // Common stablecoins for preset strategies
  const STABLECOINS = ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'FRAX', 'USDP'];

  // Apply preset allocation strategies
  const applyPreset = (preset: 'stablecoin-heavy' | '60-40' | 'btc-eth-focused') => {
    const stables = balances.filter(b => STABLECOINS.includes(b.symbol.toUpperCase()));
    const volatiles = balances.filter(b => !STABLECOINS.includes(b.symbol.toUpperCase()));
    
    if (preset === 'stablecoin-heavy') {
      // 60% stablecoins, 40% volatile (distributed proportionally)
      const stableAlloc = stables.length > 0 ? 60 / stables.length : 0;
      const volatileAlloc = volatiles.length > 0 ? 40 / volatiles.length : 0;
      
      balances.forEach(b => {
        const key = `${b.chainIndex}-${b.tokenContractAddress}`;
        const isStable = STABLECOINS.includes(b.symbol.toUpperCase());
        setTargetAllocation(key, isStable ? stableAlloc : volatileAlloc);
      });
      toast.success('Applied 60% stablecoin strategy');
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchCurrentPortfolio();
      fetchSchedules();
    }
  }, [isConnected, fetchCurrentPortfolio, fetchSchedules]);

  const handleCalculate = () => {
    setIsCalculating(true);
    const result = calculateRebalance();
    setIsCalculating(false);
    if (result) {
      setShowTrades(true);
      toast.success('Rebalance plan calculated');
    }
  };

  const handleCreateSchedule = async () => {
    if (Object.keys(targetAllocations).length === 0) {
      toast.error('Set target allocations first');
      return;
    }

    const chains = [...new Set(balances.map(b => b.chainIndex))].join(',');
    
    await createSchedule({
      name: scheduleName,
      targetAllocations,
      frequency: scheduleFrequency,
      thresholdPercent: scheduleThreshold,
      chains,
    });

    setScheduleDialogOpen(false);
  };

  const handleExecuteTrade = (trade: RebalanceTrade) => {
    setPreFill({
      fromTokenAddress: trade.fromToken.address,
      fromTokenSymbol: trade.fromToken.symbol,
      toTokenAddress: trade.toToken.address,
      toTokenSymbol: trade.toToken.symbol,
      chainIndex: trade.fromToken.chainIndex,
      fromRebalance: true,
    });
    toast.success('Trade loaded in swap widget');
  };

  const handleExport = (format: 'csv' | 'json' | 'link') => {
    if (!rebalanceResult?.trades.length) {
      toast.error('No trades to export');
      return;
    }

    switch (format) {
      case 'csv':
        exportTradesToCSV(rebalanceResult.trades);
        toast.success('CSV downloaded');
        break;
      case 'json':
        exportTradesToJSON(rebalanceResult.trades);
        toast.success('JSON downloaded');
        break;
      case 'link':
        const link = generateShareableLink(rebalanceResult.trades);
        navigator.clipboard.writeText(link);
        toast.success('Shareable link copied to clipboard');
        break;
    }
  };

  const formatUsd = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const getChainIcon = (chainIndex: string) => {
    const chain = SUPPORTED_CHAINS.find(c => c.chainIndex === chainIndex);
    return chain?.icon;
  };

  const formatNextExecution = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays}d`;
    if (diffHours > 0) return `${diffHours}h`;
    return 'Soon';
  };

  const totalTargetPercentage = Object.values(targetAllocations).reduce((sum, p) => sum + p, 0);
  const isValidAllocation = Math.abs(totalTargetPercentage - 100) < 0.1 || Object.keys(targetAllocations).length === 0;

  if (!isConnected) {
    const disconnectedContent = (
      <div className="py-8 text-center">
        <Scale className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Connect wallet to rebalance portfolio</p>
      </div>
    );
    if (standalone) return disconnectedContent;
    return (
      <Card className={cn("bg-card border-border", className)}>
        <CardContent className="py-8 text-center">
          <Scale className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Connect wallet to rebalance portfolio</p>
        </CardContent>
      </Card>
    );
  }

  const rebalancerContent = (
    <div className="space-y-4">
      {/* Strategy Presets */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Quick Presets</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Button variant="outline" size="sm" onClick={applyEqualWeight} disabled={balances.length === 0} className="text-xs min-h-[44px] flex-col gap-0.5 h-auto py-2"><Percent className="w-3.5 h-3.5" /><span>Equal</span></Button>
          <Button variant="outline" size="sm" onClick={applyMarketCapWeight} disabled={balances.length === 0} className="text-xs min-h-[44px] flex-col gap-0.5 h-auto py-2"><Scale className="w-3.5 h-3.5" /><span>Current</span></Button>
          <Button variant="outline" size="sm" onClick={() => applyPreset('stablecoin-heavy')} disabled={balances.length === 0} className="text-xs min-h-[44px] flex-col gap-0.5 h-auto py-2"><Shield className="w-3.5 h-3.5" /><span>60% Stable</span></Button>
          <Button variant="outline" size="sm" onClick={resetTargets} disabled={Object.keys(targetAllocations).length === 0} className="text-xs min-h-[44px] flex-col gap-0.5 h-auto py-2"><RotateCcw className="w-3.5 h-3.5" /><span>Reset</span></Button>
        </div>
      </div>

      {/* Allocation Sliders */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-secondary/30 animate-pulse" />)}
        </div>
      ) : balances.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-muted-foreground">No assets found in portfolio</p>
        </div>
      ) : (
        <ScrollArea className="h-[220px] pr-2">
          <div className="space-y-3">
            {balances.slice(0, 10).map((balance) => {
              const tokenKey = `${balance.chainIndex}-${balance.tokenContractAddress}`;
              const currentValue = parseFloat(balance.tokenPrice || '0') * parseFloat(balance.balance || '0');
              const totalValue = balances.reduce((sum, b) => sum + parseFloat(b.tokenPrice || '0') * parseFloat(b.balance || '0'), 0);
              const currentPercentage = totalValue > 0 ? (currentValue / totalValue) * 100 : 0;
              const targetPercentage = targetAllocations[tokenKey] ?? currentPercentage;
              const difference = targetPercentage - currentPercentage;
              return (
                <div key={tokenKey} className="p-3 rounded-lg bg-secondary/20 border border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <img src={getChainIcon(balance.chainIndex)} alt="" className="w-4 h-4 rounded-full" />
                      <span className="font-medium text-sm">{balance.symbol}</span>
                      <span className="text-xs text-muted-foreground">{formatUsd(currentValue)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{currentPercentage.toFixed(1)}%</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <span className={cn("text-xs font-medium", Math.abs(difference) > 0.5 && (difference > 0 ? "text-primary" : "text-destructive"))}>{targetPercentage.toFixed(1)}%</span>
                    </div>
                  </div>
                  <Slider value={[targetPercentage]} onValueChange={([value]) => setTargetAllocation(tokenKey, value)} max={100} step={0.5} className="py-1" />
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Total Allocation */}
      {Object.keys(targetAllocations).length > 0 && (
        <div className={cn("flex items-center justify-between p-2 rounded-lg text-sm", isValidAllocation ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive")}>
          <span>Total Allocation</span>
          <span className="font-medium">{totalTargetPercentage.toFixed(1)}%</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={handleCalculate} disabled={!isValidAllocation || balances.length === 0 || isCalculating} className="flex-1">
          {isCalculating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
          Calculate
        </Button>
        <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" disabled={Object.keys(targetAllocations).length === 0}><Clock className="w-4 h-4" /></Button>
          </DialogTrigger>
          <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[400px]">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" />Schedule Auto-Rebalance</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>Schedule Name</Label><Input value={scheduleName} onChange={(e) => setScheduleName(e.target.value)} placeholder="My Rebalance" /></div>
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={scheduleFrequency} onValueChange={(v: any) => setScheduleFrequency(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rebalance Threshold: {scheduleThreshold}%</Label>
                <p className="text-xs text-muted-foreground">Only rebalance if allocation drifts more than this percentage</p>
                <Slider value={[scheduleThreshold]} onValueChange={([v]) => setScheduleThreshold(v)} min={1} max={20} step={1} />
              </div>
              <Button onClick={handleCreateSchedule} className="w-full">Create Schedule</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rebalance Trades */}
      {rebalanceResult && rebalanceResult.trades.length > 0 && (
        <Collapsible open={showTrades} onOpenChange={setShowTrades}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between h-8">
              <span className="text-xs flex items-center gap-2">Suggested Trades <Badge variant="secondary" className="text-[10px]">{rebalanceResult.trades.length}</Badge></span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", showTrades && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="space-y-2">
              {rebalanceResult.trades.map((trade, i) => (
                <TradeCard key={i} trade={trade} getChainIcon={getChainIcon} formatUsd={formatUsd} onExecute={() => handleExecuteTrade(trade)} />
              ))}
            </div>
            <div className="flex justify-center mt-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="gap-2"><Download className="w-3.5 h-3.5" />Export</Button></DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleExport('csv')}>Download CSV</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('json')}>Download JSON</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('link')}><ExternalLink className="w-3.5 h-3.5 mr-2" />Copy Link</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Scheduled Rebalances */}
      {schedules.length > 0 && (
        <Collapsible open={showSchedules} onOpenChange={setShowSchedules}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between h-8">
              <span className="text-xs flex items-center gap-2">Schedules <Badge variant="secondary" className="text-[10px]">{schedules.length}</Badge></span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", showSchedules && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="space-y-2">
              {schedules.map((schedule) => (
                <ScheduleCard key={schedule.id} schedule={schedule} onPause={() => pauseSchedule(schedule.id)} onResume={() => resumeSchedule(schedule.id)} onCancel={() => cancelSchedule(schedule.id)} formatNextExecution={formatNextExecution} />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );

  if (standalone) {
    return rebalancerContent;
  }

  return (
    <Card className={cn("bg-card border-border", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" />
            Portfolio Rebalancer
          </CardTitle>
          <div className="flex items-center gap-1">
            {schedules.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {schedules.filter(s => s.status === 'active').length} active
              </Badge>
            )}
            <Button variant="ghost" size="icon" onClick={fetchCurrentPortfolio} disabled={isLoading} className="h-8 w-8">
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {rebalancerContent}
      </CardContent>
    </Card>
  );
}

function TradeCard({ 
  trade, 
  getChainIcon, 
  formatUsd,
  onExecute,
}: { 
  trade: RebalanceTrade;
  getChainIcon: (chainIndex: string) => string | undefined;
  formatUsd: (value: number) => string;
  onExecute: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30 border border-border/50">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <img src={getChainIcon(trade.fromToken.chainIndex)} alt="" className="w-3.5 h-3.5 rounded-full" />
          <span className="text-xs font-medium">{trade.fromToken.symbol}</span>
        </div>
        <ArrowRight className="w-3 h-3 text-muted-foreground" />
        <div className="flex items-center gap-1">
          <img src={getChainIcon(trade.toToken.chainIndex)} alt="" className="w-3.5 h-3.5 rounded-full" />
          <span className="text-xs font-medium">{trade.toToken.symbol}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-[10px]">
          {formatUsd(trade.amountUsd)}
        </Badge>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6"
          onClick={onExecute}
        >
          <ExternalLink className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

function ScheduleCard({
  schedule,
  onPause,
  onResume,
  onCancel,
  formatNextExecution,
}: {
  schedule: RebalanceSchedule;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  formatNextExecution: (date: string) => string;
}) {
  const isActive = schedule.status === 'active';
  
  return (
    <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30 border border-border/50">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">{schedule.name}</span>
          <Badge variant={isActive ? 'default' : 'secondary'} className="text-[10px]">
            {schedule.frequency}
          </Badge>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {isActive ? `Next: ${formatNextExecution(schedule.next_execution)}` : 'Paused'}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {isActive ? (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onPause}>
            <Pause className="w-3 h-3" />
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onResume}>
            <Play className="w-3 h-3" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onCancel}>
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
