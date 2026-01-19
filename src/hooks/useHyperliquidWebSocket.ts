/**
 * Hyperliquid WebSocket Hook
 * 
 * Real-time price updates via WebSocket connection
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = 'wss://api.hyperliquid.xyz/ws';

interface WebSocketMessage {
  channel: string;
  data: any;
}

interface PriceTick {
  coin: string;
  price: number;
  timestamp: number;
}

export function useHyperliquidWebSocket(coins: string[]) {
  const [prices, setPrices] = useState<Map<string, PriceTick>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscribedCoinsRef = useRef<Set<string>>(new Set());

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Hyperliquid WS] Connected');
        setIsConnected(true);
        
        // Subscribe to allMids for real-time price updates
        try {
          ws.send(JSON.stringify({
            method: 'subscribe',
            subscription: { type: 'allMids' }
          }));
        } catch (sendErr) {
          console.warn('[Hyperliquid WS] Send error:', sendErr);
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.channel === 'allMids' && message.data?.mids) {
            const newPrices = new Map(prices);
            const mids = message.data.mids;
            
            Object.entries(mids).forEach(([coin, midPrice]) => {
              if (coins.includes(coin)) {
                newPrices.set(coin, {
                  coin,
                  price: parseFloat(midPrice as string),
                  timestamp: Date.now(),
                });
              }
            });
            
            setPrices(newPrices);
          }
        } catch (err) {
          // Silently ignore parse errors
        }
      };

      ws.onerror = () => {
        // Silently handle errors - will reconnect automatically
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        
        // Reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      };
    } catch (err) {
      // Silently fail - WebSocket not critical
      console.warn('[Hyperliquid WS] Connection failed:', err);
    }
  }, [coins, prices]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, []);

  // Get price for a specific coin
  const getPrice = useCallback((coin: string): number => {
    return prices.get(coin)?.price ?? 0;
  }, [prices]);

  // Get all prices as object
  const getAllPrices = useCallback((): Record<string, number> => {
    const result: Record<string, number> = {};
    prices.forEach((tick, coin) => {
      result[coin] = tick.price;
    });
    return result;
  }, [prices]);

  return {
    prices,
    isConnected,
    getPrice,
    getAllPrices,
    reconnect: connect,
  };
}

/**
 * Hook for subscribing to a single coin's real-time price
 */
export function useHyperliquidPrice(coin: string) {
  const [price, setPrice] = useState<number>(0);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!coin) return;

    const connect = () => {
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log(`[Hyperliquid WS] Subscribed to ${coin}`);
          ws.send(JSON.stringify({
            method: 'subscribe',
            subscription: { type: 'allMids' }
          }));
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            if (message.channel === 'allMids' && message.data?.mids) {
              const midPrice = message.data.mids[coin];
              if (midPrice !== undefined) {
                setPrice(parseFloat(midPrice));
                setLastUpdate(Date.now());
              }
            }
          } catch (err) {
            // Ignore parse errors
          }
        };

        ws.onclose = () => {
          reconnectTimeoutRef.current = setTimeout(connect, 5000);
        };
      } catch (err) {
        console.error('[Hyperliquid WS] Failed:', err);
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [coin]);

  return { price, lastUpdate, isLive: Date.now() - lastUpdate < 10000 };
}
