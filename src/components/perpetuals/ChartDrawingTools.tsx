/**
 * Chart Drawing Tools
 * 
 * Provides tools for drawing on the chart: trendlines, horizontal lines, Fibonacci
 * with selection, move, and delete functionality
 */

import { memo, useState, useCallback, useEffect } from 'react';
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
  selectedDrawingId: string | null;
  onDeleteSelected: () => void;
  onClearDrawings: () => void;
  className?: string;
}

const tools: { id: DrawingTool; icon: typeof Pencil; label: string; description: string }[] = [
  { id: 'none', icon: MousePointer, label: 'Select', description: 'Select and edit drawings' },
  { id: 'trendline', icon: TrendingUp, label: 'Trendline', description: 'Draw diagonal trendlines' },
  { id: 'horizontal', icon: Minus, label: 'Horizontal', description: 'Draw horizontal support/resistance' },
  { id: 'ray', icon: GitBranch, label: 'Ray', description: 'Draw infinite ray from point' },
  { id: 'fibonacci', icon: Hash, label: 'Fibonacci', description: 'Fibonacci retracement levels' },
];

export const ChartDrawingTools = memo(function ChartDrawingTools({
  activeTool,
  onToolChange,
  drawings,
  selectedDrawingId,
  onDeleteSelected,
  onClearDrawings,
  className,
}: ChartDrawingToolsProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const activeToolInfo = tools.find(t => t.id === activeTool);
  const hasDrawings = drawings.length > 0;
  const hasSelection = selectedDrawingId !== null;

  // Keyboard shortcut for delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (hasSelection && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) {
          e.preventDefault();
          onDeleteSelected();
        }
      }
      if (e.key === 'Escape') {
        onToolChange('none');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasSelection, onDeleteSelected, onToolChange]);

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
      
      {/* Quick access buttons when a tool is active or selection exists */}
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
      
      {/* Delete selected button */}
      {hasSelection && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={onDeleteSelected}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Delete selected (Del)
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
  
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  
  const addDrawing = useCallback((drawing: Omit<Drawing, 'id' | 'timestamp'>) => {
    const newDrawing: Drawing = {
      ...drawing,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
    };
    
    setDrawings(prev => {
      const updated = [...prev, newDrawing];
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
    return newDrawing;
  }, [storageKey]);
  
  const removeDrawing = useCallback((id: string) => {
    setDrawings(prev => {
      const updated = prev.filter(d => d.id !== id);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
    if (selectedDrawingId === id) {
      setSelectedDrawingId(null);
    }
  }, [storageKey, selectedDrawingId]);
  
  const updateDrawing = useCallback((id: string, points: { time: number; price: number }[]) => {
    setDrawings(prev => {
      const updated = prev.map(d => d.id === id ? { ...d, points } : d);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  }, [storageKey]);
  
  const clearDrawings = useCallback(() => {
    setDrawings([]);
    setSelectedDrawingId(null);
    localStorage.removeItem(storageKey);
  }, [storageKey]);
  
  const deleteSelected = useCallback(() => {
    if (selectedDrawingId) {
      removeDrawing(selectedDrawingId);
    }
  }, [selectedDrawingId, removeDrawing]);
  
  return {
    drawings,
    selectedDrawingId,
    setSelectedDrawingId,
    addDrawing,
    removeDrawing,
    updateDrawing,
    clearDrawings,
    deleteSelected,
  };
}
