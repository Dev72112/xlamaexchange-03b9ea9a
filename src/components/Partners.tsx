import { memo } from "react";
import { ExternalLink, Wallet, Shield, Zap, Globe, TrendingUp } from "lucide-react";
import changeNowLogo from "@/assets/changenow-logo.jpg";
import phantomLogo from '@/assets/wallets/phantom-logo.png';
import solflareLogo from '@/assets/wallets/solflare-logo.png';
import suiWalletLogo from '@/assets/wallets/sui-wallet-logo.png';
import tonkeeperLogo from '@/assets/wallets/tonkeeper-logo.jpeg';
import tokenpocketLogo from '@/assets/wallets/tokenpocket-logo.png';
import okxWalletLogo from '@/assets/wallets/okx-wallet-logo.png';
import { getStaggerStyle, STAGGER_ITEM_CLASS } from "@/lib/staggerAnimation";

const walletPartners = [
  { name: "MetaMask", icon: "https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg", url: "https://metamask.io", chain: "EVM" },
  { name: "OKX Wallet", icon: okxWalletLogo, url: "https://www.okx.com/web3", chain: "Multi-chain" },
  { name: "Phantom", icon: phantomLogo, url: "https://phantom.app", chain: "Solana" },
  { name: "Solflare", icon: solflareLogo, url: "https://solflare.com", chain: "Solana" },
  { name: "Sui Wallet", icon: suiWalletLogo, url: "https://sui.io", chain: "Sui" },
  { name: "Tonkeeper", icon: tonkeeperLogo, url: "https://tonkeeper.com", chain: "TON" },
  { name: "TokenPocket", icon: tokenpocketLogo, url: "https://www.tokenpocket.pro", chain: "Multi-chain" },
  { name: "TronLink", icon: "https://www.tronlink.org/images/logo.png", url: "https://www.tronlink.org", chain: "Tron" },
];

const trustBadges = [
  { icon: Shield, label: "Non-Custodial" },
  { icon: Zap, label: "Instant Swaps" },
  { icon: Globe, label: "25+ Networks" },
  { icon: Wallet, label: "526+ Wallets" },
  { icon: TrendingUp, label: "50x Leverage" },
];

