import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface PortfolioHolding {
  id: string;
  ticker: string;
  name: string;
  image: string;
  amount: number;
  network?: string;
  addedAt: number;
}

export interface PortfolioAlert {
  id: string;
  ticker: string;
  name: string;
  condition: 'above' | 'below' | 'change';
  targetValue: number; // price for above/below, percentage for change
  createdAt: number;
  triggered: boolean;
  triggeredAt?: number;
  lastPrice?: number;
}

const STORAGE_KEY = 'xlama_portfolio';
const ALERTS_STORAGE_KEY = 'xlama_portfolio_alerts';

export function usePortfolio() {
  const { toast } = useToast();
  const [holdings, setHoldings] = useState<PortfolioHolding[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load portfolio:', e);
    }
    return [];
  });

  const [portfolioAlerts, setPortfolioAlerts] = useState<PortfolioAlert[]>(() => {
    try {
      const saved = localStorage.getItem(ALERTS_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load portfolio alerts:', e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
    } catch (e) {
      console.error('Failed to save portfolio:', e);
    }
  }, [holdings]);

  useEffect(() => {
    try {
      localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(portfolioAlerts));
    } catch (e) {
      console.error('Failed to save portfolio alerts:', e);
    }
  }, [portfolioAlerts]);

  const addHolding = useCallback((holding: Omit<PortfolioHolding, 'id' | 'addedAt'>) => {
    const existing = holdings.find(h => h.ticker.toLowerCase() === holding.ticker.toLowerCase());
    
    if (existing) {
      setHoldings(prev => prev.map(h => 
        h.id === existing.id 
          ? { ...h, amount: h.amount + holding.amount }
          : h
      ));
      toast({
        title: "Holding Updated",
        description: `Updated ${holding.name} balance`,
      });
    } else {
      const newHolding: PortfolioHolding = {
        ...holding,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        addedAt: Date.now(),
      };
      setHoldings(prev => [...prev, newHolding]);
      toast({
        title: "Holding Added",
        description: `Added ${holding.name} to your portfolio`,
      });
    }
  }, [holdings, toast]);

  const updateHolding = useCallback((id: string, amount: number) => {
    setHoldings(prev => prev.map(h => 
      h.id === id ? { ...h, amount } : h
    ));
  }, []);

  const removeHolding = useCallback((id: string) => {
    setHoldings(prev => prev.filter(h => h.id !== id));
    toast({
      title: "Holding Removed",
      description: "Removed from your portfolio",
    });
  }, [toast]);

  // Portfolio alerts
  const addPortfolioAlert = useCallback((alert: Omit<PortfolioAlert, 'id' | 'createdAt' | 'triggered'>) => {
    const newAlert: PortfolioAlert = {
      ...alert,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      triggered: false,
    };
    setPortfolioAlerts(prev => [...prev, newAlert]);
    toast({
      title: "Alert Created",
      description: `Price alert for ${alert.name} created`,
    });
  }, [toast]);

  const removePortfolioAlert = useCallback((id: string) => {
    setPortfolioAlerts(prev => prev.filter(a => a.id !== id));
    toast({
      title: "Alert Removed",
      description: "Price alert removed",
    });
  }, [toast]);

  const checkPortfolioAlerts = useCallback((prices: Record<string, number>) => {
    setPortfolioAlerts(prev => prev.map(alert => {
      if (alert.triggered) return alert;
      
      const currentPrice = prices[alert.ticker];
      if (!currentPrice) return alert;

      let shouldTrigger = false;
      
      if (alert.condition === 'above' && currentPrice >= alert.targetValue) {
        shouldTrigger = true;
      } else if (alert.condition === 'below' && currentPrice <= alert.targetValue) {
        shouldTrigger = true;
      } else if (alert.condition === 'change' && alert.lastPrice) {
        const changePercent = ((currentPrice - alert.lastPrice) / alert.lastPrice) * 100;
        if (Math.abs(changePercent) >= alert.targetValue) {
          shouldTrigger = true;
        }
      }

      if (shouldTrigger) {
        // Show notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Portfolio Alert: ${alert.name}`, {
            body: `${alert.name} has ${alert.condition === 'above' ? 'risen above' : alert.condition === 'below' ? 'fallen below' : 'changed by'} ${alert.condition === 'change' ? alert.targetValue + '%' : '$' + alert.targetValue}`,
            icon: '/favicon.ico',
          });
        }
        
        toast({
          title: `Portfolio Alert Triggered`,
          description: `${alert.name} ${alert.condition === 'above' ? 'rose above' : alert.condition === 'below' ? 'fell below' : 'changed by'} ${alert.condition === 'change' ? alert.targetValue + '%' : '$' + alert.targetValue}`,
        });

        return { ...alert, triggered: true, triggeredAt: Date.now(), lastPrice: currentPrice };
      }

      return { ...alert, lastPrice: currentPrice };
    }));
  }, [toast]);

  const exportPortfolio = useCallback(() => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      holdings: holdings.map(h => ({
        ticker: h.ticker,
        name: h.name,
        amount: h.amount,
        network: h.network,
      })),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xlama-portfolio-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Portfolio Exported",
      description: "Your portfolio has been downloaded as JSON",
    });
  }, [holdings, toast]);

  const exportCSV = useCallback(() => {
    const headers = ['Ticker', 'Name', 'Amount', 'Network'];
    const rows = holdings.map(h => [h.ticker, h.name, h.amount.toString(), h.network || '']);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xlama-portfolio-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Portfolio Exported",
      description: "Your portfolio has been downloaded as CSV",
    });
  }, [holdings, toast]);

  const importPortfolio = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        
        if (file.name.endsWith('.csv')) {
          const lines = content.split('\n').filter(l => l.trim());
          const rows = lines.slice(1);
          
          const imported: Omit<PortfolioHolding, 'id' | 'addedAt'>[] = rows.map(row => {
            const [ticker, name, amount, network] = row.split(',');
            return {
              ticker: ticker.trim(),
              name: name.trim(),
              amount: parseFloat(amount.trim()) || 0,
              network: network?.trim() || undefined,
              image: `https://ui-avatars.com/api/?name=${ticker.trim()}&background=random`,
            };
          }).filter(h => h.ticker && h.amount > 0);
          
          imported.forEach(h => addHolding(h));
          toast({
            title: "Import Complete",
            description: `Imported ${imported.length} holdings from CSV`,
          });
        } else {
          const data = JSON.parse(content);
          const imported = data.holdings || [];
          
          imported.forEach((h: any) => {
            if (h.ticker && h.amount > 0) {
              addHolding({
                ticker: h.ticker,
                name: h.name || h.ticker,
                amount: h.amount,
                network: h.network,
                image: `https://ui-avatars.com/api/?name=${h.ticker}&background=random`,
              });
            }
          });
          
          toast({
            title: "Import Complete",
            description: `Imported ${imported.length} holdings from JSON`,
          });
        }
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Could not parse the file. Please check the format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  }, [addHolding, toast]);

  return {
    holdings,
    addHolding,
    updateHolding,
    removeHolding,
    exportPortfolio,
    exportCSV,
    importPortfolio,
    totalHoldings: holdings.length,
    // Portfolio alerts
    portfolioAlerts,
    addPortfolioAlert,
    removePortfolioAlert,
    checkPortfolioAlerts,
    activePortfolioAlerts: portfolioAlerts.filter(a => !a.triggered),
    triggeredPortfolioAlerts: portfolioAlerts.filter(a => a.triggered),
  };
}
