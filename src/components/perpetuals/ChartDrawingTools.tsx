/**
 * Chart Drawing Tools
 * 
 * Provides tools for drawing on the chart: trendlines, horizontal lines, Fibonacci
 */

import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Pencil, 
  TrendingUp, 
  Minus, 
  Hash, 
  Trash2,
  MousePointer,
  GitBranch
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type DrawingTool = 'none' | 'trendline' | 'horizontal' | 'fibonacci' | 'ray';

export interface Drawing {
  id: string;
  type: DrawingTool;
  points: { time: number; price: number }[];
  color: string;
  timestamp: number;
}

interface ChartDrawingToolsProps {
  activeTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  drawings: Drawing[];
  onClearDrawings: () => void;
  className?: string;
}

const tools: { id: DrawingTool; icon: typeof Pencil; label: string; description: string }[] = [
  { id: 'none', icon: MousePointer, label: 'Select', description: 'Default cursor mode' },
  { id: 'trendline', icon: TrendingUp, label: 'Trendline', description: 'Draw diagonal trendlines' },
  { id: 'horizontal', icon: Minus, label: 'Horizontal', description: 'Draw horizontal support/resistance' },
  { id: 'ray', icon: GitBranch, label: 'Ray', description: 'Draw infinite ray from point' },
  { id: 'fibonacci', icon: Hash, label: 'Fibonacci', description: 'Fibonacci retracement levels' },
];

export const ChartDrawingTools = memo(function ChartDrawingTools({
  activeTool,
  onToolChange,
  drawings,
  onClearDrawings,
  className,
}: ChartDrawingToolsProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const activeToolInfo = tools.find(t => t.id === activeTool);
  const hasDrawings = drawings.length > 0;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={activeTool !== 'none' ? 'default' : 'outline'}
            size="sm"
            className="h-7 gap-1.5"
          >
            <Pencil className="w-3.5 h-3.5" />
            Draw
            {hasDrawings && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                {drawings.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground px-2 pb-1">Drawing Tools</p>
            {tools.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.id;
              
              return (
                <Button
                  key={tool.id}
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  className="w-full justify-start gap-2 h-8"
                  onClick={() => {
                    onToolChange(tool.id);
                    if (tool.id !== 'none') {
                      setIsOpen(false);
                    }
                  }}
                >
                  <Icon className="w-4 h-4" />
                  <span className="flex-1 text-left">{tool.label}</span>
                  {isActive && tool.id !== 'none' && (
                    <Badge variant="outline" className="h-4 px-1 text-[10px]">
                      Active
                    </Badge>
                  )}
                </Button>
              );
            })}
            
            {hasDrawings && (
              <>
                <div className="border-t border-border my-2" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 h-8 text-destructive hover:text-destructive"
                  onClick={() => {
                    onClearDrawings();
                    onToolChange('none');
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All ({drawings.length})
                </Button>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
      
      {/* Quick access buttons when a tool is active */}
      {activeTool !== 'none' && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onToolChange('none')}
            >
              <MousePointer className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Exit drawing mode (ESC)
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
});

// Hook for managing drawings with localStorage persistence
export function useChartDrawings(coin: string) {
  const storageKey = `xlama-chart-drawings-${coin}`;
  
  const [drawings, setDrawings] = useState<Drawing[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  const addDrawing = (drawing: Omit<Drawing, 'id' | 'timestamp'>) => {
    const newDrawing: Drawing = {
      ...drawing,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
    };
    
    const updated = [...drawings, newDrawing];
    setDrawings(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    return newDrawing;
  };
  
  const removeDrawing = (id: string) => {
    const updated = drawings.filter(d => d.id !== id);
    setDrawings(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };
  
  const clearDrawings = () => {
    setDrawings([]);
    localStorage.removeItem(storageKey);
  };
  
  return {
    drawings,
    addDrawing,
    removeDrawing,
    clearDrawings,
  };
}
