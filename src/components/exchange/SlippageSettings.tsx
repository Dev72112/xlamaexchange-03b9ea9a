import { useState } from "react";
import { Settings, Info } from "lucide-react";
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
}

const PRESET_SLIPPAGES = ['0.1', '0.5', '1.0', '3.0'];

export function SlippageSettings({ slippage, onSlippageChange }: SlippageSettingsProps) {
  const [open, setOpen] = useState(false);
  const [customSlippage, setCustomSlippage] = useState("");

  const isPreset = PRESET_SLIPPAGES.includes(slippage);
  const isHighSlippage = parseFloat(slippage) >= 5;
  const isLowSlippage = parseFloat(slippage) < 0.1;

  const handlePresetClick = (value: string) => {
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
      onSlippageChange(formatted);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 px-2 gap-1.5 text-xs",
            isHighSlippage && "text-warning",
            isLowSlippage && "text-destructive"
          )}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>{slippage}%</span>
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

          {/* Preset buttons */}
          <div className="flex gap-2">
            {PRESET_SLIPPAGES.map(value => (
              <Button
                key={value}
                variant={slippage === value ? "default" : "outline"}
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
                value={!isPreset ? slippage : customSlippage}
                onChange={(e) => handleCustomChange(e.target.value)}
                placeholder="0.5"
                className="pr-6 h-8 text-sm"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
          </div>

          {/* Warnings */}
          {isHighSlippage && (
            <p className="text-xs text-warning bg-warning/10 p-2 rounded">
              ⚠️ High slippage. Your transaction may be frontrun.
            </p>
          )}
          {isLowSlippage && (
            <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">
              ⚠️ Very low slippage. Transaction may fail.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
