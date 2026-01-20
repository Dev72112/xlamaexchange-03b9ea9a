/**
 * Wallet Adapters - Barrel Export
 */

// Base adapter
export { BaseAdapter } from './BaseAdapter';

// EVM adapters
export { EvmReownAdapter } from './EvmReownAdapter';

// OKX multi-chain adapter
export { OkxUniversalAdapter } from './OkxUniversalAdapter';

// Chain-specific adapters
export { SolanaAdapter } from './SolanaAdapter';
export { SuiAdapter } from './SuiAdapter';
export { TronAdapter } from './TronAdapter';
export { TonAdapter } from './TonAdapter';

// Factory function for creating adapters
export { createAdapter, type AdapterConfig } from './factory';
