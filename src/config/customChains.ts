/**
 * Custom Chain Definitions for Wagmi/Reown
 * 
 * These chains are not included in the default viem/wagmi chain list
 * and need to be manually defined for WalletConnect switching to work.
 */

import { defineChain } from 'viem';

// Sonic (chainId: 146)
export const sonic = defineChain({
  id: 146,
  name: 'Sonic',
  nativeCurrency: { name: 'Sonic', symbol: 'S', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.soniclabs.com'] },
  },
  blockExplorers: {
    default: { name: 'SonicScan', url: 'https://sonicscan.org' },
  },
});

// Unichain (chainId: 130)
export const unichain = defineChain({
  id: 130,
  name: 'Unichain',
  nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://mainnet.unichain.org'] },
  },
  blockExplorers: {
    default: { name: 'UniScan', url: 'https://uniscan.xyz' },
  },
});

// Monad (chainId: 143) - Testnet currently, mainnet coming
export const monad = defineChain({
  id: 143,
  name: 'Monad',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://explorer.monad.xyz' },
  },
});

// Plasma (chainId: 9745)
export const plasma = defineChain({
  id: 9745,
  name: 'Plasma',
  nativeCurrency: { name: 'Plasma', symbol: 'PLASMA', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.plasma.io'] },
  },
  blockExplorers: {
    default: { name: 'Plasma Explorer', url: 'https://explorer.plasma.io' },
  },
});

// X Layer (chainId: 196) - Already in appkit but define for consistency
export const xlayer = defineChain({
  id: 196,
  name: 'X Layer',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.xlayer.tech'] },
  },
  blockExplorers: {
    default: { name: 'X Layer Explorer', url: 'https://www.okx.com/explorer/xlayer' },
  },
});

// Mode (chainId: 34443)
export const mode = defineChain({
  id: 34443,
  name: 'Mode',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://mainnet.mode.network'] },
  },
  blockExplorers: {
    default: { name: 'Mode Explorer', url: 'https://explorer.mode.network' },
  },
});

// HyperEVM (chainId: 999) - Hyperliquid L1
export const hyperEVM = defineChain({
  id: 999,
  name: 'HyperEVM',
  nativeCurrency: { name: 'HYPE', symbol: 'HYPE', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.hyperliquid.xyz/evm'] },
  },
  blockExplorers: {
    default: { name: 'HyperEVMScan', url: 'https://hyperevmscan.io' },
  },
});

// Export all custom chains as array for easy registration
export const customChains = [
  sonic,
  unichain,
  monad,
  plasma,
  xlayer,
  mode,
  hyperEVM,
];
