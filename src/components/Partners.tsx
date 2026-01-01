import { ExternalLink, Wallet } from "lucide-react";
import changeNowLogo from "@/assets/changenow-logo.jpg";
import phantomLogo from '@/assets/wallets/phantom-logo.png';
import solflareLogo from '@/assets/wallets/solflare-logo.png';
import suiWalletLogo from '@/assets/wallets/sui-wallet-logo.png';
import tonkeeperLogo from '@/assets/wallets/tonkeeper-logo.jpeg';
import tokenpocketLogo from '@/assets/wallets/tokenpocket-logo.png';
import okxWalletLogo from '@/assets/wallets/okx-wallet-logo.png';

const walletPartners = [
  { name: "MetaMask", icon: "https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg", url: "https://metamask.io", chain: "EVM" },
  { name: "OKX Wallet", icon: okxWalletLogo, url: "https://www.okx.com/web3", chain: "Multi-chain" },
  { name: "Phantom", icon: phantomLogo, url: "https://phantom.app", chain: "Solana" },
  { name: "Solflare", icon: solflareLogo, url: "https://solflare.com", chain: "Solana" },
  { name: "Sui Wallet", icon: suiWalletLogo, url: "https://sui.io", chain: "Sui" },
  { name: "Tonkeeper", icon: tonkeeperLogo, url: "https://tonkeeper.com", chain: "TON" },
  { name: "TokenPocket", icon: tokenpocketLogo, url: "https://www.tokenpocket.pro", chain: "Multi-chain" },
];

export function Partners() {
  return (
    <section className="py-16 sm:py-20 border-t border-border">
      <div className="container px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Powered By</h2>
          <p className="text-sm text-muted-foreground">Trusted technology partners for seamless crypto exchange</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16">
          {/* ChangeNow Partner */}
          <a
            href="https://changenow.io"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center gap-3 p-6 rounded-xl bg-secondary/30 border border-border hover:border-primary/30 transition-all hover:bg-secondary/50 w-full sm:w-auto"
          >
            <div className="flex items-center gap-3">
              <img
                src={changeNowLogo}
                alt="ChangeNOW exchange API logo"
                loading="lazy"
                decoding="async"
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover"
              />
              <div className="text-left">
                <span className="font-bold text-lg sm:text-xl">ChangeNOW</span>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  Instant Exchange API
                  <ExternalLink className="w-3 h-3" />
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
            className="group flex flex-col items-center gap-3 p-6 rounded-xl bg-secondary/30 border border-border hover:border-primary/30 transition-all hover:bg-secondary/50 w-full sm:w-auto"
          >
            <div className="flex items-center gap-3">
              <img
                src={okxWalletLogo}
                alt="OKX DEX aggregator logo"
                loading="lazy"
                decoding="async"
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover"
              />
              <div className="text-left">
                <span className="font-bold text-lg sm:text-xl">OKX DEX</span>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  DEX Aggregator
                  <ExternalLink className="w-3 h-3" />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center max-w-[200px]">
              Best rates from 400+ DEXs across 20+ chains
            </p>
          </a>
        </div>

        {/* Wallet Partners */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Wallet className="w-5 h-5 text-primary" />
            <h3 className="text-lg sm:text-xl font-semibold">Supported Wallets</h3>
          </div>
          <p className="text-sm text-muted-foreground">Connect with your favorite wallet across multiple blockchains</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-12">
          {walletPartners.map((wallet) => (
            <a
              key={wallet.name}
              href={wallet.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 px-4 py-3 rounded-lg bg-secondary/20 border border-border hover:border-primary/30 transition-all hover:bg-secondary/40"
            >
              <img
                src={wallet.icon}
                alt={`${wallet.name} logo`}
                loading="lazy"
                decoding="async"
                className="w-8 h-8 rounded-lg object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(wallet.name.slice(0, 2))}&background=6366f1&color=fff&size=64`;
                }}
              />
              <div className="text-left">
                <span className="font-medium text-sm">{wallet.name}</span>
                <div className="text-[10px] text-muted-foreground">{wallet.chain}</div>
              </div>
            </a>
          ))}
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-4 sm:gap-8 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success" />
            Non-custodial Exchange
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success" />
            No KYC Required
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success" />
            400+ DEXs Aggregated
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success" />
            Multi-Chain Support
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success" />
            24/7 Support
          </div>
        </div>
      </div>
    </section>
  );
}
