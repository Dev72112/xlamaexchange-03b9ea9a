import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface FavoritePair {
  from: string;
  to: string;
  fromName: string;
  toName: string;
  fromImage: string;
  toImage: string;
  displayFrom?: string;
  displayTo?: string;
}

const STORAGE_KEY = 'xlama_favorite_pairs';

function getPairKey(pair: FavoritePair): string {
  return `${pair.from}-${pair.to}`;
}

export function useFavoritePairs() {
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<FavoritePair[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load favorite pairs:', e);
    }
    return [];
  });

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch (e) {
      console.error('Failed to save favorite pairs:', e);
    }
  }, [favorites]);

  const addFavorite = useCallback((pair: FavoritePair) => {
    const key = getPairKey(pair);
    setFavorites(prev => {
      if (prev.find(p => getPairKey(p) === key)) {
        return prev;
      }
      return [...prev, pair];
    });
    toast({
      title: "Added to Favorites",
      description: `${pair.fromName} → ${pair.toName} is now in your favorites`,
    });
  }, [toast]);

  const removeFavorite = useCallback((pair: FavoritePair) => {
    setFavorites(prev => prev.filter(p => getPairKey(p) !== getPairKey(pair)));
    toast({
      title: "Removed from Favorites",
      description: `${pair.fromName} → ${pair.toName} removed from favorites`,
    });
  }, [toast]);

  const toggleFavorite = useCallback((pair: FavoritePair) => {
    const key = getPairKey(pair);
    const exists = favorites.find(p => getPairKey(p) === key);
    if (exists) {
      removeFavorite(pair);
    } else {
      addFavorite(pair);
    }
  }, [favorites, addFavorite, removeFavorite]);

  const isFavorite = useCallback((from: string, to: string) => {
    return favorites.some(p => p.from === from && p.to === to);
  }, [favorites]);

  return { 
    favorites, 
    addFavorite, 
    removeFavorite, 
    toggleFavorite, 
    isFavorite,
    getPairKey 
  };
}
