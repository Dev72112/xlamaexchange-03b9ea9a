import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NewsItem {
  id: string;
  title: string;
  body: string;
  url: string;
  imageUrl?: string;
  source: string;
  publishedAt: string;
  categories: string[];
}

export function useCryptoNews(autoRefresh = true) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchNews = useCallback(async (categories?: string[]) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params: Record<string, string> = {};
      if (categories && categories.length > 0) {
        params.categories = categories.join(',');
      }
      
      const { data, error: funcError } = await supabase.functions.invoke('crypto-news', {
        body: params,
      });
      
      if (funcError) throw funcError;
      
      if (data?.news && Array.isArray(data.news)) {
        setNews(data.news);
        setLastFetched(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch crypto news:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch news');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch and auto-refresh every 5 minutes
  useEffect(() => {
    fetchNews();
    
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchNews();
      }, 5 * 60 * 1000); // 5 minutes
      
      return () => clearInterval(interval);
    }
  }, [fetchNews, autoRefresh]);

  // Format relative time
  const getRelativeTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }, []);

  return {
    news,
    isLoading,
    error,
    lastFetched,
    refetch: fetchNews,
    getRelativeTime,
  };
}
