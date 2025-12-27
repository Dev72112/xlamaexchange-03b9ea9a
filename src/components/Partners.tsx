import { ExternalLink } from "lucide-react";

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
        
        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-16">
          {/* ChangeNow Partner */}
          <a
            href="https://changenow.io"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center gap-3 p-6 rounded-xl bg-secondary/30 border border-border hover:border-primary/30 transition-all hover:bg-secondary/50"
          >
            <div className="flex items-center gap-3">
              <svg 
                viewBox="0 0 32 32" 
                className="w-10 h-10 sm:w-12 sm:h-12"
                fill="none"
              >
                <circle cx="16" cy="16" r="16" fill="#00C26F"/>
                <path 
                  d="M22.5 11.5L16 8L9.5 11.5V20.5L16 24L22.5 20.5V11.5Z" 
                  stroke="white" 
                  strokeWidth="1.5" 
                  strokeLinejoin="round"
                />
                <path 
                  d="M16 8V24M9.5 11.5L22.5 20.5M22.5 11.5L9.5 20.5" 
                  stroke="white" 
                  strokeWidth="1.5"
                />
              </svg>
              <div className="text-left">
                <span className="font-bold text-lg sm:text-xl">ChangeNow</span>
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
              <svg 
                viewBox="0 0 32 32" 
                className="w-10 h-10 sm:w-12 sm:h-12"
                fill="none"
              >
                <circle cx="16" cy="16" r="16" fill="#8BC53F"/>
                <ellipse cx="16" cy="16" rx="10" ry="11" fill="#F9E988"/>
                <circle cx="12" cy="13" r="3" fill="white"/>
                <circle cx="12" cy="13" r="1.5" fill="#1B1B1B"/>
                <ellipse cx="20" cy="14" rx="2" ry="2.5" fill="#E17726"/>
                <path 
                  d="M13 20C13 20 14.5 22 16 22C17.5 22 19 20 19 20" 
                  stroke="#1B1B1B" 
                  strokeWidth="1" 
                  strokeLinecap="round"
                />
              </svg>
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
