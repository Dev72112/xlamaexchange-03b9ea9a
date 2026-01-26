/**
 * useSwipeGesture Hook
 * 
 * Enables horizontal swipe detection for tab navigation on mobile.
 */

import { useRef, useCallback, useEffect, useState } from 'react';

interface SwipeConfig {
  threshold?: number; // Minimum distance to trigger swipe (default: 50px)
  restraint?: number; // Max vertical movement allowed (default: 100px)
  allowedTime?: number; // Max time allowed for swipe (default: 300ms)
}

interface SwipeState {
  swiping: boolean;
  direction: 'left' | 'right' | null;
}

export function useSwipeGesture(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  config: SwipeConfig = {}
) {
  const { threshold = 50, restraint = 100, allowedTime = 300 } = config;
  
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const [state, setState] = useState<SwipeState>({ swiping: false, direction: null });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchStartTime.current = Date.now();
    setState({ swiping: true, direction: null });
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    const distX = touch.clientX - touchStartX.current;
    const distY = touch.clientY - touchStartY.current;
    const elapsedTime = Date.now() - touchStartTime.current;

    // Check if swipe is valid
    if (elapsedTime <= allowedTime) {
      // Horizontal swipe
      if (Math.abs(distX) >= threshold && Math.abs(distY) <= restraint) {
        if (distX > 0) {
          // Swipe right
          onSwipeRight?.();
          setState({ swiping: false, direction: 'right' });
        } else {
          // Swipe left
          onSwipeLeft?.();
          setState({ swiping: false, direction: 'left' });
        }
        return;
      }
    }
    
    setState({ swiping: false, direction: null });
  }, [threshold, restraint, allowedTime, onSwipeLeft, onSwipeRight]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Optional: could add visual feedback during swipe
    const touch = e.touches[0];
    const distX = touch.clientX - touchStartX.current;
    
    if (Math.abs(distX) > 10) {
      setState(prev => ({
        ...prev,
        direction: distX > 0 ? 'right' : 'left'
      }));
    }
  }, []);

  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
      onTouchMove: handleTouchMove,
    },
    ...state,
  };
}
