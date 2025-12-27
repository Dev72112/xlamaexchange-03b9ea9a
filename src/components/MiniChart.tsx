import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface MiniChartProps {
  data?: number[];
  width?: number;
  height?: number;
  className?: string;
  positive?: boolean;
  /** Used to generate deterministic random data when no data is provided */
  seed?: string;
}

// Simple seeded random number generator for deterministic charts
function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return () => {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    return (hash % 1000) / 1000;
  };
}

export function MiniChart({ 
  data, 
  width = 80, 
  height = 32, 
  className,
  positive = true,
  seed = "default"
}: MiniChartProps) {
  const chartData = useMemo(() => {
    if (data && data.length > 0) return data;
    // Generate deterministic sparkline data using seed
    const random = seededRandom(seed);
    const points = [];
    let value = 50 + random() * 20;
    for (let i = 0; i < 20; i++) {
      value += (random() - 0.5) * 10;
      value = Math.max(10, Math.min(90, value));
      points.push(value);
    }
    return points;
  }, [data, seed]);

  const { path, areaPath } = useMemo(() => {
    if (chartData.length < 2) return { path: "", areaPath: "" };

    const min = Math.min(...chartData);
    const max = Math.max(...chartData);
    const range = max - min || 1;
    const padding = 2;

    const points = chartData.map((value, index) => {
      const x = (index / (chartData.length - 1)) * (width - padding * 2) + padding;
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return { x, y };
    });

    // Create smooth curve using quadratic bezier
    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      pathD += ` Q ${prev.x} ${prev.y} ${cpx} ${(prev.y + curr.y) / 2}`;
    }
    pathD += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;

    // Area path
    const areaD = pathD + ` L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

    return { path: pathD, areaPath: areaD };
  }, [chartData, width, height]);

  const gradientId = useMemo(() => `gradient-${Math.random().toString(36).substr(2, 9)}`, []);

  return (
    <svg 
      width={width} 
      height={height} 
      className={cn("overflow-visible", className)}
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop 
            offset="0%" 
            stopColor={positive ? "hsl(var(--success))" : "hsl(var(--destructive))"} 
            stopOpacity="0.3" 
          />
          <stop 
            offset="100%" 
            stopColor={positive ? "hsl(var(--success))" : "hsl(var(--destructive))"} 
            stopOpacity="0" 
          />
        </linearGradient>
      </defs>
      <path
        d={areaPath}
        fill={`url(#${gradientId})`}
      />
      <path
        d={path}
        fill="none"
        stroke={positive ? "hsl(var(--success))" : "hsl(var(--destructive))"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
