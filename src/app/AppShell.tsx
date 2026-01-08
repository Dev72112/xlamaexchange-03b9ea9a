/**
 * App Shell - Core application structure with routing
 * Separates routing logic from provider configuration
 */
import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RouteLoadingProvider } from '@/contexts/RouteLoadingContext';
import { ScrollToTop } from '@/components/ScrollToTop';
import { TrackingProvider } from '@/components/TrackingProvider';
import { PageLoadingSkeleton } from '@/components/PageLoadingSkeleton';
import { PageTransition } from '@/components/PageTransition';
import { KeyboardShortcuts } from '@/components/KeyboardShortcuts';
import { BridgeNotificationWatcher } from '@/components/BridgeNotificationWatcher';
import { FloatingFeedback } from '@/components/FloatingFeedback';
import { CookieConsent } from '@/components/CookieConsent';
import { allRoutes } from './routes';

export function AppShell() {
  return (
    <BrowserRouter>
      <RouteLoadingProvider>
        <ScrollToTop />
        <TrackingProvider>
          <Suspense fallback={<PageLoadingSkeleton />}>
            <PageTransition>
              <Routes>
                {allRoutes.map((route) => (
                  <Route
                    key={route.path}
                    path={route.path}
                    element={<route.element />}
                  />
                ))}
              </Routes>
            </PageTransition>
          </Suspense>
          <KeyboardShortcuts />
          <BridgeNotificationWatcher />
          <FloatingFeedback />
          <CookieConsent />
        </TrackingProvider>
      </RouteLoadingProvider>
    </BrowserRouter>
  );
}
