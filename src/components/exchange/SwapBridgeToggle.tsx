import { ArrowRightLeft, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";

export type SwapMode = 'swap' | 'bridge';

interface SwapBridgeToggleProps {
  mode: SwapMode;
  onModeChange: (mode: SwapMode) => void;
  disabled?: boolean;
}

export function SwapBridgeToggle({ mode, onModeChange, disabled }: SwapBridgeToggleProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-secondary/50 rounded-lg border border-border">
      <button
        onClick={() => onModeChange('swap')}
        disabled={disabled}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
          mode === 'swap' 
            ? "bg-background text-foreground shadow-sm" 
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Repeat className="w-3 h-3" />
        Swap
      </button>
      <button
        onClick={() => onModeChange('bridge')}
        disabled={disabled}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
          mode === 'bridge' 
            ? "bg-background text-foreground shadow-sm" 
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <ArrowRightLeft className="w-3 h-3" />
        Bridge
      </button>
    </div>
  );
}
