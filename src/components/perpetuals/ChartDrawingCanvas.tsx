/**
 * Chart Drawing Canvas
 * 
 * Canvas overlay for drawing trendlines, horizontal lines, Fibonacci retracements
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
  priceToY: (price: number) => number;
  yToPrice: (y: number) => number;
  timeToX: (time: number) => number;
  xToTime: (x: number) => number;
  className?: string;
}

const FIBONACCI_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const FIBONACCI_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

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

export const ChartDrawingCanvas = memo(function ChartDrawingCanvas({
  width,
  height,
  activeTool,
  drawings,
  onAddDrawing,
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

      ctx.strokeStyle = drawing.color;
      ctx.lineWidth = 1.5;
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
            ctx.fillStyle = drawing.color;
            ctx.font = '10px Inter, sans-serif';
            const priceText = drawing.points[0].price.toLocaleString(undefined, { 
              minimumFractionDigits: 2,
              maximumFractionDigits: 2 
            });
            ctx.fillText(`$${priceText}`, width - 70, y - 4);
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

          // Draw end points
          ctx.beginPath();
          ctx.arc(x1, y1, 3, 0, Math.PI * 2);
          ctx.arc(x2, y2, 3, 0, Math.PI * 2);
          ctx.fillStyle = drawing.color;
          ctx.fill();
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

          // Draw origin point
          ctx.beginPath();
          ctx.arc(x1, y1, 4, 0, Math.PI * 2);
          ctx.fillStyle = drawing.color;
          ctx.fill();
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
              ctx.lineWidth = 1;
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
          const startPrice = yToPrice(startPoint.y);
          const endPrice = yToPrice(currentPoint.y);
          const priceDiff = endPrice - startPrice;

          FIBONACCI_LEVELS.forEach((level, i) => {
            const levelY = startPoint.y + (currentPoint.y - startPoint.y) * level;

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
  }, [width, height, drawings, activeTool, isDrawing, startPoint, currentPoint, priceToY, timeToX, yToPrice]);

  // Redraw on changes
  useEffect(() => {
    draw();
  }, [draw]);

  // Mouse/touch handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (activeTool === 'none') return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setStartPoint({ x, y });
    setCurrentPoint({ x, y });
    
    // Capture pointer for smooth drawing
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [activeTool]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawing || activeTool === 'none') return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentPoint({ x, y });
  }, [isDrawing, activeTool]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDrawing || !startPoint || !currentPoint || activeTool === 'none') {
      setIsDrawing(false);
      setStartPoint(null);
      setCurrentPoint(null);
      return;
    }

    // Release pointer capture
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

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
  }, [isDrawing, startPoint, currentPoint, activeTool, xToTime, yToPrice, onAddDrawing]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className={cn(
        "absolute inset-0 z-10",
        activeTool !== 'none' && "cursor-crosshair",
        className
      )}
      onPointerDown={activeTool !== 'none' ? handlePointerDown : undefined}
      onPointerMove={activeTool !== 'none' ? handlePointerMove : undefined}
      onPointerUp={activeTool !== 'none' ? handlePointerUp : undefined}
      onPointerLeave={activeTool !== 'none' ? handlePointerUp : undefined}
    />
  );
});
