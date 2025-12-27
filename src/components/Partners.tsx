import { ExternalLink } from "lucide-react";

import changeNowLogo from "@/assets/changenow-logo.jpg";

export function Partners() {
  return (
    <section className="py-16 sm:py-20 border-t border-border">
      <div className="container px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Powered By</h2>
          <p className="text-sm text-muted-foreground">
            Trusted technology partner for seamless crypto exchange
          </p>
        </div>

        <div className="flex items-center justify-center">
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
