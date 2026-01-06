import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

type RouteLoadingContextValue = {
  isRouteLoading: boolean;
  progress: number;
  finish: (locationKey?: string) => void;
  isSlowTransition: boolean;
};

const RouteLoadingContext = createContext<RouteLoadingContextValue | null>(null);

const SLOW_TRANSITION_THRESHOLD_MS = 2000;

export function RouteLoadingProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { toast } = useToast();
  const isFirstRender = useRef(true);

  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isSlowTransition, setIsSlowTransition] = useState(false);

  const progressTimerRef = useRef<number | null>(null);
  const finishTimerRef = useRef<number | null>(null);
  const slowTimerRef = useRef<number | null>(null);
  const toastShownRef = useRef(false);
  // Track active navigation to prevent stale finish calls
  const activeLocationKeyRef = useRef<string | null>(null);

  const clearTimers = useCallback(() => {
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    if (finishTimerRef.current) {
      window.clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
    if (slowTimerRef.current) {
      window.clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
    }
  }, []);

  const start = useCallback((locationKey: string) => {
    clearTimers();
    activeLocationKeyRef.current = locationKey;
    setIsRouteLoading(true);
    setIsSlowTransition(false);
    setProgress(12);
    toastShownRef.current = false;

    progressTimerRef.current = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        const bump = 4 + Math.random() * 10;
        return Math.min(90, p + bump);
      });
    }, 180);

    // Show slow transition toast after threshold
    slowTimerRef.current = window.setTimeout(() => {
      // Only show if still loading this navigation
      if (activeLocationKeyRef.current === locationKey) {
        setIsSlowTransition(true);
        if (!toastShownRef.current) {
          toastShownRef.current = true;
          toast({
            title: "Loading is taking longer than usual",
            description: "This might be due to a slow connection. You can try refreshing.",
            action: (
              <button
                onClick={() => window.location.reload()}
                className="shrink-0 rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Retry
              </button>
            ),
          });
        }
      }
    }, SLOW_TRANSITION_THRESHOLD_MS);
  }, [clearTimers, toast]);

  const finish = useCallback((locationKey?: string) => {
    // If locationKey provided, only finish if it matches active navigation
    if (locationKey && locationKey !== activeLocationKeyRef.current) {
      return;
    }

    clearTimers();
    activeLocationKeyRef.current = null;
    setProgress(100);
    setIsSlowTransition(false);

    finishTimerRef.current = window.setTimeout(() => {
      setIsRouteLoading(false);
      setProgress(0);
    }, 220);
  }, [clearTimers]);

  // Use useLayoutEffect so start() runs before child useEffects
  useLayoutEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    start(location.key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const value = useMemo(
    () => ({ isRouteLoading, progress, finish, isSlowTransition }),
    [isRouteLoading, progress, finish, isSlowTransition]
  );

  return <RouteLoadingContext.Provider value={value}>{children}</RouteLoadingContext.Provider>;
}

export function useRouteLoading() {
  const ctx = useContext(RouteLoadingContext);
  if (!ctx) throw new Error("useRouteLoading must be used within RouteLoadingProvider");
  return ctx;
}

/**
 * Call this once per route render (Layout is a good place). It will end the header progress bar.
 */
export function RouteLoadComplete() {
  const location = useLocation();
  const { finish } = useRouteLoading();

  useEffect(() => {
    // Pass location.key so finish only completes the current navigation
    finish(location.key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  return null;
}
