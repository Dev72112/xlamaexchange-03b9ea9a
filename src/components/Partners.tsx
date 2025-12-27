import { ExternalLink } from "lucide-react";

import changeNowLogo from "@/assets/changenow-logo.jpg";
import coinGeckoLogo from "@/assets/coingecko-logo.png";
import defiLlamaLogo from "@/assets/defillama-logo.png";

export function Partners() {
  return (
    <section className="py-16 sm:py-20 border-t border-border">
      <div className="container px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Powered By</h2>
          <p className="text-sm text-muted-foreground">
            Trusted technology partners for seamless crypto exchange
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          {/* ChangeNow Partner */}
          <a
            href="https://changenow.io"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center gap-3 p-6 rounded-xl bg-secondary/30 border border-border hover:border-primary/30 transition-all hover:bg-secondary/50"
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
                  Exchange API
                  <ExternalLink className="w-3 h-3" />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center max-w-[180px]">
              Instant crypto swaps with 900+ cryptocurrencies
            </p>
          </a>

          {/* CoinGecko Partner */}
          <a
            href="https://coingecko.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center gap-3 p-6 rounded-xl bg-secondary/30 border border-border hover:border-primary/30 transition-all hover:bg-secondary/50"
          >
            <div className="flex items-center gap-3">
              <img
                src={coinGeckoLogo}
                alt="CoinGecko crypto price data logo"
                loading="lazy"
                decoding="async"
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-contain bg-secondary"
              />
              <div className="text-left">
                <span className="font-bold text-lg sm:text-xl">CoinGecko</span>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  Price Data API
                  <ExternalLink className="w-3 h-3" />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center max-w-[180px]">
              Real-time price charts and market data
            </p>
          </a>

          {/* DefiLlama Partner */}
          <a
            href="https://defillama.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center gap-3 p-6 rounded-xl bg-secondary/30 border border-border hover:border-primary/30 transition-all hover:bg-secondary/50"
          >
            <div className="flex items-center gap-3">
              <img
                src={defiLlamaLogo}
                alt="DefiLlama DeFi analytics logo"
                loading="lazy"
                decoding="async"
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-contain"
              />
              <div className="text-left">
                <span className="font-bold text-lg sm:text-xl">DefiLlama</span>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  DeFi Analytics
                  <ExternalLink className="w-3 h-3" />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center max-w-[180px]">
              Comprehensive DeFi TVL and price aggregation
            </p>
          </a>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-4 sm:gap-8 mt-12 text-xs text-muted-foreground">
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
            24/7 Support
          </div>
        </div>
      </div>
    </section>
  );
}
