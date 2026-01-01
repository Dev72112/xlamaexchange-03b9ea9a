import { useQuery } from "@tanstack/react-query";

interface DexOverview {
  totalDataChart: [number, number][];
  total24h: number;
  total7d: number;
  total30d: number;
  totalAllTime: number;
  change_1d: number;
  change_7d: number;
  change_1m: number;
  protocols: number;
}

export function useDexStats() {
  return useQuery({
    queryKey: ["dex-stats"],
    queryFn: async (): Promise<DexOverview> => {
      const response = await fetch("https://api.llama.fi/overview/dexs");
      
      if (!response.ok) {
        throw new Error("Failed to fetch DEX stats");
      }
      
      const data = await response.json();
      
      return {
        totalDataChart: data.totalDataChart || [],
        total24h: data.total24h || 0,
        total7d: data.total7d || 0,
        total30d: data.total30d || 0,
        totalAllTime: data.totalAllTime || 0,
        change_1d: data.change_1d || 0,
        change_7d: data.change_7d || 0,
        change_1m: data.change_1m || 0,
        protocols: data.protocols?.length || 0,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000,
  });
}
