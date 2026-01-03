import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

type RouteLoadingContextValue = {
  isRouteLoading: boolean;
  progress: number;
  finish: () => void;
};

const RouteLoadingContext = createContext<RouteLoadingContextValue | null>(null);

export function RouteLoadingProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isFirstRender = useRef(true);

  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const progressTimerRef = useRef<number | null>(null);
  const finishTimerRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    if (finishTimerRef.current) {
      window.clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
  };

  const start = () => {
    clearTimers();
    setIsRouteLoading(true);
    setProgress(12);

    progressTimerRef.current = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        const bump = 4 + Math.random() * 10;
        return Math.min(90, p + bump);
      });
    }, 180);
  };

  const finish = () => {
    if (!isRouteLoading) return;

    clearTimers();
    setProgress(100);

    finishTimerRef.current = window.setTimeout(() => {
      setIsRouteLoading(false);
      setProgress(0);
    }, 220);
  };

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  useEffect(() => () => clearTimers(), []);

  const value = useMemo(
    () => ({ isRouteLoading, progress, finish }),
    [isRouteLoading, progress]
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
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  return null;
}
