import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convert HSL values to hex color string
 */
function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Resolve CSS variable to actual hex color value for libraries
 * that can't parse CSS variables (e.g., lightweight-charts)
 */
export function resolveColor(cssVar: string, fallback: string = '#888888'): string {
  if (typeof window === 'undefined') return fallback;

  // Handle direct hex/rgb values
  if (cssVar.startsWith('#') || cssVar.startsWith('rgb')) {
    return cssVar;
  }

  // Extract variable name from hsl(var(--name)) or var(--name) format
  const varMatch = cssVar.match(/var\(--([^)]+)\)/);
  if (!varMatch) return fallback;

  const varName = varMatch[1];
  const computed = getComputedStyle(document.documentElement)
    .getPropertyValue(`--${varName}`)
    .trim();

  if (!computed) return fallback;

  // Parse HSL values - CSS variables typically store "210 100% 50%" format
  const parts = computed.split(' ').filter(Boolean);
  if (parts.length >= 3) {
    const h = parseFloat(parts[0]);
    const s = parseFloat(parts[1]) / 100;
    const l = parseFloat(parts[2]) / 100;
    return hslToHex(h, s, l);
  }

  return fallback;
}
