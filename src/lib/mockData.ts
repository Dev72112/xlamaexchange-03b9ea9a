/**
 * Mock data for debug mode testing
 * Provides realistic sample data for wallet-gated features
 */

import { WalletTokenBalance } from '@/services/okxdex';
import { XlamaPortfolio, TokenHolding } from '@/services/xlamaApi';

export const MOCK_WALLET_ADDRESS = '0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe';

export const MOCK_BALANCES: WalletTokenBalance[] = [
  {
    chainIndex: '1',
    tokenContractAddress: '',
    address: MOCK_WALLET_ADDRESS,
    symbol: 'ETH',
    balance: '2.5432',
    rawBalance: '2543200000000000000',
    tokenPrice: '3245.67',
    isRiskToken: false,
  },
  {
    chainIndex: '1',
    tokenContractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    address: MOCK_WALLET_ADDRESS,
    symbol: 'USDC',
    balance: '5000.00',
    rawBalance: '5000000000',
    tokenPrice: '1.00',
    isRiskToken: false,
  },
  {
    chainIndex: '1',
    tokenContractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    address: MOCK_WALLET_ADDRESS,
    symbol: 'USDT',
    balance: '2500.00',
    rawBalance: '2500000000',
    tokenPrice: '1.00',
    isRiskToken: false,
  },
  {
    chainIndex: '137',
    tokenContractAddress: '',
    address: MOCK_WALLET_ADDRESS,
    symbol: 'MATIC',
    balance: '1500',
    rawBalance: '1500000000000000000000',
    tokenPrice: '0.85',
    isRiskToken: false,
  },
  {
    chainIndex: '42161',
    tokenContractAddress: '',
    address: MOCK_WALLET_ADDRESS,
    symbol: 'ETH',
    balance: '0.75',
    rawBalance: '750000000000000000',
    tokenPrice: '3245.67',
    isRiskToken: false,
  },
];

export const MOCK_HOLDINGS: TokenHolding[] = MOCK_BALANCES.map(b => ({
  token_address: b.tokenContractAddress || '',
  token_symbol: b.symbol,
  token_name: b.symbol,
  token_logo: null,
  chain_id: b.chainIndex,
  chain_name: getChainName(b.chainIndex),
  balance: b.balance,
  balance_raw: b.rawBalance || '0',
  decimals: 18,
  price_usd: parseFloat(b.tokenPrice || '0'),
  value_usd: parseFloat(b.balance) * parseFloat(b.tokenPrice || '0'),
  price_change_24h: Math.random() * 10 - 5, // Random -5% to +5%
}));

function getChainName(chainIndex: string): string {
  const names: Record<string, string> = {
    '1': 'Ethereum',
    '196': 'X Layer',
    '8453': 'Base',
    '42161': 'Arbitrum',
    '137': 'Polygon',
    '56': 'BNB Chain',
    '43114': 'Avalanche',
    '10': 'Optimism',
    '324': 'zkSync',
    '501': 'Solana',
  };
  return names[chainIndex] || `Chain ${chainIndex}`;
}

export const MOCK_PORTFOLIO: XlamaPortfolio = {
  success: true,
  wallet: MOCK_WALLET_ADDRESS,
  holdings: MOCK_HOLDINGS,
  total_value_usd: MOCK_HOLDINGS.reduce((sum, h) => sum + h.value_usd, 0),
  chain_breakdown: [
    { chain: 'Ethereum', value_usd: 15761.68 },
    { chain: 'Polygon', value_usd: 1275.00 },
    { chain: 'Arbitrum', value_usd: 2434.25 },
  ],
  updated_at: new Date().toISOString(),
};

export const MOCK_TRANSACTIONS = [
  {
    id: 'tx-1',
    tx_hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    from_token_symbol: 'ETH',
    to_token_symbol: 'USDC',
    from_amount: '1.5',
    to_amount: '4868.50',
    chain_index: '1',
    chain_name: 'Ethereum',
    status: 'completed',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    type: 'swap',
  },
  {
    id: 'tx-2',
    tx_hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    from_token_symbol: 'USDC',
    to_token_symbol: 'MATIC',
    from_amount: '500',
    to_amount: '588.24',
    chain_index: '137',
    chain_name: 'Polygon',
    status: 'completed',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    type: 'swap',
  },
];

// Hyperliquid mock data
export const MOCK_HYPERLIQUID_ACCOUNT = {
  equity: '12500.45',
  availableMargin: '8750.32',
  totalPositionValue: '3750.13',
  unrealizedPnl: '245.67',
  marginUsed: '3750.13',
  accountValue: '12746.12',
};

export const MOCK_POSITIONS = [
  {
    coin: 'BTC',
    size: '0.05',
    entryPrice: '67500.00',
    markPrice: '68234.50',
    unrealizedPnl: '36.73',
    leverage: '10',
    liquidationPrice: '61250.00',
    side: 'long',
  },
  {
    coin: 'ETH',
    size: '0.8',
    entryPrice: '3200.00',
    markPrice: '3245.67',
    unrealizedPnl: '36.54',
    leverage: '5',
    liquidationPrice: '2720.00',
    side: 'long',
  },
];
