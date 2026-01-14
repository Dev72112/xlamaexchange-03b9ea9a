import { useState, useEffect, useCallback, useRef } from 'react';
import { okxDexService } from '@/services/okxdex';
import { useToast } from '@/hooks/use-toast';
import { playSuccessSound } from '@/lib/sounds';
import { notificationService } from '@/services/notificationService';

const ALERTS_KEY = 'xlama_dex_price_alerts';

export interface DexPriceAlert {
  id: string;
  chainIndex: string;
  tokenContractAddress: string;
  tokenSymbol: string;
  tokenLogoUrl: string;
  targetPrice: number;
  condition: 'above' | 'below';
  createdAt: number;
  triggered: boolean;
  triggeredAt?: number;
  currentPrice?: number;
}

export function useDexPriceAlerts() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<DexPriceAlert[]>(() => {
    try {
      const stored = localStorage.getItem(ALERTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  
  const [isChecking, setIsChecking] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  // Track alerts length separately to avoid re-creating checkPrices
  const alertsRef = useRef<DexPriceAlert[]>(alerts);
  
  // Keep ref in sync with state
  useEffect(() => {
    alertsRef.current = alerts;
  }, [alerts]);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
  }, [alerts]);

  // Check prices and trigger alerts - use ref to avoid infinite loop
  const checkPrices = useCallback(async () => {
    const currentAlerts = alertsRef.current;
    const activeAlerts = currentAlerts.filter(a => !a.triggered);
    if (activeAlerts.length === 0) return;

    setIsChecking(true);

    try {
      const updatedAlerts = await Promise.all(
        currentAlerts.map(async (alert) => {
          if (alert.triggered) return alert;

          try {
            const priceInfo = await okxDexService.getTokenPriceInfo(
              alert.chainIndex,
              alert.tokenContractAddress
            );

            if (!priceInfo?.price) return alert;

            const currentPrice = parseFloat(priceInfo.price);
            const shouldTrigger = 
              (alert.condition === 'above' && currentPrice >= alert.targetPrice) ||
              (alert.condition === 'below' && currentPrice <= alert.targetPrice);

            if (shouldTrigger) {
              // Push to Notification Center
              notificationService.notifyPriceAlert(
                alert.tokenSymbol,
                alert.condition,
                alert.targetPrice,
                currentPrice
              );
              
              // Show notification
              toast({
                title: `🔔 Price Alert: ${alert.tokenSymbol}`,
                description: `${alert.tokenSymbol} is now ${alert.condition} $${alert.targetPrice.toFixed(4)}. Current: $${currentPrice.toFixed(4)}`,
                duration: 10000,
              });
              
              playSuccessSound();

              // Request browser notification if permitted
              if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                new Notification(`Price Alert: ${alert.tokenSymbol}`, {
                  body: `${alert.tokenSymbol} is now ${alert.condition} $${alert.targetPrice.toFixed(4)}`,
                  icon: alert.tokenLogoUrl,
                });
              }

              return {
                ...alert,
                triggered: true,
                triggeredAt: Date.now(),
                currentPrice,
              };
            }

            return { ...alert, currentPrice };
          } catch {
            return alert;
          }
        })
      );

      setAlerts(updatedAlerts);
    } finally {
      setIsChecking(false);
    }
  }, [toast]); // Remove alerts from dependencies - use ref instead

  // Start price checking interval - only depend on activeAlerts count
  useEffect(() => {
    const activeCount = alerts.filter(a => !a.triggered).length;
    
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (activeCount === 0) {
      return;
    }

    // Check immediately
    checkPrices();

    // Then check every 30 seconds
    intervalRef.current = setInterval(checkPrices, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [checkPrices, alerts.filter(a => !a.triggered).length]);

  // Request notification permission
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const createAlert = useCallback((
    token: {
      chainIndex: string;
      tokenContractAddress: string;
      tokenSymbol: string;
      tokenLogoUrl: string;
    },
    targetPrice: number,
    condition: 'above' | 'below'
  ) => {
    const newAlert: DexPriceAlert = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      chainIndex: token.chainIndex,
      tokenContractAddress: token.tokenContractAddress,
      tokenSymbol: token.tokenSymbol,
      tokenLogoUrl: token.tokenLogoUrl,
      targetPrice,
      condition,
      createdAt: Date.now(),
      triggered: false,
    };

    setAlerts(prev => [...prev, newAlert]);
    
    toast({
      title: "Price Alert Created",
      description: `Alert set for ${token.tokenSymbol} when price goes ${condition} $${targetPrice.toFixed(4)}`,
    });

    return newAlert;
  }, [toast]);

  const deleteAlert = useCallback((alertId: string) => {
    setAlerts(prev => {
      const updated = prev.filter(a => a.id !== alertId);
      // Immediately persist to localStorage
      localStorage.setItem(ALERTS_KEY, JSON.stringify(updated));
      return updated;
    });
    
    toast({
      title: "Alert Deleted",
      description: "Price alert has been removed.",
    });
  }, [toast]);

  const clearTriggeredAlerts = useCallback(() => {
    setAlerts(prev => {
      const updated = prev.filter(a => !a.triggered);
      localStorage.setItem(ALERTS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getAlertsForToken = useCallback((chainIndex: string, tokenContractAddress: string) => {
    return alerts.filter(
      a => a.chainIndex === chainIndex && 
           a.tokenContractAddress.toLowerCase() === tokenContractAddress.toLowerCase()
    );
  }, [alerts]);

  const activeAlerts = alerts.filter(a => !a.triggered);
  const triggeredAlerts = alerts.filter(a => a.triggered);

  return {
    alerts,
    activeAlerts,
    triggeredAlerts,
    isChecking,
    createAlert,
    deleteAlert,
    clearTriggeredAlerts,
    getAlertsForToken,
    checkPrices,
  };
}
