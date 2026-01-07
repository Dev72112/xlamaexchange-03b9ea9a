/**
 * Wallet Feature Components - Barrel Export
 * 
 * Note: Components are re-exported from their original locations
 * for backwards compatibility during migration
 */

// Re-export wallet components from original location
export { MultiWalletButton } from '@/components/wallet/MultiWalletButton';
export { TonWalletPicker } from '@/components/wallet/TonWalletPicker';

// Chain selector is shared between wallet and exchange features
export { ChainSelector } from '@/components/exchange/ChainSelector';