export const Partners = memo(function Partners() {
  return (
    <section className="py-16 sm:py-20 border-t border-border" aria-labelledby="partners-heading">
      <div className="container px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 id="partners-heading" className="text-xl sm:text-2xl font-bold mb-2">Powered By</h2>
          <p className="text-sm text-muted-foreground">Trusted technology partners for seamless crypto exchange</p>
        </div>

        {/* Main Partners */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-12 max-w-6xl mx-auto">
          {/* ChangeNow Partner */}
          <a
            href="https://changenow.io"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center gap-3 p-5 sm:p-6 rounded-xl bg-secondary/30 border border-border hover:border-primary/30 hover-lift transition-all sweep-effect shadow-premium-hover performance-critical overflow-hidden"
          >
            <div className="flex items-center gap-3">
              <img
                src={changeNowLogo}
                alt="ChangeNOW exchange API logo"
                loading="lazy"
                decoding="async"
                width="48"
                height="48"
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover shrink-0"
              />
              <div className="text-left min-w-0">
                <span className="font-bold text-lg sm:text-xl">ChangeNOW</span>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  Instant Exchange
                  <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center max-w-[200px]">
              Instant crypto swaps with 900+ cryptocurrencies
            </p>
          </a>

          {/* OKX DEX Partner */}
          <a
            href="https://www.okx.com/web3/dex"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center gap-3 p-5 sm:p-6 rounded-xl bg-secondary/30 border border-border hover:border-primary/30 hover-lift transition-all sweep-effect shadow-premium-hover performance-critical overflow-hidden"
          >
            <div className="flex items-center gap-3">
              <img
                src={okxWalletLogo}
                alt="OKX DEX aggregator logo"
                loading="lazy"
                decoding="async"
                width="48"
                height="48"
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover shrink-0"
              />
              <div className="text-left min-w-0">
                <span className="font-bold text-lg sm:text-xl">OKX DEX</span>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  DEX Aggregator
                  <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center max-w-[200px]">
              Best rates from 400+ DEXs across 25+ chains
            </p>
          </a>

          {/* Li.Fi Partner */}
          <a
            href="https://li.fi"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center gap-3 p-5 sm:p-6 rounded-xl bg-secondary/30 border border-border hover:border-primary/30 hover-lift transition-all sweep-effect shadow-premium-hover performance-critical overflow-hidden"
          >
            <div className="flex items-center gap-3">
              <img
                src="https://li.fi/logo192.png"
                alt="Li.Fi cross-chain bridge logo"
                loading="lazy"
                decoding="async"
                width="48"
                height="48"
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover bg-background shrink-0"
              />
              <div className="text-left min-w-0">
                <span className="font-bold text-lg sm:text-xl">Li.Fi</span>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  Cross-Chain Bridge
                  <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center max-w-[200px]">
              Bridge assets across 20+ chains seamlessly
            </p>
          </a>

          {/* Jupiter Partner */}
          <a
            href="https://jup.ag"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center gap-3 p-5 sm:p-6 rounded-xl bg-secondary/30 border border-border hover:border-primary/30 hover-lift transition-all sweep-effect shadow-premium-hover performance-critical overflow-hidden"
          >
            <div className="flex items-center gap-3">
              <img
                src="https://jup.ag/favicon.ico"
                alt="Jupiter Solana aggregator logo"
                loading="lazy"
                decoding="async"
                width="48"
                height="48"
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover shrink-0"
              />
              <div className="text-left min-w-0">
                <span className="font-bold text-lg sm:text-xl">Jupiter</span>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  Solana DEX
                  <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center max-w-[200px]">
              Best Solana swap rates via Ultra API
            </p>
          </a>

          {/* Hyperliquid Partner */}
          <a
            href="https://hyperliquid.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center gap-3 p-5 sm:p-6 rounded-xl bg-secondary/30 border border-border hover:border-primary/30 hover-lift transition-all sweep-effect shadow-premium-hover performance-critical overflow-hidden"
          >
            <div className="flex items-center gap-3">
              <img
                src="https://hyperliquid.xyz/favicon.ico"
                alt="Hyperliquid perpetuals logo"
                loading="lazy"
                decoding="async"
                width="48"
                height="48"
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover shrink-0"
              />
              <div className="text-left min-w-0">
                <span className="font-bold text-lg sm:text-xl">Hyperliquid</span>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  Perpetuals
                  <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center max-w-[200px]">
              50x leverage perpetual futures trading
            </p>
          </a>

          {/* Alchemy Partner */}
          <a
            href="https://www.alchemy.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center gap-3 p-5 sm:p-6 rounded-xl bg-secondary/30 border border-border hover:border-primary/30 hover-lift transition-all sweep-effect shadow-premium-hover performance-critical overflow-hidden"
          >
            <div className="flex items-center gap-3">
              <img
                src="https://www.alchemy.com/favicon.ico"
                alt="Alchemy RPC infrastructure logo"
                loading="lazy"
                decoding="async"
                width="48"
                height="48"
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover shrink-0"
              />
              <div className="text-left min-w-0">
                <span className="font-bold text-lg sm:text-xl">Alchemy</span>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  RPC Infrastructure
                  <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center max-w-[200px]">
              Enterprise-grade RPC for EVM & Solana
            </p>
          </a>
        </div>

        {/* 526+ Wallets Highlight */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 sm:px-6 sm:py-3 bg-primary/10 border border-primary/20 rounded-full mb-4">
            <Wallet className="w-5 h-5 text-primary" aria-hidden="true" />
            <span className="text-base sm:text-lg font-semibold">
              <span className="text-primary">526+</span> Wallets Supported
            </span>
          </div>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Connect with virtually any wallet through WalletConnect, including MetaMask, 
            Trust Wallet, Rainbow, and hundreds more across all supported chains.
          </p>
        </div>

        {/* Featured Wallet Partners */}
        <div className="text-center mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Featured Wallet Integrations</h3>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-12">
          {walletPartners.map((wallet, index) => (
            <a
              key={wallet.name}
              href={wallet.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`group flex items-center gap-2.5 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg bg-secondary/20 border border-border hover:border-primary/30 hover-lift transition-all sweep-effect performance-critical overflow-hidden ${STAGGER_ITEM_CLASS}`}
              style={getStaggerStyle(index, 50)}
            >
              <img
                src={wallet.icon}
                alt={`${wallet.name} logo`}
                loading="lazy"
                decoding="async"
                width="32"
                height="32"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(wallet.name.slice(0, 2))}&background=6366f1&color=fff&size=64`;
                }}
              />
              <div className="text-left min-w-0">
                <span className="font-medium text-xs sm:text-sm truncate block">{wallet.name}</span>
                <div className="text-[10px] text-muted-foreground truncate">{wallet.chain}</div>
              </div>
            </a>
          ))}
        </div>

        {/* Trust badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 max-w-4xl mx-auto">
          {trustBadges.map((badge, index) => (
            <div 
              key={badge.label}
              className={`flex flex-col items-center p-3 bg-card/50 rounded-lg border border-border/50 sweep-effect performance-critical overflow-hidden ${STAGGER_ITEM_CLASS}`}
              style={getStaggerStyle(index + walletPartners.length, 50)}
            >
              <badge.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary mb-1 shrink-0" aria-hidden="true" />
              <span className="text-xs font-medium text-center">{badge.label}</span>
            </div>
          ))}
          <div className={`flex flex-col items-center p-3 bg-card/50 rounded-lg border border-border/50 sweep-effect performance-critical overflow-hidden ${STAGGER_ITEM_CLASS}`}>
            <span className="w-2 h-2 rounded-full bg-success mb-2 shrink-0" aria-hidden="true" />
            <span className="text-xs font-medium text-center">No KYC</span>
          </div>
        </div>
      </div>
    </section>
  );
});
