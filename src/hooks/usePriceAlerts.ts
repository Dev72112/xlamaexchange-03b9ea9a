import { useState, useEffect, useCallback } from 'react';
import { changeNowService } from '@/services/changenow';
import { useToast } from '@/hooks/use-toast';

export interface PriceAlert {
  id: string;
  fromTicker: string;
  toTicker: string;
  fromName: string;
  toName: string;
  targetRate: number;
  condition: 'above' | 'below';
  createdAt: number;
  triggered: boolean;
  lastCheckedRate?: number;
}

const STORAGE_KEY = 'xlama_price_alerts';

export function usePriceAlerts() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load price alerts:', e);
    }
    return [];
  });

  // Save alerts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
    } catch (e) {
      console.error('Failed to save price alerts:', e);
    }
  }, [alerts]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const addAlert = useCallback((alert: Omit<PriceAlert, 'id' | 'createdAt' | 'triggered'>) => {
    const newAlert: PriceAlert = {
      ...alert,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      triggered: false,
    };
    setAlerts(prev => [...prev, newAlert]);
    
    toast({
      title: "Alert Created",
      description: `You'll be notified when ${alert.fromTicker.toUpperCase()}/${alert.toTicker.toUpperCase()} goes ${alert.condition} ${alert.targetRate}`,
    });
    
    return newAlert;
  }, [toast]);

  const removeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const triggerAlert = useCallback((alert: PriceAlert, currentRate: number) => {
    // Mark as triggered
    setAlerts(prev => prev.map(a => 
      a.id === alert.id ? { ...a, triggered: true, lastCheckedRate: currentRate } : a
    ));

    const message = `${alert.fromTicker.toUpperCase()}/${alert.toTicker.toUpperCase()} is now ${currentRate.toFixed(6)} (${alert.condition} ${alert.targetRate})`;

    // Show toast
    toast({
      title: "🔔 Price Alert Triggered!",
      description: message,
      duration: 10000,
    });

    // Show browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('xlama Price Alert', {
        body: message,
        icon: '/favicon.ico',
      });
    }
  }, [toast]);

  const checkAlerts = useCallback(async () => {
    const activeAlerts = alerts.filter((a) => !a.triggered);

    if (activeAlerts.length === 0) return;

    const getRatePerOne = async (from: string, to: string): Promise<number> => {
      try {
        const estimate = await changeNowService.getExchangeAmount(from, to, 1, false);
        return estimate.estimatedAmount;
      } catch (err: any) {
        const msg = String(err?.message || "");
        if (msg.includes("deposit_too_small") || msg.includes("Out of min amount")) {
          const minData = await changeNowService.getMinAmount(from, to);
          const amountToUse = minData.minAmount;
          const estimate = await changeNowService.getExchangeAmount(from, to, amountToUse, false);
          return estimate.estimatedAmount / amountToUse;
        }
        throw err;
      }
    };

    // Group alerts by pair to minimize API calls
    const pairs = new Map<string, PriceAlert[]>();
    activeAlerts.forEach((alert) => {
      const key = `${alert.fromTicker}-${alert.toTicker}`;
      if (!pairs.has(key)) {
        pairs.set(key, []);
      }
      pairs.get(key)!.push(alert);
    });

    // Check each pair
    for (const [_, pairAlerts] of pairs) {
      try {
        const alert = pairAlerts[0];
        const currentRate = await getRatePerOne(alert.fromTicker, alert.toTicker);

        // Update last checked rate
        setAlerts((prev) =>
          prev.map((a) =>
            pairAlerts.some((pa) => pa.id === a.id)
              ? { ...a, lastCheckedRate: currentRate }
              : a
          )
        );

        // Check each alert for this pair
        for (const a of pairAlerts) {
          const shouldTrigger =
            (a.condition === "above" && currentRate >= a.targetRate) ||
            (a.condition === "below" && currentRate <= a.targetRate);

          if (shouldTrigger) {
            triggerAlert(a, currentRate);
          }
        }
      } catch (error) {
        console.error("Failed to check alert:", error);
      }
    }
  }, [alerts, triggerAlert]);

  // Check alerts periodically
  useEffect(() => {
    const hasActiveAlerts = alerts.some(a => !a.triggered);
    if (!hasActiveAlerts) return;

    // Initial check
    checkAlerts();

    // Check every 30 seconds
    const interval = setInterval(checkAlerts, 30000);
    return () => clearInterval(interval);
  }, [alerts, checkAlerts]);

  return {
    alerts,
    addAlert,
    removeAlert,
    activeAlerts: alerts.filter(a => !a.triggered),
    triggeredAlerts: alerts.filter(a => a.triggered),
  };
}
