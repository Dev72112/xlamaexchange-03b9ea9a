/**
 * Chart Drawing Canvas
 * 
 * Canvas overlay for drawing trendlines, horizontal lines, Fibonacci retracements
 * with selection, move, and delete functionality
 */

import { memo, useRef, useEffect, useState, useCallback } from 'react';
import { Drawing, DrawingTool } from './ChartDrawingTools';
import { cn } from '@/lib/utils';

interface Point {
  x: number;
  y: number;
}

interface ChartDrawingCanvasProps {
  width: number;
  height: number;
  activeTool: DrawingTool;
  drawings: Drawing[];
  onAddDrawing: (drawing: Omit<Drawing, 'id' | 'timestamp'>) => void;
  onRemoveDrawing: (id: string) => void;
  onUpdateDrawing: (id: string, points: { time: number; price: number }[]) => void;
  selectedDrawingId: string | null;
  onSelectDrawing: (id: string | null) => void;
  priceToY: (price: number) => number;
  yToPrice: (y: number) => number;
  timeToX: (time: number) => number;
  xToTime: (x: number) => number;
  className?: string;
}

const FIBONACCI_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const FIBONACCI_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];
// Significantly increased touch tolerance for mobile devices
const HIT_TOLERANCE = typeof window !== 'undefined' && 'ontouchstart' in window ? 32 : 12;
const CONTROL_POINT_RADIUS = typeof window !== 'undefined' && 'ontouchstart' in window ? 16 : 8;

// Get color based on tool type
function getDrawingColor(type: DrawingTool): string {
  switch (type) {
    case 'trendline': return '#3b82f6';
    case 'horizontal': return '#22c55e';
    case 'ray': return '#f97316';
    case 'fibonacci': return '#8b5cf6';
    default: return '#888888';
  }
}

// Check if point is near a line segment
function distanceToLineSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  
  if (lengthSquared === 0) {
    return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  }
  
  let t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
  const nearestX = x1 + t * dx;
  const nearestY = y1 + t * dy;
  
  return Math.sqrt((px - nearestX) ** 2 + (py - nearestY) ** 2);
}

// Check if point is near a horizontal line
function distanceToHorizontalLine(py: number, lineY: number): number {
  return Math.abs(py - lineY);
}

