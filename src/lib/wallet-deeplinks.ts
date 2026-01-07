// Deep-link utilities for mobile wallet connections

export interface DeeplinkConfig {
  id: string;
  name: string;
  deeplink: (dappUrl: string) => string;
  universalLink?: (dappUrl: string) => string;
}

// Detect if running in a mobile browser (not inside a wallet's in-app browser)
export function isMobileBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}

// Detect if running inside a wallet's in-app browser
export function isInWalletBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check for various wallet browser indicators
  return !!(
    window.okxwallet ||
    (window.ethereum && (window.ethereum as any).isOKXWallet) ||
    (window.ethereum && (window.ethereum as any).isMetaMask) ||
    window.tronWeb ||
    window.tronLink ||
    (window as any).phantom?.solana ||
    (window as any).solflare
  );
}

// Check if running inside OKX app browser specifically
export function isInOkxBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.okxwallet || (window.ethereum && (window.ethereum as any).isOKXWallet));
}

// Check if OKX wallet extension is available (desktop)
export function isOkxExtensionAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.okxwallet || (window.ethereum && (window.ethereum as any).isOKXWallet));
}

// Smart routing: determine best connection method
export type ConnectionMethod = 'okx-extension' | 'okx-deeplink' | 'okx-universal' | 'reown';

export function getRecommendedConnectionMethod(): ConnectionMethod {
  // If in OKX browser, use extension directly
  if (isInOkxBrowser()) return 'okx-extension';
  
  // If OKX extension available on desktop, use it
  if (isOkxExtensionAvailable() && !isMobileBrowser()) return 'okx-extension';
  
  // Mobile external browser: use deep link to OKX app
  if (isMobileBrowser() && !isInWalletBrowser()) return 'okx-deeplink';
  
  // Desktop without OKX: use Universal Provider (QR code)
  if (!isMobileBrowser()) return 'okx-universal';
  
  // Fallback to Reown
  return 'reown';
}

// Open OKX app via deep link
export function openOkxDeeplink(): void {
  const dappUrl = encodeURIComponent(window.location.href);
  const deeplink = `okx://wallet/dapp/url?dappUrl=${dappUrl}`;
  const universalLink = `https://www.okx.com/download?deeplink=${encodeURIComponent(deeplink)}`;
  
  // Try deep link first, fall back to universal
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  window.location.href = isIOS ? universalLink : deeplink;
}

// Check if a specific EVM wallet is available
export function isEvmWalletAvailable(walletId: string): boolean {
  if (typeof window === 'undefined') return false;
  
  switch (walletId) {
    case 'okx':
      return !!(window.okxwallet || (window.ethereum && (window.ethereum as any).isOKXWallet));
    case 'metamask':
      return !!(window.ethereum && (window.ethereum as any).isMetaMask);
    default:
      return !!window.ethereum;
  }
}

// Check if Solana wallet is available
export function isSolanaWalletAvailable(walletId: string): boolean {
  if (typeof window === 'undefined') return false;
  
  switch (walletId) {
    case 'phantom':
      // Check for Phantom specifically with isPhantom flag
      return !!(window as any).phantom?.solana?.isPhantom;
    case 'solflare':
      // Check for Solflare with isSolflare flag
      return !!((window as any).solflare?.isSolflare);
    default:
      return !!((window as any).phantom?.solana?.isPhantom || (window as any).solflare?.isSolflare);
  }
}

// Check if Tron wallet is available
export function isTronWalletAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.tronLink || window.tronWeb);
}

// Get the current page URL for deep-links
export function getCurrentDappUrl(): string {
  if (typeof window === 'undefined') return '';
  return window.location.href;
}

// Wallet deep-link configurations
export const walletDeeplinks: Record<string, DeeplinkConfig> = {
  // EVM Wallets
  okx: {
    id: 'okx',
    name: 'OKX Wallet',
    deeplink: (dappUrl: string) => 
      `okx://wallet/dapp/url?dappUrl=${encodeURIComponent(dappUrl)}`,
    universalLink: (dappUrl: string) => 
      `https://www.okx.com/download?deeplink=${encodeURIComponent(`okx://wallet/dapp/url?dappUrl=${encodeURIComponent(dappUrl)}`)}`,
  },
  metamask: {
    id: 'metamask',
    name: 'MetaMask',
    deeplink: (dappUrl: string) => {
      // MetaMask uses a different format - strip the protocol
      const urlWithoutProtocol = dappUrl.replace(/^https?:\/\//, '');
      return `https://metamask.app.link/dapp/${urlWithoutProtocol}`;
    },
    universalLink: (dappUrl: string) => {
      const urlWithoutProtocol = dappUrl.replace(/^https?:\/\//, '');
      return `https://metamask.app.link/dapp/${urlWithoutProtocol}`;
    },
  },
  
  // Solana Wallets
  phantom: {
    id: 'phantom',
    name: 'Phantom',
    deeplink: (dappUrl: string) => 
      `phantom://browse/${encodeURIComponent(dappUrl)}`,
    universalLink: (dappUrl: string) => 
      `https://phantom.app/ul/browse/${encodeURIComponent(dappUrl)}`,
  },
  solflare: {
    id: 'solflare',
    name: 'Solflare',
    deeplink: (dappUrl: string) => 
      `solflare://browse?url=${encodeURIComponent(dappUrl)}`,
    universalLink: (dappUrl: string) => 
      `https://solflare.com/ul/browse?url=${encodeURIComponent(dappUrl)}`,
  },
  
  // Tron Wallets
  tronlink: {
    id: 'tronlink',
    name: 'TronLink',
    deeplink: (dappUrl: string) => {
      // Use tronlinkoutside protocol for proper dApp connection
      const params = {
        url: dappUrl,
        action: 'open',
        protocol: 'tronlink',
        version: '1.0',
      };
      return `tronlinkoutside://pull.activity?param=${encodeURIComponent(JSON.stringify(params))}`;
    },
    universalLink: (dappUrl: string) => 
      `https://link.tronlink.org/dapp?url=${encodeURIComponent(dappUrl)}`,
  },
  tokenpocket: {
    id: 'tokenpocket',
    name: 'TokenPocket',
    deeplink: (dappUrl: string) => 
      `tpoutside://open?params=${encodeURIComponent(JSON.stringify({ url: dappUrl }))}`,
    universalLink: (dappUrl: string) => 
      `https://tokenpocket.pro/mobile?url=${encodeURIComponent(dappUrl)}`,
  },
};

// Open wallet via deep-link
export function openWalletDeeplink(walletId: string): boolean {
  const config = walletDeeplinks[walletId];
  if (!config) return false;
  
  const dappUrl = getCurrentDappUrl();
  
  // Try universal link first on iOS (more reliable), then deep-link
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const link = isIOS && config.universalLink 
    ? config.universalLink(dappUrl) 
    : config.deeplink(dappUrl);
  
  // Attempt to open the wallet
  window.location.href = link;
  return true;
}

// Get install URL for a wallet
export function getWalletInstallUrl(walletId: string): string {
  const installUrls: Record<string, string> = {
    okx: 'https://www.okx.com/web3',
    metamask: 'https://metamask.io/download/',
    phantom: 'https://phantom.app/download',
    solflare: 'https://solflare.com/download',
    tronlink: 'https://www.tronlink.org/dlDetails/',
    tokenpocket: 'https://www.tokenpocket.pro/en/download/app',
    'sui-wallet': 'https://chrome.google.com/webstore/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil',
    tonkeeper: 'https://tonkeeper.com/',
  };
  
  return installUrls[walletId] || '#';
}
