import { useState, useEffect, useCallback } from 'react';

const FAVORITES_KEY = 'xlama_favorite_currencies';

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const addFavorite = useCallback((ticker: string) => {
    setFavorites(prev => {
      if (prev.includes(ticker.toLowerCase())) return prev;
      return [...prev, ticker.toLowerCase()];
    });
  }, []);

  const removeFavorite = useCallback((ticker: string) => {
    setFavorites(prev => prev.filter(t => t !== ticker.toLowerCase()));
  }, []);

  const toggleFavorite = useCallback((ticker: string) => {
    const lowerTicker = ticker.toLowerCase();
    setFavorites(prev => 
      prev.includes(lowerTicker) 
        ? prev.filter(t => t !== lowerTicker)
        : [...prev, lowerTicker]
    );
  }, []);

  const isFavorite = useCallback((ticker: string) => {
    return favorites.includes(ticker.toLowerCase());
  }, [favorites]);

  return { favorites, addFavorite, removeFavorite, toggleFavorite, isFavorite };
}
