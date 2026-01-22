/**
 * Mobile Trade Panel with Swipe Gestures
 * 
 * Swipe-friendly trading interface for quick long/short actions
 */

import { memo, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  ChevronUp,
  ChevronDown,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';

interface MobileTradePanelProps {
  coin: string;
  currentPrice: number;
  availableMargin: number;
  onTrade: (params: {
    side: 'long' | 'short';
    size: number;
    leverage: number;
    orderType: 'market' | 'limit';
    limitPrice?: number;
  }) => void;
}

export const MobileTradePanel = memo(function MobileTradePanel({
  coin,
  currentPrice,
  availableMargin,
  onTrade,
}: MobileTradePanelProps) {
  const { trigger } = useHapticFeedback();
  const [size, setSize] = useState('');
  const [leverage, setLeverage] = useState(5);
  const [isExpanded, setIsExpanded] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'long' | 'short' | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  
  // Transform swipe to visual feedback
  const longOpacity = useTransform(x, [0, 100], [0, 1]);
  const shortOpacity = useTransform(x, [-100, 0], [1, 0]);
  const scale = useTransform(x, [-100, 0, 100], [1.02, 1, 1.02]);

  const handleDragEnd = useCallback((event: any, info: any) => {
    const threshold = 80;
    
    if (info.offset.x > threshold) {
      // Swipe right = Long
      setSwipeDirection('long');
      trigger('medium');
      handleQuickTrade('long');
    } else if (info.offset.x < -threshold) {
      // Swipe left = Short
      setSwipeDirection('short');
      trigger('medium');
      handleQuickTrade('short');
    }
    
    x.set(0);
    setTimeout(() => setSwipeDirection(null), 500);
  }, [trigger, x]);

  const handleQuickTrade = (side: 'long' | 'short') => {
    const sizeNum = parseFloat(size) || (availableMargin * 0.1);
    onTrade({
      side,
      size: sizeNum,
      leverage,
      orderType: 'market',
    });
  };

  const handleButtonTrade = (side: 'long' | 'short') => {
    trigger('light');
    const sizeNum = parseFloat(size);
    if (!sizeNum) return;
    
    onTrade({
      side,
      size: sizeNum,
      leverage,
      orderType: 'market',
    });
  };

  const marginRequired = (parseFloat(size) || 0) / leverage;
  const hasInsufficientMargin = marginRequired > availableMargin;

  // Ensure the panel is truly viewport-fixed even inside animated/translated parents
  const canUseDOM = typeof document !== 'undefined';

  if (!canUseDOM) return null;

  return createPortal(
    <div className="md:hidden fixed bottom-[72px] left-0 right-0 z-40 px-2 safe-area-bottom">
      <motion.div
        ref={containerRef}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.3}
        onDragEnd={handleDragEnd}
        style={{ x, scale }}
        className="relative"
      >
        {/* Swipe indicators */}
        <AnimatePresence>
          {swipeDirection && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={cn(
                "absolute inset-0 rounded-2xl flex items-center justify-center z-10",
                swipeDirection === 'long' 
                  ? "bg-success/90" 
                  : "bg-destructive/90"
              )}
            >
              <div className="text-white text-center">
                {swipeDirection === 'long' ? (
                  <>
                    <TrendingUp className="w-8 h-8 mx-auto mb-1" />
                    <span className="font-bold">LONG</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-8 h-8 mx-auto mb-1" />
                    <span className="font-bold">SHORT</span>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Card className="glass border-border/50 shadow-lg">
          {/* Swipe hint overlays */}
          <motion.div 
            style={{ opacity: longOpacity }}
            className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-success/20 to-transparent rounded-l-lg pointer-events-none flex items-center justify-start pl-4"
          >
            <TrendingUp className="w-6 h-6 text-success" />
          </motion.div>
          <motion.div 
            style={{ opacity: shortOpacity }}
            className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-destructive/20 to-transparent rounded-r-lg pointer-events-none flex items-center justify-end pr-4"
          >
            <TrendingDown className="w-6 h-6 text-destructive" />
          </motion.div>

          <CardContent className="py-3 px-4">
            {/* Header with expand toggle */}
            <div 
              className="flex items-center justify-between mb-3 cursor-pointer"
              onClick={() => {
                trigger('light');
                setIsExpanded(!isExpanded);
              }}
            >
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {coin}-PERP
                </Badge>
                <span className="font-mono font-semibold text-sm">
                  ${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {leverage}x
                </Badge>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Swipe hint */}
            <div className="text-center text-xs text-muted-foreground mb-3 flex items-center justify-center gap-2">
              <TrendingUp className="w-3 h-3 text-success" />
              <span>← Swipe to trade →</span>
              <TrendingDown className="w-3 h-3 text-destructive" />
            </div>

            {/* Expanded controls */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-4 pt-2 border-t border-border/50">
                    {/* Size input */}
                    <div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Size (USD)</span>
                        <span>Avail: ${availableMargin.toFixed(2)}</span>
                      </div>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={size}
                        onChange={(e) => setSize(e.target.value)}
                        className="font-mono h-10"
                      />
                    </div>

                    {/* Leverage slider */}
                    <div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <span>Leverage</span>
                        <span className="font-mono font-medium">{leverage}x</span>
                      </div>
                      <Slider
                        value={[leverage]}
                        onValueChange={([v]) => setLeverage(v)}
                        min={1}
                        max={50}
                        step={1}
                        className="py-2"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>1x</span>
                        <span>50x</span>
                      </div>
                    </div>

                    {/* Quick leverage presets */}
                    <div className="flex gap-1">
                      {[1, 5, 10, 20, 50].map((lev) => (
                        <Button
                          key={lev}
                          variant={leverage === lev ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            trigger('light');
                            setLeverage(lev);
                          }}
                          className="flex-1 h-8 text-xs"
                        >
                          {lev}x
                        </Button>
                      ))}
                    </div>

                    {/* Margin required */}
                    {parseFloat(size) > 0 && (
                      <div className={cn(
                        "text-xs p-2 rounded-lg",
                        hasInsufficientMargin 
                          ? "bg-destructive/10 text-destructive" 
                          : "bg-secondary/50 text-muted-foreground"
                      )}>
                        Margin required: ${marginRequired.toFixed(2)}
                        {hasInsufficientMargin && " (Insufficient)"}
                      </div>
                    )}

                    {/* Trade buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => handleButtonTrade('long')}
                        disabled={!size || hasInsufficientMargin}
                        className="h-12 bg-success hover:bg-success/90 text-white"
                      >
                        <TrendingUp className="w-5 h-5 mr-2" />
                        Long
                      </Button>
                      <Button
                        onClick={() => handleButtonTrade('short')}
                        disabled={!size || hasInsufficientMargin}
                        className="h-12 bg-destructive hover:bg-destructive/90 text-white"
                      >
                        <TrendingDown className="w-5 h-5 mr-2" />
                        Short
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Collapsed quick buttons */}
            {!isExpanded && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => handleButtonTrade('long')}
                  className="h-10 bg-success hover:bg-success/90 text-white"
                >
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Long
                </Button>
                <Button
                  onClick={() => handleButtonTrade('short')}
                  className="h-10 bg-destructive hover:bg-destructive/90 text-white"
                >
                  <TrendingDown className="w-4 h-4 mr-1" />
                  Short
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>,
    document.body
  );
});
