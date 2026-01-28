/**
 * NFT Gallery Component
 * Displays NFT holdings with collection grouping and floor prices
 */

import React, { memo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Image, 
  Grid3X3, 
  List, 
  ExternalLink,
  ChevronDown,
  ChevronUp 
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Define NFT type locally (no longer depends on Zerion)
export interface NFT {
  id: string;
  collection: string;
  collectionIcon?: string | null;
  name: string;
  floorPrice: number;
  chainId: string;
  imageUrl?: string | null;
  lastSalePrice?: number | null;
}

export interface NFTCollection {
  name: string;
  icon: string | null;
  nfts: NFT[];
  totalFloorValue: number;
  count: number;
}

interface NFTGalleryProps {
  collections: NFTCollection[];
  totalFloorValue: number;
  totalCount: number;
  isLoading?: boolean;
  className?: string;
}

type ViewMode = 'grid' | 'list';

export const NFTGallery = memo(function NFTGallery({ 
  collections,
  totalFloorValue,
  totalCount,
  isLoading,
  className 
}: NFTGalleryProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const toggleCollection = (name: string) => {
    setExpandedCollections(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleImageError = (nftId: string) => {
    setImageErrors(prev => new Set(prev).add(nftId));
  };

  const formatValue = (value: number) => {
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <Card className={cn("glass-card", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            NFT Gallery
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-square rounded-lg overflow-hidden">
                <Skeleton className="h-full w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (collections.length === 0) {
    return (
      <Card className={cn("glass-card", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            NFT Gallery
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Image className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No NFTs found</p>
            <p className="text-sm mt-1">Your NFT collection will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("glass-card", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            NFT Gallery
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {totalCount} NFTs • {formatValue(totalFloorValue)}
            </Badge>
            <div className="flex rounded-lg border border-border/50 overflow-hidden">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 px-2 rounded-none",
                  viewMode === 'grid' && "bg-primary/20"
                )}
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 px-2 rounded-none",
                  viewMode === 'list' && "bg-primary/20"
                )}
                onClick={() => setViewMode('list')}
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {collections.map(collection => {
          const isExpanded = expandedCollections.has(collection.name);
          
          return (
            <div key={collection.name} className="rounded-lg border border-border/50 overflow-hidden">
              {/* Collection Header */}
              <Button
                variant="ghost"
                className="w-full justify-between p-3 h-auto hover:bg-muted/50"
                onClick={() => toggleCollection(collection.name)}
              >
                <div className="flex items-center gap-3">
                  {collection.icon ? (
                    <img 
                      src={collection.icon} 
                      alt={collection.name}
                      className="h-8 w-8 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Image className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className="text-left">
                    <div className="font-medium">{collection.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {collection.count} item{collection.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-semibold">{formatValue(collection.totalFloorValue)}</div>
                    <div className="text-xs text-muted-foreground">Floor Value</div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </Button>

              {/* Expanded NFTs */}
              {isExpanded && (
                <div className="border-t border-border/50 bg-muted/20 p-3">
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {collection.nfts.map(nft => (
                        <div 
                          key={nft.id}
                          className="group relative aspect-square rounded-lg overflow-hidden bg-muted/30"
                        >
                          {nft.imageUrl && !imageErrors.has(nft.id) ? (
                            <img
                              src={nft.imageUrl}
                              alt={nft.name}
                              className="h-full w-full object-cover transition-transform group-hover:scale-105"
                              loading="lazy"
                              onError={() => handleImageError(nft.id)}
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <Image className="h-8 w-8 text-muted-foreground/30" />
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                            <div className="text-white text-xs font-medium truncate">{nft.name}</div>
                            <div className="text-white/70 text-[10px]">
                              Floor: {formatValue(nft.floorPrice)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {collection.nfts.map(nft => (
                        <div 
                          key={nft.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-background/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted/30">
                              {nft.imageUrl && !imageErrors.has(nft.id) ? (
                                <img
                                  src={nft.imageUrl}
                                  alt={nft.name}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                  onError={() => handleImageError(nft.id)}
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                  <Image className="h-4 w-4 text-muted-foreground/30" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-sm">{nft.name}</div>
                              <div className="text-xs text-muted-foreground">{nft.chainId}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-sm">{formatValue(nft.floorPrice)}</div>
                            {nft.lastSalePrice && (
                              <div className="text-xs text-muted-foreground">
                                Last: {formatValue(nft.lastSalePrice)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
});
