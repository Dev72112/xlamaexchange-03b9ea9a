import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Helmet } from "react-helmet-async";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useQuery } from "@tanstack/react-query";
import { defiLlamaService } from "@/services/defillama";
import { popularCurrencies } from "@/data/currencies";
import { 
  Wallet, Plus, Trash2, Edit2, Loader2, 
  TrendingUp, TrendingDown, PieChart, X, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const Portfolio = () => {
  const { holdings, addHolding, updateHolding, removeHolding } = usePortfolio();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<typeof popularCurrencies[0] | null>(null);
  const [amount, setAmount] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");

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
  };

  const handleUpdateHolding = (id: string) => {
    if (!editAmount || parseFloat(editAmount) <= 0) return;
    updateHolding(id, parseFloat(editAmount));
    setEditingId(null);
    setEditAmount("");
  };

  const totalValue = holdings.reduce((acc, holding) => {
    const price = prices?.[holding.ticker];
    if (price) {
      return acc + (holding.amount * price);
    }
    return acc;
  }, 0);

  return (
    <Layout>
      <Helmet>
        <title>Portfolio Tracker - xlama</title>
        <meta name="description" content="Track your cryptocurrency portfolio with live prices and total value." />
      </Helmet>

      <div className="container px-4 py-12 sm:py-16 max-w-4xl">
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
              Track your holdings with live prices
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Holding
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Holding</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Select Cryptocurrency</label>
                  <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
                    {popularCurrencies.map((currency) => (
                      <button
                        key={currency.ticker}
                        onClick={() => setSelectedCurrency(currency)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 rounded-lg border transition-all",
                          selectedCurrency?.ticker === currency.ticker
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <img
                          src={currency.image}
                          alt={currency.name}
                          className="w-8 h-8 rounded-full"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${currency.ticker}&background=random`;
                          }}
                        />
                        <span className="text-xs font-medium uppercase">{currency.ticker}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedCurrency && (
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Amount</label>
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

        {/* Total Value Card */}
        {holdings.length > 0 && (
          <Card className="p-6 mb-8 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/20">
                <PieChart className="w-6 h-6 text-primary" />
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
          </Card>
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
