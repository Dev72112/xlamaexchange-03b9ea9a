/**
 * Drawings List Panel
 * 
 * Panel showing all drawings per market with visibility toggle, rename, 
 * style customization (color, thickness, dash pattern), and bulk delete
 */

import { memo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  List, 
  Trash2, 
  Eye, 
  EyeOff,
  Pencil,
  TrendingUp,
  Minus,
  GitBranch,
  Hash,
  Palette,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Drawing, DrawingTool } from './ChartDrawingTools';

export interface DrawingStyle {
  color: string;
  lineWidth: number;
  dashPattern: 'solid' | 'dashed' | 'dotted';
}

export interface ExtendedDrawing extends Drawing {
  name?: string;
  visible?: boolean;
  style?: DrawingStyle;
}

interface DrawingsListPanelProps {
  drawings: ExtendedDrawing[];
  selectedDrawingId: string | null;
  onSelectDrawing: (id: string | null) => void;
  onUpdateDrawing: (id: string, updates: Partial<ExtendedDrawing>) => void;
  onRemoveDrawing: (id: string) => void;
  onClearDrawings: () => void;
  className?: string;
}

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#ef4444', // red
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#ffffff', // white
];

const LINE_WIDTHS = [1, 1.5, 2, 2.5, 3];
const DASH_PATTERNS: { value: 'solid' | 'dashed' | 'dotted'; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
];

function getDrawingIcon(type: DrawingTool) {
  switch (type) {
    case 'trendline': return TrendingUp;
    case 'horizontal': return Minus;
    case 'ray': return GitBranch;
    case 'fibonacci': return Hash;
    default: return Pencil;
  }
}

function getDrawingLabel(type: DrawingTool) {
  switch (type) {
    case 'trendline': return 'Trendline';
    case 'horizontal': return 'Horizontal';
    case 'ray': return 'Ray';
    case 'fibonacci': return 'Fibonacci';
    default: return 'Drawing';
  }
}

