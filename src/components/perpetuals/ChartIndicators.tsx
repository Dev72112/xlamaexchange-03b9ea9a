/**
 * Chart Indicators Panel
 * 
 * Provides UI for toggling technical indicators on the candlestick chart
 */

import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { LineChart, TrendingUp, Activity, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface IndicatorSettings {
  sma: { enabled: boolean; period: number; color: string };
  ema: { enabled: boolean; period: number; color: string };
  rsi: { enabled: boolean; period: number };
  macd: { enabled: boolean; fastPeriod: number; slowPeriod: number; signalPeriod: number };
  bollingerBands: { enabled: boolean; period: number; stdDev: number };
  stochRSI: { enabled: boolean; rsiPeriod: number; stochPeriod: number; kSmoothing: number; dSmoothing: number };
  atr: { enabled: boolean; period: number };
}

export const DEFAULT_INDICATOR_SETTINGS: IndicatorSettings = {
  sma: { enabled: false, period: 20, color: '#3b82f6' },
  ema: { enabled: false, period: 50, color: '#f59e0b' },
  rsi: { enabled: false, period: 14 },
  macd: { enabled: false, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
  bollingerBands: { enabled: false, period: 20, stdDev: 2 },
  stochRSI: { enabled: false, rsiPeriod: 14, stochPeriod: 14, kSmoothing: 3, dSmoothing: 3 },
  atr: { enabled: false, period: 14 },
};

interface ChartIndicatorsProps {
  settings: IndicatorSettings;
  onChange: (settings: IndicatorSettings) => void;
  className?: string;
}

export const ChartIndicators = memo(function ChartIndicators({
  settings,
  onChange,
  className,
}: ChartIndicatorsProps) {
  const activeCount = Object.values(settings).filter(s => s.enabled).length;

  const updateIndicator = <K extends keyof IndicatorSettings>(
    key: K,
    updates: Partial<IndicatorSettings[K]>
  ) => {
    onChange({
      ...settings,
      [key]: { ...settings[key], ...updates },
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-7 gap-1.5", className)}
        >
          <LineChart className="w-3.5 h-3.5" />
          Indicators
          {activeCount > 0 && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px]">
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Technical Indicators</h4>
          
          {/* Moving Averages Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3" />
              Moving Averages
            </div>
            
            {/* SMA */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: settings.sma.color }}
                />
                <Label htmlFor="sma" className="text-sm">SMA</Label>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={settings.sma.period}
                  onChange={(e) => updateIndicator('sma', { period: parseInt(e.target.value) || 20 })}
                  className="w-14 h-6 text-xs"
                  min={1}
                  max={200}
                />
                <Switch
                  id="sma"
                  checked={settings.sma.enabled}
                  onCheckedChange={(enabled) => updateIndicator('sma', { enabled })}
                />
              </div>
            </div>
            
            {/* EMA */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: settings.ema.color }}
                />
                <Label htmlFor="ema" className="text-sm">EMA</Label>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={settings.ema.period}
                  onChange={(e) => updateIndicator('ema', { period: parseInt(e.target.value) || 50 })}
                  className="w-14 h-6 text-xs"
                  min={1}
                  max={200}
                />
                <Switch
                  id="ema"
                  checked={settings.ema.enabled}
                  onCheckedChange={(enabled) => updateIndicator('ema', { enabled })}
                />
              </div>
            </div>
          </div>
          
          {/* Oscillators Section */}
          <div className="space-y-3 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="w-3 h-3" />
              Oscillators
            </div>
            
            {/* RSI */}
            <div className="flex items-center justify-between">
              <Label htmlFor="rsi" className="text-sm">RSI</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={settings.rsi.period}
                  onChange={(e) => updateIndicator('rsi', { period: parseInt(e.target.value) || 14 })}
                  className="w-14 h-6 text-xs"
                  min={1}
                  max={100}
                />
                <Switch
                  id="rsi"
                  checked={settings.rsi.enabled}
                  onCheckedChange={(enabled) => updateIndicator('rsi', { enabled })}
                />
              </div>
            </div>
            
            {/* Stochastic RSI */}
            <div className="flex items-center justify-between">
              <Label htmlFor="stochRsi" className="text-sm">Stoch RSI</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {settings.stochRSI.rsiPeriod}/{settings.stochRSI.stochPeriod}
                </span>
                <Switch
                  id="stochRsi"
                  checked={settings.stochRSI.enabled}
                  onCheckedChange={(enabled) => updateIndicator('stochRSI', { enabled })}
                />
              </div>
            </div>
            
            {/* MACD */}
            <div className="flex items-center justify-between">
              <Label htmlFor="macd" className="text-sm">MACD</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {settings.macd.fastPeriod}/{settings.macd.slowPeriod}/{settings.macd.signalPeriod}
                </span>
                <Switch
                  id="macd"
                  checked={settings.macd.enabled}
                  onCheckedChange={(enabled) => updateIndicator('macd', { enabled })}
                />
              </div>
            </div>
            
            {/* ATR */}
            <div className="flex items-center justify-between">
              <Label htmlFor="atr" className="text-sm">ATR</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={settings.atr.period}
                  onChange={(e) => updateIndicator('atr', { period: parseInt(e.target.value) || 14 })}
                  className="w-14 h-6 text-xs"
                  min={1}
                  max={100}
                />
                <Switch
                  id="atr"
                  checked={settings.atr.enabled}
                  onCheckedChange={(enabled) => updateIndicator('atr', { enabled })}
                />
              </div>
            </div>
          </div>
          
          {/* Bands Section */}
          <div className="space-y-3 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <BarChart2 className="w-3 h-3" />
              Bands & Channels
            </div>
            
            {/* Bollinger Bands */}
            <div className="flex items-center justify-between">
              <Label htmlFor="bb" className="text-sm">Bollinger Bands</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={settings.bollingerBands.period}
                  onChange={(e) => updateIndicator('bollingerBands', { period: parseInt(e.target.value) || 20 })}
                  className="w-14 h-6 text-xs"
                  min={1}
                  max={100}
                />
                <Switch
                  id="bb"
                  checked={settings.bollingerBands.enabled}
                  onCheckedChange={(enabled) => updateIndicator('bollingerBands', { enabled })}
                />
              </div>
            </div>
          </div>
          
          {/* Reset */}
          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => onChange(DEFAULT_INDICATOR_SETTINGS)}
            >
              Reset All
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
});
