import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { corsHeaders, securityHeaders, sanitizeInput } from "../_shared/security-headers.ts";

// Combined response headers
const responseHeaders = {
  ...corsHeaders,
  ...securityHeaders,
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
};

interface NewsItem {
  id: string;
  title: string;
  body: string;
  url: string;
  imageUrl?: string;
  source: string;
  publishedAt: string;
  categories: string[];
}

// Fetch news from CryptoCompare API (free tier)
async function fetchCryptoCompareNews(categories?: string[]): Promise<NewsItem[]> {
  try {
    let url = 'https://min-api.cryptocompare.com/data/v2/news/?lang=EN';
    
    if (categories && categories.length > 0) {
      url += `&categories=${categories.join(',')}`;
    }
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`CryptoCompare API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.Data || !Array.isArray(data.Data)) {
      return [];
    }
    
    return data.Data.slice(0, 10).map((item: any) => ({
      id: item.id?.toString() || crypto.randomUUID(),
      title: item.title || 'Untitled',
      body: item.body?.slice(0, 300) + '...' || '',
      url: item.url || '#',
      imageUrl: item.imageurl || null,
      source: item.source_info?.name || item.source || 'Unknown',
      publishedAt: new Date(item.published_on * 1000).toISOString(),
      categories: item.categories?.split('|') || [],
    }));
  } catch (error) {
    console.error('Failed to fetch from CryptoCompare:', error);
    return [];
  }
}

// Fetch trending data from CoinGecko as backup/supplement
async function fetchCoinGeckoTrending(): Promise<NewsItem[]> {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/search/trending', {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Convert trending coins to news-like items
    if (!data.coins || !Array.isArray(data.coins)) {
      return [];
    }
    
    return data.coins.slice(0, 5).map((coin: any) => ({
      id: `trending-${coin.item?.id || crypto.randomUUID()}`,
      title: `${coin.item?.name} (${coin.item?.symbol?.toUpperCase()}) is trending`,
      body: `${coin.item?.name} is currently ranked #${coin.item?.market_cap_rank || 'N/A'} by market cap and is trending on CoinGecko.`,
      url: `https://www.coingecko.com/en/coins/${coin.item?.id}`,
      imageUrl: coin.item?.thumb || null,
      source: 'CoinGecko Trending',
      publishedAt: new Date().toISOString(),
      categories: ['Trending', 'Market'],
    }));
  } catch (error) {
    console.error('Failed to fetch from CoinGecko:', error);
    return [];
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIp = getClientIp(req);

  // Check persistent rate limit (30 req/min for news)
  const rateCheck = await checkRateLimit('crypto-news', clientIp);
  if (!rateCheck.allowed) {
    console.warn(`Rate limit exceeded for crypto-news from ${clientIp}`);
    return rateLimitResponse(corsHeaders);
  }

  try {
    const url = new URL(req.url);
    const categoriesParam = url.searchParams.get('categories');
    const includeTrending = url.searchParams.get('trending') !== 'false';
    
    // Validate and sanitize categories input
    let categories: string[] | undefined;
    if (categoriesParam) {
      // Only allow alphanumeric category names, max 10 categories
      categories = categoriesParam
        .split(',')
        .slice(0, 10)
        .map(c => sanitizeInput(c, 50))
        .filter(c => /^[a-zA-Z0-9\-_]+$/.test(c));
    }
    
    console.log('Fetching crypto news', { categories, includeTrending });
    
    // Fetch news from multiple sources
    const [cryptoCompareNews, trendingNews] = await Promise.all([
      fetchCryptoCompareNews(categories),
      includeTrending ? fetchCoinGeckoTrending() : Promise.resolve([]),
    ]);
    
    // Combine and dedupe news
    const allNews = [...cryptoCompareNews];
    
    // Add trending items if we have few news items
    if (trendingNews.length > 0 && allNews.length < 5) {
      allNews.push(...trendingNews);
    }
    
    // Sort by date (newest first)
    allNews.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    
    console.log(`Returning ${allNews.length} news items`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        news: allNews,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: responseHeaders }
    );

  } catch (error: unknown) {
    console.error('Crypto news edge function error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to fetch news',
        news: [],
      }),
      { status: 500, headers: responseHeaders }
    );
  }
});
