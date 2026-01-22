/**
 * Indicator Presets
 * 
 * Quick presets for different trading styles: Scalping, Swing, Position Trading
 */

import { memo } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Zap, TrendingUp, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IndicatorSettings, DEFAULT_INDICATOR_SETTINGS } from './ChartIndicators';

export type PresetType = 'scalping' | 'swing' | 'position' | 'custom';

interface IndicatorPresetsProps {
  currentSettings: IndicatorSettings;
  onApplyPreset: (settings: IndicatorSettings) => void;
  className?: string;
}

// Preset configurations
const PRESETS: Record<Exclude<PresetType, 'custom'>, { 
  label: string; 
  icon: typeof Zap; 
  description: string; 
  settings: IndicatorSettings 
}> = {
  scalping: {
    label: 'Scalping',
    icon: Zap,
    description: 'Fast entries, tight stops (1m-15m)',
    settings: {
      sma: { enabled: true, period: 9, color: '#3b82f6' },
      ema: { enabled: true, period: 21, color: '#f59e0b' },
      rsi: { enabled: true, period: 7 },
      macd: { enabled: true, fastPeriod: 5, slowPeriod: 13, signalPeriod: 5 },
      bollingerBands: { enabled: true, period: 10, stdDev: 2 },
      stochRSI: { enabled: true, rsiPeriod: 7, stochPeriod: 7, kSmoothing: 2, dSmoothing: 2 },
      atr: { enabled: true, period: 7 },
    },
  },
  swing: {
    label: 'Swing Trading',
    icon: TrendingUp,
    description: 'Multi-day moves (1H-4H)',
    settings: {
      sma: { enabled: true, period: 20, color: '#3b82f6' },
      ema: { enabled: true, period: 50, color: '#f59e0b' },
      rsi: { enabled: true, period: 14 },
      macd: { enabled: true, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
      bollingerBands: { enabled: true, period: 20, stdDev: 2 },
      stochRSI: { enabled: false, rsiPeriod: 14, stochPeriod: 14, kSmoothing: 3, dSmoothing: 3 },
      atr: { enabled: true, period: 14 },
    },
  },
  position: {
    label: 'Position Trading',
    icon: Clock,
    description: 'Long-term trends (1D-1W)',
    settings: {
      sma: { enabled: true, period: 50, color: '#3b82f6' },
      ema: { enabled: true, period: 200, color: '#f59e0b' },
      rsi: { enabled: true, period: 21 },
      macd: { enabled: true, fastPeriod: 19, slowPeriod: 39, signalPeriod: 9 },
      bollingerBands: { enabled: true, period: 50, stdDev: 2.5 },
      stochRSI: { enabled: false, rsiPeriod: 21, stochPeriod: 21, kSmoothing: 5, dSmoothing: 5 },
      atr: { enabled: true, period: 21 },
    },
  },
};

// Check if current settings match a preset
function detectActivePreset(settings: IndicatorSettings): PresetType {
  for (const [key, preset] of Object.entries(PRESETS)) {
    const presetSettings = preset.settings;
    let matches = true;
    
    // Compare each indicator
    for (const [indicatorKey, indicatorValue] of Object.entries(presetSettings)) {
      const currentValue = settings[indicatorKey as keyof IndicatorSettings];
      if (JSON.stringify(currentValue) !== JSON.stringify(indicatorValue)) {
        matches = false;
        break;
      }
    }
    
    if (matches) return key as PresetType;
  }
  
  return 'custom';
}

export const IndicatorPresets = memo(function IndicatorPresets({
  currentSettings,
  onApplyPreset,
  className,
}: IndicatorPresetsProps) {
  const activePreset = detectActivePreset(currentSettings);
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-7 gap-1.5", className)}
        >
          <Sparkles className="w-3.5 h-3.5" />
          {activePreset !== 'custom' ? PRESETS[activePreset].label : 'Presets'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Trading Style Presets</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {Object.entries(PRESETS).map(([key, preset]) => {
          const Icon = preset.icon;
          const isActive = activePreset === key;
          
          return (
            <DropdownMenuItem
              key={key}
              onClick={() => onApplyPreset(preset.settings)}
              className={cn(
                "flex flex-col items-start gap-0.5 py-2",
                isActive && "bg-primary/10"
              )}
            >
              <div className="flex items-center gap-2 w-full">
                <Icon className={cn(
                  "w-4 h-4",
                  isActive ? "text-primary" : "text-muted-foreground"
                )} />
                <span className={cn(
                  "font-medium",
                  isActive && "text-primary"
                )}>
                  {preset.label}
                </span>
                {isActive && (
                  <span className="ml-auto text-[10px] text-primary">Active</span>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground pl-6">
                {preset.description}
              </span>
            </DropdownMenuItem>
          );
        })}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={() => onApplyPreset(DEFAULT_INDICATOR_SETTINGS)}
          className="text-muted-foreground"
        >
          Reset to Default
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
