import { memo, useState, useEffect } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { RouteLoadComplete } from "@/contexts/RouteLoadingContext";
import { useMultiWallet } from "@/contexts/MultiWalletContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { MultiWalletButton } from "@/components/wallet/MultiWalletButton";
import { X } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = memo(function Layout({ children }: LayoutProps) {
  const { hasAnyConnection } = useMultiWallet();
  const isMobile = useIsMobile();
  const [showMobileConnectBar, setShowMobileConnectBar] = useState(false);

  // Show mobile connect bar for first-time mobile visitors
  useEffect(() => {
    const hasSeenBar = localStorage.getItem('xlama-seen-connect-bar');
    if (isMobile && !hasAnyConnection && !hasSeenBar) {
      // Small delay to not show immediately on load
      const timer = setTimeout(() => setShowMobileConnectBar(true), 2000);
      return () => clearTimeout(timer);
    } else {
      setShowMobileConnectBar(false);
    }
  }, [isMobile, hasAnyConnection]);

  const dismissBar = () => {
    setShowMobileConnectBar(false);
    localStorage.setItem('xlama-seen-connect-bar', 'true');
  };

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden max-w-[100vw]">
      <Header />
      <main id="main-content" className="flex-1 overflow-x-hidden min-w-0" role="main" tabIndex={-1}>
        <RouteLoadComplete />
        {children}
      </main>
      <Footer />

      {/* Mobile Connect Wallet Bar - Shows for first-time mobile visitors */}
      {showMobileConnectBar && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-card/95 backdrop-blur-lg border-t border-border mobile-connect-bar safe-area-bottom">
          <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
            <span className="text-sm font-medium text-foreground">Ready to swap?</span>
            <div className="flex items-center gap-2">
              <MultiWalletButton />
              <button 
                onClick={dismissBar}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors touch-target"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});