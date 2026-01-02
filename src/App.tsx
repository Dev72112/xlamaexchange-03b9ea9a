import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "@/components/ThemeProvider";
import { MultiWalletProvider } from "@/contexts/MultiWalletContext";
import { DexTransactionProvider } from "@/contexts/DexTransactionContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CookieConsent } from "@/components/CookieConsent";
import Index from "./pages/Index";
import FAQ from "./pages/FAQ";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import About from "./pages/About";
import Favorites from "./pages/Favorites";
import History from "./pages/History";
import NotFound from "./pages/NotFound";

// Import Sui dapp-kit styles
import '@mysten/dapp-kit/dist/index.css';

const App = () => (
  <HelmetProvider>
    <ThemeProvider defaultTheme="dark">
      <ErrorBoundary>
        <MultiWalletProvider>
          <DexTransactionProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/favorites" element={<Favorites />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <CookieConsent />
              </BrowserRouter>
            </TooltipProvider>
          </DexTransactionProvider>
        </MultiWalletProvider>
      </ErrorBoundary>
    </ThemeProvider>
  </HelmetProvider>
);

export default App;