export const ChartDrawingCanvas = memo(function ChartDrawingCanvas({
  width,
  height,
  activeTool,
  drawings,
  onAddDrawing,
  onRemoveDrawing,
  onUpdateDrawing,
  selectedDrawingId,
  onSelectDrawing,
  priceToY,
  yToPrice,
  timeToX,
  xToTime,
  className,
}: ChartDrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPointIndex, setDragPointIndex] = useState<number | null>(null);
  const [dragStartPos, setDragStartPos] = useState<Point | null>(null);

  // Find drawing at position
  const findDrawingAtPoint = useCallback((x: number, y: number): string | null => {
    for (let i = drawings.length - 1; i >= 0; i--) {
      const drawing = drawings[i];
      
      switch (drawing.type) {
        case 'horizontal': {
          const lineY = priceToY(drawing.points[0].price);
          if (distanceToHorizontalLine(y, lineY) <= HIT_TOLERANCE) {
            return drawing.id;
          }
          break;
        }
        
        case 'trendline': {
          if (drawing.points.length < 2) break;
          const x1 = timeToX(drawing.points[0].time);
          const y1 = priceToY(drawing.points[0].price);
          const x2 = timeToX(drawing.points[1].time);
          const y2 = priceToY(drawing.points[1].price);
          
          if (distanceToLineSegment(x, y, x1, y1, x2, y2) <= HIT_TOLERANCE) {
            return drawing.id;
          }
          break;
        }
        
        case 'ray': {
          if (drawing.points.length < 2) break;
          const x1 = timeToX(drawing.points[0].time);
          const y1 = priceToY(drawing.points[0].price);
          const x2 = timeToX(drawing.points[1].time);
          const y2 = priceToY(drawing.points[1].price);
          
          // Extend ray to edge
          const dx = x2 - x1;
          const dy = y2 - y1;
          let extendedX = x2;
          let extendedY = y2;
          
          if (dx !== 0) {
            const scale = (width - x1) / dx;
            if (scale > 0) {
              extendedX = x1 + dx * scale;
              extendedY = y1 + dy * scale;
            }
          }
          
          if (distanceToLineSegment(x, y, x1, y1, extendedX, extendedY) <= HIT_TOLERANCE) {
            return drawing.id;
          }
          break;
        }
        
        case 'fibonacci': {
          if (drawing.points.length < 2) break;
          const startY = priceToY(drawing.points[0].price);
          const endY = priceToY(drawing.points[1].price);
          
          // Check each Fibonacci level
          for (const level of FIBONACCI_LEVELS) {
            const levelY = startY + (endY - startY) * level;
            if (distanceToHorizontalLine(y, levelY) <= HIT_TOLERANCE) {
              return drawing.id;
            }
          }
          break;
        }
      }
    }
    return null;
  }, [drawings, priceToY, timeToX, width]);

  // Find which control point is being clicked - larger touch target for mobile
  const findControlPointAtPosition = useCallback((x: number, y: number, drawing: Drawing): number | null => {
    for (let i = 0; i < drawing.points.length; i++) {
      const px = timeToX(drawing.points[i].time);
      const py = priceToY(drawing.points[i].price);
      const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
      // Use larger touch target for control points
      if (dist <= CONTROL_POINT_RADIUS * 2) {
        return i;
      }
    }
    return null;
  }, [timeToX, priceToY]);

  // Draw all saved drawings and active drawing
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas resolution for sharp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw saved drawings
    drawings.forEach(drawing => {
      if (drawing.points.length < 1) return;
      
      const isSelected = drawing.id === selectedDrawingId;
      const baseColor = drawing.color;
      
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.setLineDash([]);

      switch (drawing.type) {
        case 'horizontal': {
          const y = priceToY(drawing.points[0].price);
          if (y >= 0 && y <= height) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();

            // Price label
            ctx.fillStyle = baseColor;
            ctx.font = '10px Inter, sans-serif';
            const priceText = drawing.points[0].price.toLocaleString(undefined, { 
              minimumFractionDigits: 2,
              maximumFractionDigits: 2 
            });
            ctx.fillText(`$${priceText}`, width - 70, y - 4);
            
            // Control point when selected - larger for touch
            if (isSelected) {
              ctx.beginPath();
              ctx.arc(width / 2, y, CONTROL_POINT_RADIUS, 0, Math.PI * 2);
              ctx.fillStyle = baseColor;
              ctx.fill();
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 2;
              ctx.stroke();
            }
          }
          break;
        }

        case 'trendline': {
          if (drawing.points.length < 2) return;
          const x1 = timeToX(drawing.points[0].time);
          const y1 = priceToY(drawing.points[0].price);
          const x2 = timeToX(drawing.points[1].time);
          const y2 = priceToY(drawing.points[1].price);

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          // Draw end points - larger for touch
          const pointSize = isSelected ? CONTROL_POINT_RADIUS : CONTROL_POINT_RADIUS * 0.6;
          ctx.beginPath();
          ctx.arc(x1, y1, pointSize, 0, Math.PI * 2);
          ctx.arc(x2, y2, pointSize, 0, Math.PI * 2);
          ctx.fillStyle = baseColor;
          ctx.fill();
          
          if (isSelected) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x1, y1, CONTROL_POINT_RADIUS, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(x2, y2, CONTROL_POINT_RADIUS, 0, Math.PI * 2);
            ctx.stroke();
          }
          break;
        }

        case 'ray': {
          if (drawing.points.length < 2) return;
          const x1 = timeToX(drawing.points[0].time);
          const y1 = priceToY(drawing.points[0].price);
          const x2 = timeToX(drawing.points[1].time);
          const y2 = priceToY(drawing.points[1].price);

          // Extend line to edge of canvas
          const dx = x2 - x1;
          const dy = y2 - y1;
          let extendedX = x2;
          let extendedY = y2;

          if (dx !== 0) {
            const scale = (width - x1) / dx;
            if (scale > 0) {
              extendedX = x1 + dx * scale;
              extendedY = y1 + dy * scale;
            }
          }

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(extendedX, extendedY);
          ctx.stroke();

          // Draw origin point - larger for touch
          const rayPointSize = isSelected ? CONTROL_POINT_RADIUS : CONTROL_POINT_RADIUS * 0.8;
          ctx.beginPath();
          ctx.arc(x1, y1, rayPointSize, 0, Math.PI * 2);
          ctx.fillStyle = baseColor;
          ctx.fill();
          
          if (isSelected) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Second control point
            ctx.beginPath();
            ctx.arc(x2, y2, CONTROL_POINT_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = baseColor;
            ctx.fill();
            ctx.stroke();
          }
          break;
        }

        case 'fibonacci': {
          if (drawing.points.length < 2) return;
          const startPrice = drawing.points[0].price;
          const endPrice = drawing.points[1].price;
          const priceDiff = endPrice - startPrice;

          FIBONACCI_LEVELS.forEach((level, i) => {
            const levelPrice = startPrice + priceDiff * level;
            const y = priceToY(levelPrice);

            if (y >= 0 && y <= height) {
              ctx.strokeStyle = FIBONACCI_COLORS[i];
              ctx.setLineDash([4, 2]);
              ctx.lineWidth = isSelected ? 1.5 : 1;
              ctx.beginPath();
              ctx.moveTo(0, y);
              ctx.lineTo(width, y);
              ctx.stroke();

              // Level label
              ctx.fillStyle = FIBONACCI_COLORS[i];
              ctx.font = '10px Inter, sans-serif';
              const percentText = (level * 100).toFixed(1);
              const priceText = levelPrice.toLocaleString(undefined, { 
                minimumFractionDigits: 2,
                maximumFractionDigits: 2 
              });
              ctx.fillText(`${percentText}% - $${priceText}`, 8, y - 4);
            }
          });
          
          // Control points when selected - larger for touch
          if (isSelected) {
            const y1 = priceToY(drawing.points[0].price);
            const y2 = priceToY(drawing.points[1].price);
            ctx.setLineDash([]);
            ctx.fillStyle = FIBONACCI_COLORS[0];
            ctx.beginPath();
            ctx.arc(50, y1, CONTROL_POINT_RADIUS, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.fillStyle = FIBONACCI_COLORS[6];
            ctx.beginPath();
            ctx.arc(50, y2, CONTROL_POINT_RADIUS, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
          ctx.setLineDash([]);
          break;
        }
      }
    });

    // Draw active drawing preview
    if (isDrawing && startPoint && currentPoint && activeTool !== 'none') {
      const color = getDrawingColor(activeTool);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);

      switch (activeTool) {
        case 'horizontal': {
          ctx.beginPath();
          ctx.moveTo(0, startPoint.y);
          ctx.lineTo(width, startPoint.y);
          ctx.stroke();

          // Preview price
          const price = yToPrice(startPoint.y);
          ctx.fillStyle = color;
          ctx.font = '10px Inter, sans-serif';
          ctx.fillText(`$${price.toLocaleString()}`, width - 70, startPoint.y - 4);
          break;
        }

        case 'trendline': {
          ctx.beginPath();
          ctx.moveTo(startPoint.x, startPoint.y);
          ctx.lineTo(currentPoint.x, currentPoint.y);
          ctx.stroke();
          break;
        }

        case 'ray': {
          const dx = currentPoint.x - startPoint.x;
          const dy = currentPoint.y - startPoint.y;
          let extendedX = currentPoint.x;
          let extendedY = currentPoint.y;

          if (dx !== 0) {
            const scale = (width - startPoint.x) / dx;
            if (scale > 0) {
              extendedX = startPoint.x + dx * scale;
              extendedY = startPoint.y + dy * scale;
            }
          }

          ctx.beginPath();
          ctx.moveTo(startPoint.x, startPoint.y);
          ctx.lineTo(extendedX, extendedY);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(startPoint.x, startPoint.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
          break;
        }

        case 'fibonacci': {
          const startY = startPoint.y;
          const endY = currentPoint.y;

          FIBONACCI_LEVELS.forEach((level, i) => {
            const levelY = startY + (endY - startY) * level;

            if (levelY >= 0 && levelY <= height) {
              ctx.strokeStyle = FIBONACCI_COLORS[i];
              ctx.setLineDash([4, 2]);
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(0, levelY);
              ctx.lineTo(width, levelY);
              ctx.stroke();
            }
          });
          break;
        }
      }
      ctx.setLineDash([]);
    }
  }, [width, height, drawings, activeTool, isDrawing, startPoint, currentPoint, priceToY, timeToX, yToPrice, selectedDrawingId]);

  // Redraw on changes
  useEffect(() => {
    draw();
  }, [draw]);

  // Prevent default touch behavior to avoid scroll conflicts
  const preventTouchDefault = useCallback((e: TouchEvent) => {
    if (activeTool !== 'none' || selectedDrawingId !== null) {
      e.preventDefault();
    }
  }, [activeTool, selectedDrawingId]);

  // Add touch event prevention when drawing is active
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.addEventListener('touchstart', preventTouchDefault, { passive: false });
    canvas.addEventListener('touchmove', preventTouchDefault, { passive: false });
    
    return () => {
      canvas.removeEventListener('touchstart', preventTouchDefault);
      canvas.removeEventListener('touchmove', preventTouchDefault);
    };
  }, [preventTouchDefault]);

  // Mouse/touch handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Prevent default to avoid scroll on touch devices
    if (e.pointerType === 'touch' && (activeTool !== 'none' || selectedDrawingId !== null)) {
      e.preventDefault();
    }

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // If no active tool, check for selection/dragging
    if (activeTool === 'none') {
      // Check if clicking on a selected drawing's control point
      if (selectedDrawingId) {
        const selectedDrawing = drawings.find(d => d.id === selectedDrawingId);
        if (selectedDrawing) {
          const pointIndex = findControlPointAtPosition(x, y, selectedDrawing);
          if (pointIndex !== null) {
            setIsDragging(true);
            setDragPointIndex(pointIndex);
            setDragStartPos({ x, y });
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            return;
          }
        }
      }
      
      // Otherwise, check for selection
      const hitId = findDrawingAtPoint(x, y);
      onSelectDrawing(hitId);
      return;
    }

    // Drawing mode
    setIsDrawing(true);
    setStartPoint({ x, y });
    setCurrentPoint({ x, y });
    onSelectDrawing(null);
    
    // Capture pointer for smooth drawing
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [activeTool, selectedDrawingId, drawings, findDrawingAtPoint, findControlPointAtPosition, onSelectDrawing]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Handle dragging control point
    if (isDragging && selectedDrawingId && dragPointIndex !== null) {
      const selectedDrawing = drawings.find(d => d.id === selectedDrawingId);
      if (selectedDrawing) {
        const newPoints = [...selectedDrawing.points];
        newPoints[dragPointIndex] = {
          time: xToTime(x),
          price: yToPrice(y),
        };
        onUpdateDrawing(selectedDrawingId, newPoints);
      }
      return;
    }

    if (!isDrawing || activeTool === 'none') return;
    setCurrentPoint({ x, y });
  }, [isDrawing, activeTool, isDragging, selectedDrawingId, dragPointIndex, drawings, xToTime, yToPrice, onUpdateDrawing]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    // Release pointer capture
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    // Handle end of dragging
    if (isDragging) {
      setIsDragging(false);
      setDragPointIndex(null);
      setDragStartPos(null);
      return;
    }

    if (!isDrawing || !startPoint || !currentPoint || activeTool === 'none') {
      setIsDrawing(false);
      setStartPoint(null);
      setCurrentPoint(null);
      return;
    }

    // Create drawing
    const points: { time: number; price: number }[] = [];

    if (activeTool === 'horizontal') {
      points.push({
        time: xToTime(startPoint.x),
        price: yToPrice(startPoint.y),
      });
    } else {
      points.push({
        time: xToTime(startPoint.x),
        price: yToPrice(startPoint.y),
      });
      points.push({
        time: xToTime(currentPoint.x),
        price: yToPrice(currentPoint.y),
      });
    }

    onAddDrawing({
      type: activeTool,
      points,
      color: getDrawingColor(activeTool),
    });

    setIsDrawing(false);
    setStartPoint(null);
    setCurrentPoint(null);
  }, [isDrawing, startPoint, currentPoint, activeTool, xToTime, yToPrice, onAddDrawing, isDragging]);

  // Determine cursor style
  const getCursorStyle = useCallback(() => {
    if (activeTool !== 'none') return 'crosshair';
    if (isDragging) return 'grabbing';
    return 'default';
  }, [activeTool, isDragging]);

  // Only capture pointer events when drawing or selecting
  const shouldCaptureEvents = activeTool !== 'none' || selectedDrawingId !== null;

  return (
    <canvas
      ref={canvasRef}
      style={{ 
        width, 
        height, 
        cursor: getCursorStyle(),
        pointerEvents: shouldCaptureEvents ? 'auto' : 'none',
      }}
      className={cn("absolute inset-0 z-10", className)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    />
  );
});
