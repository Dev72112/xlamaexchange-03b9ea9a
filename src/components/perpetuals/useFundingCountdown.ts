/**
 * useFundingCountdown Hook
 * 
 * Real-time countdown to next funding payment on Hyperliquid.
 * Funding occurs every 8 hours (00:00, 08:00, 16:00 UTC).
 */

import { useState, useEffect } from 'react';

export const useFundingCountdown = (nextFundingTime?: number): string => {
  const [timeLeft, setTimeLeft] = useState<string>('--:--:--');
  
  useEffect(() => {
    // Calculate next funding time if not provided
    let targetTime = nextFundingTime;
    
    if (!targetTime) {
      // Hyperliquid funding occurs every hour at the start of each hour
      // But the major payments are every 8 hours at 00:00, 08:00, 16:00 UTC
      const now = Date.now();
      const msPerHour = 3600000;
      const currentHourMs = Math.floor(now / msPerHour) * msPerHour;
      const currentHour = new Date(currentHourMs).getUTCHours();
      
      // Find next 8-hour mark
      const nextEightHourMark = Math.ceil((currentHour + 1) / 8) * 8;
      const hoursUntilNext = nextEightHourMark > currentHour 
        ? nextEightHourMark - currentHour 
        : (24 - currentHour + nextEightHourMark % 24);
      
      targetTime = currentHourMs + (hoursUntilNext * msPerHour);
    }
    
    const updateCountdown = () => {
      const now = Date.now();
      const diff = Math.max(0, targetTime! - now);
      
      if (diff === 0) {
        setTimeLeft('00:00:00');
        return;
      }
      
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      
      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextFundingTime]);
  
  return timeLeft;
};
