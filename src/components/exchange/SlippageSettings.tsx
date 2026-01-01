import { useState, useEffect } from "react";
import { Settings, Info, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface SlippageSettingsProps {
  slippage: string;
  onSlippageChange: (slippage: string) => void;
  autoSlippage?: string;
  isAutoEnabled?: boolean;
  onAutoChange?: (enabled: boolean) => void;
}

const PRESET_SLIPPAGES = ['0.5', '1.0', '3.0'];

export function SlippageSettings({ 
  slippage, 
  onSlippageChange, 
  autoSlippage,
  isAutoEnabled = false,
  onAutoChange,
}: SlippageSettingsProps) {
  const [open, setOpen] = useState(false);
  const [customSlippage, setCustomSlippage] = useState("");

  const displaySlippage = isAutoEnabled && autoSlippage ? autoSlippage : slippage;
  const isPreset = PRESET_SLIPPAGES.includes(slippage);
  const isHighSlippage = parseFloat(displaySlippage) >= 5;
  const isLowSlippage = parseFloat(displaySlippage) < 0.1;

  const handlePresetClick = (value: string) => {
    onAutoChange?.(false);
    onSlippageChange(value);
    setCustomSlippage("");
  };

  const handleCustomChange = (value: string) => {
    // Only allow numbers and one decimal
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    const formatted = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
    
    setCustomSlippage(formatted);
    
    const num = parseFloat(formatted);
    if (!isNaN(num) && num > 0 && num <= 50) {
      onAutoChange?.(false);
      onSlippageChange(formatted);
    }
  };

  const handleAutoToggle = () => {
    onAutoChange?.(!isAutoEnabled);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 px-2 gap-1.5 text-xs",
            isAutoEnabled && "text-primary",
            !isAutoEnabled && isHighSlippage && "text-warning",
            !isAutoEnabled && isLowSlippage && "text-destructive"
          )}
        >
          {isAutoEnabled ? (
            <Sparkles className="w-3.5 h-3.5" />
          ) : (
            <Settings className="w-3.5 h-3.5" />
          )}
          <span>{isAutoEnabled ? 'Auto' : `${displaySlippage}%`}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium">Slippage Tolerance</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button">
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-[250px]">
                  <p className="text-xs">
                    Maximum price difference you're willing to accept. Higher slippage = higher chance of success, but potentially worse rate.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Auto mode button */}
          {onAutoChange && (
            <Button
              variant={isAutoEnabled ? "default" : "outline"}
              size="sm"
              className={cn(
                "w-full h-9 gap-2",
                isAutoEnabled && "bg-primary text-primary-foreground"
              )}
              onClick={handleAutoToggle}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Auto
              {isAutoEnabled && (
                <span className="ml-auto text-xs opacity-80">
                  {autoSlippage}%
                </span>
              )}
            </Button>
          )}

          {/* Preset buttons */}
          <div className="flex gap-2">
            {PRESET_SLIPPAGES.map(value => (
              <Button
                key={value}
                variant={!isAutoEnabled && slippage === value ? "default" : "outline"}
                size="sm"
                className="flex-1 h-8"
                onClick={() => handlePresetClick(value)}
              >
                {value}%
              </Button>
            ))}
          </div>

          {/* Custom input */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Custom:</span>
            <div className="relative flex-1">
              <Input
                type="text"
                value={!isAutoEnabled && !isPreset ? slippage : customSlippage}
                onChange={(e) => handleCustomChange(e.target.value)}
                placeholder="0.5"
                className="pr-6 h-8 text-sm"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
          </div>

          {/* Auto mode explanation */}
          {isAutoEnabled && autoSlippage && (
            <div className="text-xs text-muted-foreground bg-primary/5 border border-primary/20 p-2 rounded flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <span>
                Auto slippage adjusts based on price impact. Current: <strong>{autoSlippage}%</strong>
              </span>
            </div>
          )}

          {/* Warnings */}
          {!isAutoEnabled && isHighSlippage && (
            <p className="text-xs text-warning bg-warning/10 p-2 rounded">
              ⚠️ High slippage. Your transaction may be frontrun.
            </p>
          )}
          {!isAutoEnabled && isLowSlippage && (
            <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">
              ⚠️ Very low slippage. Transaction may fail.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
