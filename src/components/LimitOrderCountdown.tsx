import { useState, useEffect, memo } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LimitOrderCountdownProps {
  expiresAt: string;
  className?: string;
}

export const LimitOrderCountdown = memo(function LimitOrderCountdown({ 
  expiresAt, 
  className 
}: LimitOrderCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Date.now();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft('Expired');
        return;
      }

      // Urgent if less than 2 hours remaining
      setIsUrgent(diff < 2 * 60 * 60 * 1000);

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  if (isExpired) {
    return (
      <span className={cn("flex items-center gap-1 text-destructive", className)}>
        <AlertTriangle className="w-3 h-3" />
        <span className="text-[10px] sm:text-xs">Expired</span>
      </span>
    );
  }

  return (
    <span className={cn(
      "flex items-center gap-1",
      isUrgent ? "text-warning" : "text-muted-foreground",
      className
    )}>
      <Clock className={cn("w-3 h-3", isUrgent && "animate-pulse")} />
      <span className="text-[10px] sm:text-xs font-mono">{timeLeft}</span>
    </span>
  );
});
