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

const STORAGE_KEY = 'xlama_portfolio';

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

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
    } catch (e) {
      console.error('Failed to save portfolio:', e);
    }
  }, [holdings]);

  const addHolding = useCallback((holding: Omit<PortfolioHolding, 'id' | 'addedAt'>) => {
    const existing = holdings.find(h => h.ticker.toLowerCase() === holding.ticker.toLowerCase());
    
    if (existing) {
      // Update amount
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

  return {
    holdings,
    addHolding,
    updateHolding,
    removeHolding,
    totalHoldings: holdings.length,
  };
}
