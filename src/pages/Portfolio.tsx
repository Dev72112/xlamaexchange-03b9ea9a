import { useState, useRef, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Helmet } from "react-helmet-async";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useChangeNowCurrencies } from "@/hooks/useChangeNowCurrencies";
import { useQuery } from "@tanstack/react-query";
import { defiLlamaService } from "@/services/defillama";
import { 
  Wallet, Plus, Trash2, Edit2, Loader2, 
  TrendingUp, TrendingDown, X, Check,
  Download, Upload, FileJson, FileSpreadsheet,
  Bell, BellRing, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { cn } from "@/lib/utils";

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-6))',
  'hsl(217 91% 60%)',
  'hsl(262 83% 58%)',
  'hsl(340 82% 52%)',
  'hsl(180 70% 45%)',
  'hsl(25 95% 53%)',
];

const Portfolio = () => {
  const { 
    holdings, 
    addHolding, 
    updateHolding, 
    removeHolding, 
    exportPortfolio, 
    exportCSV, 
    importPortfolio,
    portfolioAlerts,
    addPortfolioAlert,
    removePortfolioAlert,
    checkPortfolioAlerts,
    activePortfolioAlerts,
    triggeredPortfolioAlerts,
  } = usePortfolio();
  
  const { currencies: allCurrencies, isLoading: currenciesLoading } = useChangeNowCurrencies();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState<typeof allCurrencies[0] | null>(null);
  const [amount, setAmount] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Alert form state
  const [alertTicker, setAlertTicker] = useState("");
  const [alertCondition, setAlertCondition] = useState<'above' | 'below' | 'change'>('above');
  const [alertTargetValue, setAlertTargetValue] = useState("");
  const [alertSearchQuery, setAlertSearchQuery] = useState("");

  // Fetch prices for all holdings
  const { data: prices, isLoading: pricesLoading } = useQuery({
    queryKey: ['portfolio-prices', holdings.map(h => h.ticker).join(',')],
    queryFn: async () => {
      if (holdings.length === 0) return {};
      const tickers = holdings.map(h => h.ticker);
      return defiLlamaService.getPrices(tickers);
    },
    enabled: holdings.length > 0,
    refetchInterval: 30000,
  });

  // Check alerts when prices update
  useEffect(() => {
    if (prices && Object.keys(prices).length > 0) {
      checkPortfolioAlerts(prices);
    }
  }, [prices, checkPortfolioAlerts]);

  const filteredCurrencies = allCurrencies.filter(c => {
    if (!searchQuery) return true;
    return c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           c.ticker.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const alertFilteredCurrencies = holdings.filter(h => {
    if (!alertSearchQuery) return true;
    return h.name.toLowerCase().includes(alertSearchQuery.toLowerCase()) ||
           h.ticker.toLowerCase().includes(alertSearchQuery.toLowerCase());
  });

  const handleAddHolding = () => {
    if (!selectedCurrency || !amount || parseFloat(amount) <= 0) return;
    
    addHolding({
      ticker: selectedCurrency.ticker,
      name: selectedCurrency.name,
      image: selectedCurrency.image,
      amount: parseFloat(amount),
      network: selectedCurrency.network,
    });

    setDialogOpen(false);
    setSelectedCurrency(null);
    setAmount("");
    setSearchQuery("");
  };

  const handleUpdateHolding = (id: string) => {
    if (!editAmount || parseFloat(editAmount) <= 0) return;
    updateHolding(id, parseFloat(editAmount));
    setEditingId(null);
    setEditAmount("");
  };

  const handleCreateAlert = () => {
    const holding = holdings.find(h => h.ticker === alertTicker);
    if (!holding || !alertTargetValue) return;
    
    addPortfolioAlert({
      ticker: holding.ticker,
      name: holding.name,
      condition: alertCondition,
      targetValue: parseFloat(alertTargetValue),
    });

    setAlertDialogOpen(false);
    setAlertTicker("");
    setAlertCondition('above');
    setAlertTargetValue("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importPortfolio(file);
      e.target.value = '';
    }
  };

  const totalValue = holdings.reduce((acc, holding) => {
    const price = prices?.[holding.ticker];
    if (price) {
      return acc + (holding.amount * price);
    }
    return acc;
  }, 0);

  // Prepare pie chart data
  const pieChartData = holdings
    .map(holding => {
      const price = prices?.[holding.ticker];
      const value = price ? holding.amount * price : 0;
      return {
        name: holding.ticker.toUpperCase(),
        value,
        fullName: holding.name,
      };
    })
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <Layout>
      <Helmet>
        <title>Portfolio Tracker - xlama</title>
        <meta name="description" content="Track your cryptocurrency portfolio with live prices, alerts, and visualizations." />
      </Helmet>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json,.csv"
        className="hidden"
      />

      <div className="container px-4 py-12 sm:py-16 max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-primary/10">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold">Portfolio</h1>
            </div>
            <p className="text-muted-foreground">
              Track your holdings with live prices and alerts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-10">
          {/* Import */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Import
          </Button>

          {/* Export Dropdown */}
          {holdings.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportPortfolio}>
                  <FileJson className="w-4 h-4 mr-2" />
                  Export as JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportCSV}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Price Alert Button */}
          {holdings.length > 0 && (
            <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Bell className="w-4 h-4" />
                  Set Alert
                  {activePortfolioAlerts.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                      {activePortfolioAlerts.length}
                    </Badge>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <BellRing className="w-5 h-5 text-warning" />
                    Create Portfolio Alert
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Select Holding</label>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search holdings..."
                        value={alertSearchQuery}
                        onChange={(e) => setAlertSearchQuery(e.target.value)}
                        className="pl-10 h-9"
                      />
                    </div>
                    <div className="grid grid-cols-4 gap-2 max-h-[150px] overflow-y-auto">
                      {alertFilteredCurrencies.map((holding) => (
                        <button
                          key={holding.id}
                          onClick={() => setAlertTicker(holding.ticker)}
                          className={cn(
                            "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all",
                            alertTicker === holding.ticker
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <img
                            src={holding.image}
                            alt={holding.name}
                            className="w-6 h-6 rounded-full"
                          />
                          <span className="text-xs font-medium uppercase">{holding.ticker}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Condition</label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={alertCondition === "above" ? "default" : "outline"}
                        onClick={() => setAlertCondition("above")}
                        className="flex-1"
                        size="sm"
                      >
                        <TrendingUp className="w-4 h-4 mr-1" />
                        Above
                      </Button>
                      <Button
                        type="button"
                        variant={alertCondition === "below" ? "default" : "outline"}
                        onClick={() => setAlertCondition("below")}
                        className="flex-1"
                        size="sm"
                      >
                        <TrendingDown className="w-4 h-4 mr-1" />
                        Below
                      </Button>
                      <Button
                        type="button"
                        variant={alertCondition === "change" ? "default" : "outline"}
                        onClick={() => setAlertCondition("change")}
                        className="flex-1"
                        size="sm"
                      >
                        ±%
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">
                      {alertCondition === 'change' ? 'Change Percentage (%)' : 'Target Price ($)'}
                    </label>
                    <Input
                      type="number"
                      step="any"
                      placeholder={alertCondition === 'change' ? 'e.g. 5' : 'e.g. 50000'}
                      value={alertTargetValue}
                      onChange={(e) => setAlertTargetValue(e.target.value)}
                    />
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={handleCreateAlert}
                    disabled={!alertTicker || !alertTargetValue}
                  >
                    Create Alert
                  </Button>
                </div>

                {/* Existing Alerts */}
                {portfolioAlerts.length > 0 && (
                  <div className="mt-6 pt-4 border-t">
                    <h4 className="text-sm font-medium mb-3">Active Alerts</h4>
                    <div className="space-y-2 max-h-[150px] overflow-y-auto">
                      {portfolioAlerts.map((alert) => (
                        <div 
                          key={alert.id}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-lg text-sm",
                            alert.triggered ? "bg-warning/10" : "bg-secondary/50"
                          )}
                        >
                          <div>
                            <span className="font-medium">{alert.name}</span>
                            <span className="text-muted-foreground ml-2">
                              {alert.condition === 'above' ? '>' : alert.condition === 'below' ? '<' : '±'}
                              {alert.condition === 'change' ? `${alert.targetValue}%` : `$${alert.targetValue}`}
                            </span>
                            {alert.triggered && (
                              <Badge variant="secondary" className="ml-2 text-xs bg-warning/20 text-warning">
                                Triggered
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => removePortfolioAlert(alert.id)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          )}

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Holding
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Holding</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Select Cryptocurrency</label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tokens..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {currenciesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-[300px] overflow-y-auto">
                      {filteredCurrencies.slice(0, 100).map((currency) => (
                        <button
                          key={currency.ticker}
                          onClick={() => setSelectedCurrency(currency)}
                          className={cn(
                            "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all",
                            selectedCurrency?.ticker === currency.ticker
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <img
                            src={currency.image}
                            alt={currency.name}
                            className="w-7 h-7 rounded-full"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${currency.ticker}&background=random`;
                            }}
                          />
                          <span className="text-[10px] font-medium uppercase truncate w-full text-center">
                            {currency.ticker}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {filteredCurrencies.length > 100 && (
                    <p className="text-xs text-muted-foreground text-center">
                      Showing 100 of {filteredCurrencies.length} tokens. Use search to find more.
                    </p>
                  )}
                </div>

                {selectedCurrency && (
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Amount of {selectedCurrency.name}</label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                )}

                <Button 
                  className="w-full" 
                  onClick={handleAddHolding}
                  disabled={!selectedCurrency || !amount}
                >
                  Add to Portfolio
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Total Value Card & Pie Chart */}
        {holdings.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 mb-8">
            <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/20">
                  <Wallet className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Total Portfolio Value</div>
                  <div className="text-3xl font-bold">
                    {pricesLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      `$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    )}
                  </div>
                </div>
              </div>
              
              {/* Active Alerts Summary */}
              {activePortfolioAlerts.length > 0 && (
                <div className="mt-4 pt-4 border-t border-primary/20">
                  <div className="flex items-center gap-2 text-sm">
                    <Bell className="w-4 h-4 text-warning" />
                    <span className="text-muted-foreground">
                      {activePortfolioAlerts.length} active alert{activePortfolioAlerts.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              )}
            </Card>

            {/* Pie Chart */}
            {pieChartData.length > 0 && (
              <Card className="p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Allocation</h3>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]}
                            stroke="hsl(var(--background))"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [`$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, 'Value']}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend 
                        formatter={(value) => <span className="text-xs">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Holdings List */}
        {holdings.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-semibold mb-2">No holdings yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Add your cryptocurrency holdings to track their value over time.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Holding
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {holdings.map((holding) => {
              const price = prices?.[holding.ticker];
              const value = price ? holding.amount * price : null;
              const isEditing = editingId === holding.id;

              return (
                <Card 
                  key={holding.id}
                  className="p-4 sm:p-5 hover:border-primary/30 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={holding.image}
                      alt={holding.name}
                      className="w-12 h-12 rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${holding.ticker}&background=random`;
                      }}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{holding.name}</span>
                        <span className="text-sm text-muted-foreground uppercase">
                          {holding.ticker}
                        </span>
                        {holding.network && (
                          <Badge variant="outline" className="text-xs">
                            {holding.network}
                          </Badge>
                        )}
                      </div>
                      
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="any"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="h-8 w-32"
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleUpdateHolding(holding.id)}
                          >
                            <Check className="w-4 h-4 text-success" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditingId(null);
                              setEditAmount("");
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          {holding.amount.toLocaleString()} {holding.ticker.toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="text-right hidden sm:block">
                      {pricesLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      ) : price ? (
                        <>
                          <div className="font-mono font-medium">
                            ${value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            @ ${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </div>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">--</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          setEditingId(holding.id);
                          setEditAmount(holding.amount.toString());
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeHolding(holding.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Portfolio;
