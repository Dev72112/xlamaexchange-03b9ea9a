/**
 * Hyperliquid WebSocket Hook
 * 
 * Real-time price updates via WebSocket connection
 * Hardened against stale closures and reconnect loops
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = 'wss://api.hyperliquid.xyz/ws';

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
  const coinsRef = useRef<string[]>(coins);
  
  // Keep coins ref updated to avoid stale closure
  useEffect(() => {
    coinsRef.current = coins;
  }, [coins]);

  const connect = useCallback(() => {
    // Prevent multiple connections
    if (wsRef.current?.readyState === WebSocket.OPEN || 
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

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
            const mids = message.data.mids;
            const currentCoins = coinsRef.current;
            
            // Use functional update to avoid stale closure
            setPrices(prevPrices => {
              const newPrices = new Map(prevPrices);
              let hasChanges = false;
              
              Object.entries(mids).forEach(([coin, midPrice]) => {
                if (currentCoins.includes(coin)) {
                  const newPrice = parseFloat(midPrice as string);
                  const existing = newPrices.get(coin);
                  if (!existing || existing.price !== newPrice) {
                    newPrices.set(coin, {
                      coin,
                      price: newPrice,
                      timestamp: Date.now(),
                    });
                    hasChanges = true;
                  }
                }
              });
              
              return hasChanges ? newPrices : prevPrices;
            });
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
        wsRef.current = null;
        
        // Reconnect after 5 seconds
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      };
    } catch (err) {
      // Silently fail - WebSocket not critical
      console.warn('[Hyperliquid WS] Connection failed:', err);
    }
  }, []); // No dependencies - uses refs internally

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

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
  const coinRef = useRef(coin);
  
  // Keep coin ref updated
  useEffect(() => {
    coinRef.current = coin;
  }, [coin]);

  useEffect(() => {
    if (!coin) return;

    const connect = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN ||
          wsRef.current?.readyState === WebSocket.CONNECTING) {
        return;
      }
      
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log(`[Hyperliquid WS] Subscribed to ${coinRef.current}`);
          ws.send(JSON.stringify({
            method: 'subscribe',
            subscription: { type: 'allMids' }
          }));
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            if (message.channel === 'allMids' && message.data?.mids) {
              const midPrice = message.data.mids[coinRef.current];
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
          wsRef.current = null;
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
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
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [coin]);

  return { price, lastUpdate, isLive: Date.now() - lastUpdate < 10000 };
}
