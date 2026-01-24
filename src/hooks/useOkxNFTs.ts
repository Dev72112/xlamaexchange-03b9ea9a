/**
 * Hook for fetching NFT portfolio data from OKX API
 * This provides NFT gallery functionality when using OKX as data source
 */

import { useQuery } from '@tanstack/react-query';
import { okxDexService } from '@/services/okxdex';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { useDataSource } from '@/contexts/DataSourceContext';

// OKX NFT types (matching OKX Marketplace API response)
export interface OkxNFT {
  name: string;
  tokenId: string;
  image: string;
  imageThumbnailUrl: string;
  collection: {
    name: string;
    slug: string;
    image: string;
    stats?: {
      floorPrice?: string;
      totalVolume?: string;
    };
  };
  assetContract: {
    chain: string;
    contractAddress: string;
    tokenStandard: string;
  };
}

export interface OkxNFTCollection {
  name: string;
  icon: string;
  count: number;
  totalFloorValue: number;
  nfts: {
    id: string;
    name: string;
    imageUrl: string;
    chainId: string;
    floorPrice: number;
    lastSalePrice?: number;
  }[];
}

// Chains that support NFT listing on OKX
const NFT_SUPPORTED_CHAINS = ['1', '137', '56', '42161', '10']; // Eth, Polygon, BSC, Arb, OP

export function useOkxNFTs() {
  const { evmAddress, isConnected } = useMultiWallet();
  const { isOKXEnabled } = useDataSource();

  const query = useQuery({
    queryKey: ['okx-nfts', evmAddress],
    queryFn: async () => {
      if (!evmAddress) return { collections: [], totalFloorValue: 0, totalCount: 0 };

      const allNfts: OkxNFT[] = [];

      // Fetch NFTs from each supported chain
      for (const chainIndex of NFT_SUPPORTED_CHAINS) {
        try {
          const nfts = await okxDexService.getNFTAssets(chainIndex, evmAddress);
          allNfts.push(...nfts);
        } catch (err) {
          console.warn(`[OKX NFTs] Failed to fetch from chain ${chainIndex}:`, err);
        }
      }

      // Group by collection
      const collectionMap = new Map<string, OkxNFTCollection>();
      let totalFloorValue = 0;

      allNfts.forEach(nft => {
        const collectionName = nft.collection?.name || 'Unknown Collection';
        const floorPrice = parseFloat(nft.collection?.stats?.floorPrice || '0');
        
        if (!collectionMap.has(collectionName)) {
          collectionMap.set(collectionName, {
            name: collectionName,
            icon: nft.collection?.image || '',
            count: 0,
            totalFloorValue: 0,
            nfts: [],
          });
        }

        const collection = collectionMap.get(collectionName)!;
        collection.count++;
        collection.totalFloorValue += floorPrice;
        totalFloorValue += floorPrice;

        collection.nfts.push({
          id: `${nft.assetContract?.contractAddress}-${nft.tokenId}`,
          name: nft.name || `#${nft.tokenId}`,
          imageUrl: nft.imageThumbnailUrl || nft.image,
          chainId: nft.assetContract?.chain || '1',
          floorPrice,
        });
      });

      return {
        collections: Array.from(collectionMap.values()).sort((a, b) => b.totalFloorValue - a.totalFloorValue),
        totalFloorValue,
        totalCount: allNfts.length,
      };
    },
    enabled: isConnected && !!evmAddress && isOKXEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  return {
    collections: query.data?.collections || [],
    totalFloorValue: query.data?.totalFloorValue || 0,
    totalCount: query.data?.totalCount || 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
