import { memo, useState } from 'react';
import { useCryptoNews } from '@/hooks/useCryptoNews';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Newspaper, 
  ExternalLink, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp,
  TrendingUp 
} from 'lucide-react';
import { getStaggerStyle, STAGGER_ITEM_CLASS } from '@/lib/staggerAnimation';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const NewsItemSkeleton = () => (
  <div className="flex gap-4 p-4 border border-border rounded-lg">
    <Skeleton className="w-16 h-16 rounded-lg flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-1/4" />
    </div>
  </div>
);

interface NewsCardProps {
  news: {
    id: string;
    title: string;
    body: string;
    url: string;
    imageUrl?: string;
    source: string;
    publishedAt: string;
    categories: string[];
  };
  relativeTime: string;
  index: number;
}

const NewsCard = memo(function NewsCard({ news, relativeTime, index }: NewsCardProps) {
  return (
    <a
      href={news.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex gap-3 sm:gap-4 p-3 sm:p-4 border border-border rounded-lg hover:bg-accent/50 hover:border-primary/20 transition-all group overflow-hidden ${STAGGER_ITEM_CLASS}`}
      style={getStaggerStyle(index, 50)}
    >
      {news.imageUrl && (
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden shrink-0 bg-secondary">
          <img
            src={news.imageUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
      <div className="flex-1 min-w-0 overflow-hidden">
        <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
          {news.title}
        </h4>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
          {news.body}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="secondary" className="text-xs">
            {news.source}
          </Badge>
          <span className="text-xs text-muted-foreground">{relativeTime}</span>
          <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </a>
  );
});

export const CryptoNews = memo(function CryptoNews() {
  const { news, isLoading, refetch, getRelativeTime } = useCryptoNews();
  const [isOpen, setIsOpen] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  return (
    <section className="py-6 sm:py-8 lg:py-12" aria-labelledby="news-heading">
      <div className="container px-4 sm:px-6 overflow-hidden">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <Card className="border-border overflow-hidden w-full sweep-effect shadow-premium-hover performance-critical">
            <CardHeader className="pb-3 sm:pb-4 p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Newspaper className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle id="news-heading" className="text-base sm:text-lg flex items-center gap-2">
                      <span className="truncate">Crypto News</span>
                      <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
                    </CardTitle>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Latest market updates</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="h-8 w-8"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </Button>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>
            </CardHeader>
            
            <CollapsibleContent>
              <CardContent className="pt-0 p-4 sm:p-6 overflow-hidden">
                {isLoading ? (
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                    {[...Array(4)].map((_, i) => (
                      <NewsItemSkeleton key={i} />
                    ))}
                  </div>
                ) : news.length === 0 ? (
                  <div className="text-center py-8">
                    <Newspaper className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No news available right now</p>
                    <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-3">
                      Try Again
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                    {news.slice(0, 6).map((item, index) => (
                      <NewsCard
                        key={item.id}
                        news={item}
                        relativeTime={getRelativeTime(item.publishedAt)}
                        index={index}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </section>
  );
});
