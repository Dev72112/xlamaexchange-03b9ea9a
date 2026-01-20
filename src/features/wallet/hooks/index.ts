/**
 * Wallet Feature Hooks - Barrel Export
 */

// New modular session hook
export {
  useSession,
  useSessionSelector,
  useSessionAddress,
  useIsConnected,
  useSessionEcosystem,
} from './useSession';

// Legacy hooks (will be deprecated)
export { useOkxWallet } from '@/hooks/useOkxWallet';
export { useTonProof } from '@/hooks/useTonProof';
