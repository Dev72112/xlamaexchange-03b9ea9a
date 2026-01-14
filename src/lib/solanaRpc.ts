// Solana RPC Failover Manager
// Provides multiple RPC endpoints with automatic failover and health checks

import { Connection } from '@solana/web3.js';

// RPC endpoint configuration with priority
interface RpcEndpoint {
  url: string;
  name: string;
  priority: number;
  isHealthy: boolean;
  lastError?: Date;
}

// Get Alchemy key from environment
const ALCHEMY_KEY = import.meta.env.VITE_ALCHEMY_API_KEY?.toString()?.trim()?.replace(/^["']|["']$/g, '') || '';

// RPC endpoints in priority order
const RPC_ENDPOINTS: RpcEndpoint[] = [
  // Primary: Alchemy (most reliable, rate-limited to your account)
  ...(ALCHEMY_KEY ? [{
    url: `https://solana-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
    name: 'Alchemy',
    priority: 1,
    isHealthy: true,
  }] : []),
  // Fallback 1: Official Solana RPC
  {
    url: 'https://api.mainnet-beta.solana.com',
    name: 'Solana Official',
    priority: 2,
    isHealthy: true,
  },
  // Fallback 2: Ankr public RPC
  {
    url: 'https://rpc.ankr.com/solana',
    name: 'Ankr',
    priority: 3,
    isHealthy: true,
  },
  // Fallback 3: PublicNode
  {
    url: 'https://solana-rpc.publicnode.com',
    name: 'PublicNode',
    priority: 4,
    isHealthy: true,
  },
];

// Track endpoint health
const endpointHealth: Map<string, RpcEndpoint> = new Map(
  RPC_ENDPOINTS.map(e => [e.url, { ...e }])
);

// Connection cache to avoid creating new connections
const connectionCache: Map<string, Connection> = new Map();

/**
 * Mark an endpoint as unhealthy after a failure
 */
function markEndpointUnhealthy(url: string): void {
  const endpoint = endpointHealth.get(url);
  if (endpoint) {
    endpoint.isHealthy = false;
    endpoint.lastError = new Date();
    console.warn(`[Solana RPC] Marked ${endpoint.name} as unhealthy`);
  }
}

/**
 * Mark an endpoint as healthy after a successful request
 */
function markEndpointHealthy(url: string): void {
  const endpoint = endpointHealth.get(url);
  if (endpoint) {
    endpoint.isHealthy = true;
    endpoint.lastError = undefined;
  }
}

/**
 * Get the best available RPC endpoint
 * Returns healthy endpoints first, sorted by priority
 */
function getBestEndpoint(): RpcEndpoint | null {
  const endpoints = Array.from(endpointHealth.values());
  
  // First try healthy endpoints
  const healthy = endpoints.filter(e => e.isHealthy).sort((a, b) => a.priority - b.priority);
  if (healthy.length > 0) {
    return healthy[0];
  }
  
  // If all unhealthy, try the one that failed longest ago
  const byLastError = endpoints.sort((a, b) => {
    if (!a.lastError) return -1;
    if (!b.lastError) return 1;
    return a.lastError.getTime() - b.lastError.getTime();
  });
  
  return byLastError[0] || null;
}

/**
 * Get a Solana connection with automatic failover
 * Uses cached connections when possible
 */
export function getSolanaConnection(): Connection | null {
  const endpoint = getBestEndpoint();
  if (!endpoint) {
    console.error('[Solana RPC] No RPC endpoints available');
    return null;
  }
  
  // Check cache
  let connection = connectionCache.get(endpoint.url);
  if (!connection) {
    connection = new Connection(endpoint.url, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 90000, // 90 seconds
    });
    connectionCache.set(endpoint.url, connection);
    console.log(`[Solana RPC] Created connection to ${endpoint.name}`);
  }
  
  return connection;
}

/**
 * Execute a Solana RPC call with automatic failover
 * Will try each endpoint until one succeeds
 */
export async function withSolanaRpcFailover<T>(
  operation: (connection: Connection) => Promise<T>
): Promise<T> {
  const endpoints = Array.from(endpointHealth.values()).sort((a, b) => {
    // Healthy first, then by priority
    if (a.isHealthy !== b.isHealthy) return a.isHealthy ? -1 : 1;
    return a.priority - b.priority;
  });
  
  let lastError: Error | null = null;
  
  for (const endpoint of endpoints) {
    try {
      let connection = connectionCache.get(endpoint.url);
      if (!connection) {
        connection = new Connection(endpoint.url, 'confirmed');
        connectionCache.set(endpoint.url, connection);
      }
      
      const result = await operation(connection);
      markEndpointHealthy(endpoint.url);
      return result;
    } catch (err: any) {
      console.warn(`[Solana RPC] ${endpoint.name} failed:`, err?.message?.slice(0, 80));
      markEndpointUnhealthy(endpoint.url);
      lastError = err;
    }
  }
  
  throw lastError || new Error('All Solana RPC endpoints failed');
}

/**
 * Get connection health status for debugging
 */
export function getRpcHealthStatus(): Array<{
  name: string;
  url: string;
  isHealthy: boolean;
  lastError?: string;
}> {
  return Array.from(endpointHealth.values()).map(e => ({
    name: e.name,
    url: e.url.replace(/\/v2\/.*/, '/v2/***'), // Hide API keys
    isHealthy: e.isHealthy,
    lastError: e.lastError?.toISOString(),
  }));
}

/**
 * Reset all endpoints to healthy (for manual recovery)
 */
export function resetRpcHealth(): void {
  endpointHealth.forEach(e => {
    e.isHealthy = true;
    e.lastError = undefined;
  });
  console.log('[Solana RPC] Reset all endpoints to healthy');
}

/**
 * Warm up connections by testing each endpoint
 */
export async function warmupConnections(): Promise<void> {
  console.log('[Solana RPC] Warming up connections...');
  
  for (const endpoint of RPC_ENDPOINTS) {
    try {
      const connection = new Connection(endpoint.url, 'confirmed');
      await connection.getSlot();
      connectionCache.set(endpoint.url, connection);
      markEndpointHealthy(endpoint.url);
      console.log(`[Solana RPC] ${endpoint.name}: OK`);
    } catch (err: any) {
      markEndpointUnhealthy(endpoint.url);
      console.warn(`[Solana RPC] ${endpoint.name}: Failed - ${err?.message?.slice(0, 50)}`);
    }
  }
}

/**
 * Get the primary Alchemy URL (for components that need direct access)
 */
export function getAlchemySolanaUrl(): string | null {
  if (!ALCHEMY_KEY) return null;
  return `https://solana-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;
}
