/**
 * Floating Toolbar for Selected Chart Drawings
 * 
 * Displays quick actions (Move, Color, Delete) near the selected drawing
 */

import { memo, useState, useEffect, useRef } from 'react';
import { Move, Palette, Trash2, Check, GripHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Drawing } from './ChartDrawingTools';

interface DrawingFloatingToolbarProps {
  drawing: Drawing | null;
  chartWidth: number;
  chartHeight: number;
  priceToY: (price: number) => number;
  timeToX: (time: number) => number;
  onUpdateColor: (id: string, color: string) => void;
  onDelete: (id: string) => void;
  onStartMove: () => void;
  className?: string;
}

const COLORS = [
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#ffffff', // White
];

export const DrawingFloatingToolbar = memo(function DrawingFloatingToolbar({
  drawing,
  chartWidth,
  chartHeight,
  priceToY,
  timeToX,
  onUpdateColor,
  onDelete,
  onStartMove,
  className,
}: DrawingFloatingToolbarProps) {
  const [colorOpen, setColorOpen] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  
  // Calculate toolbar position based on drawing
  const getToolbarPosition = () => {
    if (!drawing || drawing.points.length === 0) {
      return { x: 0, y: 0, visible: false };
    }
    
    // Get the center/average position of the drawing
    let avgX = 0;
    let avgY = 0;
    
    if (drawing.type === 'horizontal') {
      avgX = chartWidth / 2;
      avgY = priceToY(drawing.points[0].price);
    } else if (drawing.points.length >= 2) {
      const x1 = timeToX(drawing.points[0].time);
      const y1 = priceToY(drawing.points[0].price);
      const x2 = timeToX(drawing.points[1].time);
      const y2 = priceToY(drawing.points[1].price);
      avgX = (x1 + x2) / 2;
      avgY = Math.min(y1, y2); // Position above the line
    } else {
      avgX = timeToX(drawing.points[0].time);
      avgY = priceToY(drawing.points[0].price);
    }
    
    // Clamp to chart bounds with padding
    const padding = 100;
    avgX = Math.max(padding, Math.min(chartWidth - padding, avgX));
    avgY = Math.max(40, Math.min(chartHeight - 60, avgY));
    
    return { x: avgX, y: avgY - 36, visible: true };
  };
  
  const position = getToolbarPosition();
  
  // Close color picker when drawing changes
  useEffect(() => {
    setColorOpen(false);
  }, [drawing?.id]);
  
  if (!drawing || !position.visible) {
    return null;
  }
  
  return (
    <div
      ref={toolbarRef}
      className={cn(
        "absolute z-20 flex items-center gap-1 px-1.5 py-1 rounded-lg bg-popover/95 backdrop-blur-sm border border-border shadow-lg",
        "animate-in fade-in-0 zoom-in-95 duration-150",
        className
      )}
      style={{
        left: position.x,
        top: position.y,
        transform: 'translateX(-50%)',
      }}
    >
      {/* Drag indicator */}
      <div className="flex items-center px-1 text-muted-foreground">
        <GripHorizontal className="w-3 h-3" />
      </div>
      
      {/* Move button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 hover:bg-secondary"
        onClick={onStartMove}
        title="Select and drag control points to move"
      >
        <Move className="w-3.5 h-3.5" />
      </Button>
      
      {/* Color picker */}
      <Popover open={colorOpen} onOpenChange={setColorOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-secondary"
            title="Change color"
          >
            <Palette className="w-3.5 h-3.5" style={{ color: drawing.color }} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" side="top" align="center">
          <div className="grid grid-cols-3 gap-1">
            {COLORS.map((color) => (
              <button
                key={color}
                className={cn(
                  "w-7 h-7 rounded-md border-2 transition-transform hover:scale-110",
                  drawing.color === color ? "border-primary ring-1 ring-primary" : "border-transparent"
                )}
                style={{ backgroundColor: color }}
                onClick={() => {
                  onUpdateColor(drawing.id, color);
                  setColorOpen(false);
                }}
              >
                {drawing.color === color && (
                  <Check className="w-4 h-4 mx-auto text-background" />
                )}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      
      {/* Delete button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 hover:bg-destructive/10 text-destructive"
        onClick={() => onDelete(drawing.id)}
        title="Delete drawing"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
});
