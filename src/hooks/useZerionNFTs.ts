/**
 * Hook for fetching Zerion NFT portfolio data
 * Respects DataSource context for enabling/disabling
 */

import { useQuery } from '@tanstack/react-query';
import { zerionService, ZerionNFT } from '@/services/zerion';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { useDataSource } from '@/contexts/DataSourceContext';
import { useMemo } from 'react';

export interface NFTCollection {
  name: string;
  icon: string | null;
  nfts: ZerionNFT[];
  totalFloorValue: number;
  count: number;
}

export interface UseZerionNFTsResult {
  nfts: ZerionNFT[];
  collections: NFTCollection[];
  totalFloorValue: number;
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useZerionNFTs(): UseZerionNFTsResult {
  const { isConnected, activeAddress, activeChainType } = useMultiWallet();
  const { isZerionEnabled } = useDataSource();
  
  // Only enable for EVM chains when Zerion is enabled in DataSource
  const isEvm = activeChainType === 'evm';
  const shouldFetch = isConnected && !!activeAddress && isZerionEnabled && isEvm;
  
  const address = activeAddress || '';

  const nftsQuery = useQuery({
    queryKey: ['zerion', 'nfts', address],
    queryFn: () => zerionService.getNFTPortfolio(address, { pageSize: 100 }),
    enabled: shouldFetch,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  const nfts = nftsQuery.data || [];

  // Group NFTs by collection
  const collections = useMemo(() => {
    const collectionMap = new Map<string, NFTCollection>();
    
    for (const nft of nfts) {
      const existing = collectionMap.get(nft.collection);
      if (existing) {
        existing.nfts.push(nft);
        existing.totalFloorValue += nft.floorPrice;
        existing.count++;
      } else {
        collectionMap.set(nft.collection, {
          name: nft.collection,
          icon: nft.collectionIcon,
          nfts: [nft],
          totalFloorValue: nft.floorPrice,
          count: 1,
        });
      }
    }
    
    // Sort by total floor value descending
    return Array.from(collectionMap.values()).sort((a, b) => b.totalFloorValue - a.totalFloorValue);
  }, [nfts]);

  const totalFloorValue = useMemo(() => 
    nfts.reduce((sum, nft) => sum + nft.floorPrice, 0), 
    [nfts]
  );

  return {
    nfts,
    collections,
    totalFloorValue,
    totalCount: nfts.length,
    isLoading: nftsQuery.isLoading,
    isError: nftsQuery.isError,
    error: nftsQuery.error || null,
    refetch: nftsQuery.refetch,
  };
}
