import { useState, useEffect } from "react";
import { Bell, BellRing, Plus, Trash2, TrendingUp, TrendingDown, X, BellOff, Search, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePriceAlerts, PriceAlert } from "@/hooks/usePriceAlerts";
import { Badge } from "@/components/ui/badge";
import { useChangeNowCurrencies } from "@/hooks/useChangeNowCurrencies";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { trackPriceAlertCreated } from "@/lib/tracking";
import xlamaMascot from "@/assets/xlama-mascot.png";

interface PriceAlertsProps {
  standalone?: boolean;
}

const popularPairs = [
  { from: "btc", to: "eth", fromName: "Bitcoin", toName: "Ethereum" },
  { from: "btc", to: "usdterc20", fromName: "Bitcoin", toName: "USDT" },
  { from: "eth", to: "usdterc20", fromName: "Ethereum", toName: "USDT" },
  { from: "btc", to: "sol", fromName: "Bitcoin", toName: "Solana" },
  { from: "eth", to: "bnbmainnet", fromName: "Ethereum", toName: "BNB" },
  { from: "sol", to: "usdterc20", fromName: "Solana", toName: "USDT" },
  { from: "xrp", to: "usdterc20", fromName: "Ripple", toName: "USDT" },
  { from: "doge", to: "usdterc20", fromName: "Dogecoin", toName: "USDT" },
];

