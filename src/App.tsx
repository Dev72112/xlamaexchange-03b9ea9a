import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "@/components/ThemeProvider";
import { MultiWalletProvider } from "@/contexts/MultiWalletContext";
import { DexTransactionProvider } from "@/contexts/DexTransactionContext";
import { ExchangeModeProvider } from "@/contexts/ExchangeModeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CookieConsent } from "@/components/CookieConsent";
import { TrackingProvider } from "@/components/TrackingProvider";
import { ScrollToTop } from "@/components/ScrollToTop";
import { PageLoadingSkeleton } from "@/components/PageLoadingSkeleton";
import { RouteLoadingProvider } from "@/contexts/RouteLoadingContext";
import { PageTransition } from "@/components/PageTransition";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";

// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const About = lazy(() => import("./pages/About"));
const Favorites = lazy(() => import("./pages/Favorites"));
const History = lazy(() => import("./pages/History"));
const Analytics = lazy(() => import("./pages/Analytics"));
const CookiesPolicy = lazy(() => import("./pages/CookiesPolicy"));
const TokenCompare = lazy(() => import("./pages/TokenCompare"));
const NotFound = lazy(() => import("./pages/NotFound"));

const App = () => (
  <HelmetProvider>
    <ThemeProvider defaultTheme="dark">
      <ErrorBoundary>
        <MultiWalletProvider>
          <DexTransactionProvider>
            <ExchangeModeProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <RouteLoadingProvider>
                    <ScrollToTop />
                    <TrackingProvider>
                      <Suspense fallback={<PageLoadingSkeleton />}>
                        <PageTransition>
                          <Routes>
                            <Route path="/" element={<Index />} />
                            <Route path="/favorites" element={<Favorites />} />
                            <Route path="/history" element={<History />} />
                            <Route path="/analytics" element={<Analytics />} />
                            <Route path="/about" element={<About />} />
                            <Route path="/faq" element={<FAQ />} />
                            <Route path="/terms" element={<Terms />} />
                            <Route path="/privacy" element={<Privacy />} />
                            <Route path="/cookies" element={<CookiesPolicy />} />
                            <Route path="/compare" element={<TokenCompare />} />
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </PageTransition>
                      </Suspense>
                      <KeyboardShortcuts />
                      <CookieConsent />
                    </TrackingProvider>
                  </RouteLoadingProvider>
                </BrowserRouter>
              </TooltipProvider>
            </ExchangeModeProvider>
          </DexTransactionProvider>
        </MultiWalletProvider>
      </ErrorBoundary>
    </ThemeProvider>
  </HelmetProvider>
);

export default App;