function formatPrice(price: number): string {
  return price.toLocaleString(undefined, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
}

export const DrawingsListPanel = memo(function DrawingsListPanel({
  drawings,
  selectedDrawingId,
  onSelectDrawing,
  onUpdateDrawing,
  onRemoveDrawing,
  onClearDrawings,
  className,
}: DrawingsListPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const visibleCount = drawings.filter(d => d.visible !== false).length;
  const hiddenCount = drawings.length - visibleCount;

  const handleStartRename = useCallback((drawing: ExtendedDrawing) => {
    setEditingId(drawing.id);
    setEditName(drawing.name || getDrawingLabel(drawing.type));
  }, []);

  const handleSaveRename = useCallback((id: string) => {
    if (editName.trim()) {
      onUpdateDrawing(id, { name: editName.trim() });
    }
    setEditingId(null);
    setEditName('');
  }, [editName, onUpdateDrawing]);

  const handleToggleVisibility = useCallback((drawing: ExtendedDrawing) => {
    onUpdateDrawing(drawing.id, { visible: !(drawing.visible !== false) });
  }, [onUpdateDrawing]);

  const handleColorChange = useCallback((id: string, color: string) => {
    onUpdateDrawing(id, { color });
  }, [onUpdateDrawing]);

  const handleStyleChange = useCallback((id: string, style: Partial<DrawingStyle>, drawing: ExtendedDrawing) => {
    const currentStyle = drawing.style || { color: drawing.color, lineWidth: 1.5, dashPattern: 'solid' as const };
    onUpdateDrawing(id, { 
      style: { ...currentStyle, ...style } 
    });
  }, [onUpdateDrawing]);

  const handleBulkHide = useCallback(() => {
    drawings.forEach(d => {
      if (d.visible !== false) {
        onUpdateDrawing(d.id, { visible: false });
      }
    });
  }, [drawings, onUpdateDrawing]);

  const handleBulkShow = useCallback(() => {
    drawings.forEach(d => {
      if (d.visible === false) {
        onUpdateDrawing(d.id, { visible: true });
      }
    });
  }, [drawings, onUpdateDrawing]);

  if (drawings.length === 0) {
    return null;
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-7 gap-1.5", className)}
        >
          <List className="w-3.5 h-3.5" />
          Drawings
          <Badge variant="secondary" className="h-4 px-1 text-[10px]">
            {drawings.length}
          </Badge>
          {hiddenCount > 0 && (
            <Badge variant="outline" className="h-4 px-1 text-[10px] text-muted-foreground">
              {hiddenCount} hidden
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[360px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Pencil className="w-4 h-4" />
            Drawings
            <Badge variant="secondary" className="ml-auto">
              {drawings.length} total
            </Badge>
          </SheetTitle>
        </SheetHeader>

        {/* Bulk actions */}
        <div className="flex items-center gap-2 mt-4 pb-3 border-b border-border">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleBulkShow}
            disabled={hiddenCount === 0}
          >
            <Eye className="w-3.5 h-3.5 mr-1" />
            Show All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleBulkHide}
            disabled={visibleCount === 0}
          >
            <EyeOff className="w-3.5 h-3.5 mr-1" />
            Hide All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-destructive hover:text-destructive ml-auto"
            onClick={() => {
              onClearDrawings();
              setIsOpen(false);
            }}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Clear All
          </Button>
        </div>

        {/* Drawings list */}
        <ScrollArea className="h-[calc(100vh-180px)] mt-3">
          <div className="space-y-2 pr-3">
            {drawings.map((drawing) => {
              const Icon = getDrawingIcon(drawing.type);
              const isSelected = drawing.id === selectedDrawingId;
              const isVisible = drawing.visible !== false;
              const displayName = drawing.name || getDrawingLabel(drawing.type);
              const isEditing = editingId === drawing.id;

              return (
                <div
                  key={drawing.id}
                  className={cn(
                    "p-3 rounded-lg border transition-colors cursor-pointer",
                    isSelected 
                      ? "border-primary bg-primary/10" 
                      : "border-border hover:border-primary/50 hover:bg-secondary/50",
                    !isVisible && "opacity-50"
                  )}
                  onClick={() => onSelectDrawing(isSelected ? null : drawing.id)}
                >
                  <div className="flex items-center gap-2">
                    {/* Icon with color indicator */}
                    <div 
                      className="w-6 h-6 rounded flex items-center justify-center"
                      style={{ backgroundColor: drawing.color + '20' }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: drawing.color }} />
                    </div>

                    {/* Name / Edit */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={() => handleSaveRename(drawing.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(drawing.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="h-6 text-xs"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span 
                          className="text-sm font-medium truncate block"
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            handleStartRename(drawing);
                          }}
                        >
                          {displayName}
                        </span>
                      )}
                      
                      {/* Price info */}
                      <span className="text-[10px] text-muted-foreground">
                        ${formatPrice(drawing.points[0]?.price || 0)}
                        {drawing.points.length > 1 && (
                          <> → ${formatPrice(drawing.points[1]?.price || 0)}</>
                        )}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {/* Visibility toggle */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleToggleVisibility(drawing)}
                      >
                        {isVisible ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                      </Button>

                      {/* Style customization popover */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                          >
                            <Palette className="w-3.5 h-3.5" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-3" align="end">
                          <div className="space-y-3">
                            {/* Color picker */}
                            <div className="space-y-1.5">
                              <Label className="text-xs">Color</Label>
                              <div className="flex flex-wrap gap-1.5">
                                {PRESET_COLORS.map((color) => (
                                  <button
                                    key={color}
                                    className={cn(
                                      "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                                      drawing.color === color 
                                        ? "border-primary ring-2 ring-primary/30" 
                                        : "border-transparent"
                                    )}
                                    style={{ backgroundColor: color }}
                                    onClick={() => handleColorChange(drawing.id, color)}
                                  >
                                    {drawing.color === color && (
                                      <Check className="w-3 h-3 mx-auto text-background" />
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Line width */}
                            <div className="space-y-1.5">
                              <Label className="text-xs">Thickness</Label>
                              <div className="flex gap-1">
                                {LINE_WIDTHS.map((width) => (
                                  <Button
                                    key={width}
                                    variant={(drawing.style?.lineWidth || 1.5) === width ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => handleStyleChange(drawing.id, { lineWidth: width }, drawing)}
                                  >
                                    {width}
                                  </Button>
                                ))}
                              </div>
                            </div>

                            {/* Dash pattern */}
                            <div className="space-y-1.5">
                              <Label className="text-xs">Style</Label>
                              <Select
                                value={drawing.style?.dashPattern || 'solid'}
                                onValueChange={(value) => handleStyleChange(drawing.id, { dashPattern: value as 'solid' | 'dashed' | 'dotted' }, drawing)}
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {DASH_PATTERNS.map((pattern) => (
                                    <SelectItem key={pattern.value} value={pattern.value}>
                                      {pattern.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>

                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => onRemoveDrawing(drawing.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
});