export function PriceAlerts({ standalone = false }: PriceAlertsProps = {}) {
  const { alerts, addAlert, removeAlert, clearAllTriggered, activeAlerts, triggeredAlerts } = usePriceAlerts();
  const { currencies: allCurrencies, isLoading: currenciesLoading } = useChangeNowCurrencies();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPair, setSelectedPair] = useState("");
  const [targetRate, setTargetRate] = useState("");
  const [condition, setCondition] = useState<"above" | "below">("above");
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const { toast } = useToast();
  
  // Custom pair creation
  const [isCustomPair, setIsCustomPair] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [searchFrom, setSearchFrom] = useState("");
  const [searchTo, setSearchTo] = useState("");

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission('unsupported');
    }
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }
  };

  const handleCreateAlert = () => {
    let fromTicker: string, toTicker: string, fromName: string, toName: string;

    if (isCustomPair) {
      if (!customFrom || !customTo) return;
      const fromCurrency = allCurrencies.find(c => c.ticker === customFrom);
      const toCurrency = allCurrencies.find(c => c.ticker === customTo);
      if (!fromCurrency || !toCurrency) return;
      
      fromTicker = fromCurrency.ticker;
      toTicker = toCurrency.ticker;
      fromName = fromCurrency.name;
      toName = toCurrency.name;
    } else {
      const pair = popularPairs.find(p => `${p.from}-${p.to}` === selectedPair);
      if (!pair || !targetRate) return;
      
      fromTicker = pair.from;
      toTicker = pair.to;
      fromName = pair.fromName;
      toName = pair.toName;
    }

    if (!targetRate) return;

    addAlert({
      fromTicker,
      toTicker,
      fromName,
      toName,
      targetRate: parseFloat(targetRate),
      condition,
    });

    // Track the event
    trackPriceAlertCreated(fromTicker, toTicker, condition);

    // Show toast
    toast({
      title: "Alert Created",
      description: `You'll be notified when ${fromName}/${toName} goes ${condition} ${targetRate}`,
    });

    setDialogOpen(false);
    setSelectedPair("");
    setTargetRate("");
    setCondition("above");
    setIsCustomPair(false);
    setCustomFrom("");
    setCustomTo("");
  };

  const handleRemoveAlert = (alertId: string) => {
    removeAlert(alertId);
    toast({
      title: "Alert Removed",
      description: "Price alert has been deleted.",
    });
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const filteredFromCurrencies = allCurrencies.filter(c => 
    c.name.toLowerCase().includes(searchFrom.toLowerCase()) ||
    c.ticker.toLowerCase().includes(searchFrom.toLowerCase())
  );

  const filteredToCurrencies = allCurrencies.filter(c => 
    c.ticker !== customFrom && (
      c.name.toLowerCase().includes(searchTo.toLowerCase()) ||
      c.ticker.toLowerCase().includes(searchTo.toLowerCase())
    )
  );

  const innerContent = (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
            <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-warning shrink-0" />
            <span className="truncate">Price Alerts</span>
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Get notified when rates hit your target
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0 w-full sm:w-auto">
          {notificationPermission !== 'granted' && notificationPermission !== 'unsupported' && (
            <Button variant="outline" size="sm" onClick={requestNotificationPermission} className="gap-2">
              <BellRing className="w-4 h-4" />
              Enable Notifications
            </Button>
          )}
          {notificationPermission === 'granted' && (
            <Badge variant="secondary" className="gap-1.5 bg-success/10 text-success border-success/20">
              <Bell className="w-3 h-3" />
              Notifications On
            </Badge>
          )}
          {notificationPermission === 'denied' && (
            <Badge variant="secondary" className="gap-1.5 bg-destructive/10 text-destructive border-destructive/20">
              <BellOff className="w-3 h-3" />
              Blocked
            </Badge>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Alert
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
              {/* ... keep existing code (dialog content) */}
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BellRing className="w-5 h-5 text-warning" />
                  Create Price Alert
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="flex gap-2">
                  <Button type="button" variant={!isCustomPair ? "default" : "outline"} onClick={() => setIsCustomPair(false)} className="flex-1" size="sm">Popular Pairs</Button>
                  <Button type="button" variant={isCustomPair ? "default" : "outline"} onClick={() => setIsCustomPair(true)} className="flex-1" size="sm">Custom Pair</Button>
                </div>
                {!isCustomPair ? (
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Trading Pair</label>
                    <Select value={selectedPair} onValueChange={setSelectedPair}>
                      <SelectTrigger><SelectValue placeholder="Select a pair" /></SelectTrigger>
                      <SelectContent>
                        {popularPairs.map(pair => (
                          <SelectItem key={`${pair.from}-${pair.to}`} value={`${pair.from}-${pair.to}`}>
                            {pair.fromName} → {pair.toName} ({pair.from.toUpperCase()}/{pair.to.toUpperCase()})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">From Currency</label>
                      <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input placeholder="Search..." value={searchFrom} onChange={(e) => setSearchFrom(e.target.value)} className="pl-10 h-8" />
                      </div>
                      {currenciesLoading ? (
                        <div className="flex items-center justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                      ) : (
                        <div className="grid grid-cols-4 gap-1.5 max-h-[120px] overflow-y-auto">
                          {filteredFromCurrencies.slice(0, 20).map((currency) => (
                            <button key={currency.ticker} onClick={() => setCustomFrom(currency.ticker)} className={cn("flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all", customFrom === currency.ticker ? "border-primary bg-primary/10" : "border-border hover:border-primary/50")}>
                              <img src={currency.image} alt={currency.name} className="w-6 h-6 rounded-full" />
                              <span className="uppercase font-medium">{currency.ticker}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">To Currency</label>
                      <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input placeholder="Search..." value={searchTo} onChange={(e) => setSearchTo(e.target.value)} className="pl-10 h-8" />
                      </div>
                      {currenciesLoading ? (
                        <div className="flex items-center justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                      ) : (
                        <div className="grid grid-cols-4 gap-1.5 max-h-[120px] overflow-y-auto">
                          {filteredToCurrencies.slice(0, 20).map((currency) => (
                            <button key={currency.ticker} onClick={() => setCustomTo(currency.ticker)} className={cn("flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all", customTo === currency.ticker ? "border-primary bg-primary/10" : "border-border hover:border-primary/50")}>
                              <img src={currency.image} alt={currency.name} className="w-6 h-6 rounded-full" />
                              <span className="uppercase font-medium">{currency.ticker}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {customFrom && customTo && (
                      <div className="p-3 rounded-lg bg-secondary/50 text-sm text-center">
                        {allCurrencies.find(c => c.ticker === customFrom)?.name} →{' '}
                        {allCurrencies.find(c => c.ticker === customTo)?.name}
                      </div>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Condition</label>
                  <div className="flex gap-2">
                    <Button type="button" variant={condition === "above" ? "default" : "outline"} onClick={() => setCondition("above")} className="flex-1 gap-2"><TrendingUp className="w-4 h-4" />Goes Above</Button>
                    <Button type="button" variant={condition === "below" ? "default" : "outline"} onClick={() => setCondition("below")} className="flex-1 gap-2"><TrendingDown className="w-4 h-4" />Goes Below</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Target Rate</label>
                  <Input type="number" step="any" placeholder="e.g. 35.5" value={targetRate} onChange={(e) => setTargetRate(e.target.value)} />
                </div>
                <Button className="w-full" onClick={handleCreateAlert} disabled={(!isCustomPair && !selectedPair) || (isCustomPair && (!customFrom || !customTo)) || !targetRate}>Create Alert</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {alerts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <img src={xlamaMascot} alt="xLama mascot" className="w-16 h-16 mx-auto mb-4 opacity-60 rounded-full" />
          <p className="mb-4 font-medium">No price alerts yet</p>
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create your first alert
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {activeAlerts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />
                Active ({activeAlerts.length})
              </h3>
              <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {activeAlerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} onRemove={handleRemoveAlert} formatTimeAgo={formatTimeAgo} />
                ))}
              </div>
            </div>
          )}
          {triggeredAlerts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <BellRing className="w-3 h-3 sm:w-4 sm:h-4 text-warning shrink-0" />
                  Triggered ({triggeredAlerts.length})
                </h3>
                <Button variant="ghost" size="sm" onClick={clearAllTriggered} className="text-xs text-muted-foreground hover:text-destructive gap-1.5 h-7">
                  <Trash2 className="w-3 h-3" />
                  Clear All
                </Button>
              </div>
              <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {triggeredAlerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} onRemove={handleRemoveAlert} formatTimeAgo={formatTimeAgo} triggered />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );

  if (standalone) {
    return innerContent;
  }

  return (
    <section className="py-8 sm:py-12 lg:py-16">
      <div className="container px-4 sm:px-6 overflow-hidden">
        <Card className="bg-card border-border overflow-hidden w-full sweep-effect">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold flex items-center gap-2">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-warning shrink-0" />
                <span className="truncate">Price Alerts</span>
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Get notified when rates hit your target
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {innerContent}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function formatRate(value: number): string {
  if (value >= 1000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  } else if (value >= 1) {
    return value.toFixed(4);
  } else if (value >= 0.0001) {
    return value.toFixed(6);
  } else {
    return value.toExponential(4);
  }
}

function AlertCard({ 
  alert, 
  onRemove, 
  formatTimeAgo,
  triggered = false 
}: { 
  alert: PriceAlert; 
  onRemove: (id: string) => void;
  formatTimeAgo: (timestamp: number) => string;
  triggered?: boolean;
}) {
  return (
    <div className={cn(
      "group relative p-3 sm:p-4 rounded-xl border transition-colors overflow-hidden",
      triggered 
        ? 'bg-warning/10 border-warning/30' 
        : 'bg-secondary/30 border-border hover:border-border/80'
    )}>
      <button
        onClick={() => onRemove(alert.id)}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 rounded transition-all z-10"
        title="Remove alert"
      >
        <X className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground hover:text-destructive" />
      </button>

      <div className="flex items-start gap-2 sm:gap-3">
        <div className={cn(
          "p-1.5 sm:p-2 rounded-lg shrink-0",
          alert.condition === 'above' 
            ? 'bg-success/10 text-success' 
            : 'bg-destructive/10 text-destructive'
        )}>
          {alert.condition === 'above' ? (
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
          ) : (
            <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />
          )}
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-medium text-xs sm:text-sm uppercase truncate">
              {alert.fromTicker}/{alert.toTicker}
            </span>
            {triggered && (
              <Badge variant="secondary" className="bg-warning/20 text-warning text-[8px] sm:text-[10px] shrink-0">
                Triggered
              </Badge>
            )}
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground truncate">
            {alert.condition === 'above' ? 'Above' : 'Below'} {formatRate(alert.targetRate)}
          </div>
          {alert.lastCheckedRate && (
            <div className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">
              Current: <span className="font-mono">{formatRate(alert.lastCheckedRate)}</span>
            </div>
          )}
          <div className="text-[9px] sm:text-[10px] text-muted-foreground mt-2">
            Created {formatTimeAgo(alert.createdAt)}
          </div>
        </div>
      </div>
    </div>
  );
}
