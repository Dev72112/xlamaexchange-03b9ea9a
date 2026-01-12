import { useState, useEffect, useCallback } from 'react';

export interface ColorScheme {
  id: string;
  name: string;
  primary: string; // HSL values like "142 71% 45%"
  accent: string;
  chartColors: string[];
}

export const PRESET_SCHEMES: ColorScheme[] = [
  {
    id: 'default',
    name: 'Emerald',
    primary: '142 71% 45%',
    accent: '142 40% 95%',
    chartColors: ['142 76% 50%', '217 91% 65%', '262 83% 65%', '38 92% 55%', '340 82% 58%'],
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    primary: '210 100% 50%',
    accent: '210 40% 95%',
    chartColors: ['210 100% 50%', '180 70% 50%', '240 80% 60%', '160 60% 45%', '270 70% 55%'],
  },
  {
    id: 'sunset',
    name: 'Sunset',
    primary: '25 95% 53%',
    accent: '25 40% 95%',
    chartColors: ['25 95% 53%', '45 90% 50%', '0 80% 55%', '350 85% 60%', '280 60% 55%'],
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    primary: '270 70% 55%',
    accent: '270 40% 95%',
    chartColors: ['270 70% 55%', '290 80% 60%', '250 75% 55%', '310 70% 50%', '230 65% 50%'],
  },
  {
    id: 'rose',
    name: 'Rose Pink',
    primary: '340 82% 52%',
    accent: '340 40% 95%',
    chartColors: ['340 82% 52%', '320 70% 55%', '0 75% 55%', '280 60% 50%', '350 90% 60%'],
  },
  {
    id: 'teal',
    name: 'Teal',
    primary: '175 80% 40%',
    accent: '175 40% 95%',
    chartColors: ['175 80% 40%', '160 70% 45%', '190 75% 50%', '150 60% 40%', '200 65% 55%'],
  },
  {
    id: 'gold',
    name: 'Golden',
    primary: '45 93% 47%',
    accent: '45 40% 95%',
    chartColors: ['45 93% 47%', '35 90% 50%', '55 85% 45%', '25 80% 50%', '40 95% 55%'],
  },
  {
    id: 'crimson',
    name: 'Crimson',
    primary: '0 72% 51%',
    accent: '0 40% 95%',
    chartColors: ['0 72% 51%', '350 80% 55%', '10 75% 50%', '340 70% 50%', '20 65% 55%'],
  },
  // New premium presets
  {
    id: 'neon',
    name: 'Neon',
    primary: '280 100% 65%',
    accent: '280 60% 95%',
    chartColors: ['280 100% 65%', '320 100% 60%', '180 100% 50%', '60 100% 50%', '200 100% 55%'],
  },
  {
    id: 'midnight',
    name: 'Midnight',
    primary: '230 80% 55%',
    accent: '230 40% 95%',
    chartColors: ['230 80% 55%', '250 70% 60%', '210 75% 50%', '270 65% 55%', '190 60% 50%'],
  },
  {
    id: 'forest',
    name: 'Forest',
    primary: '160 60% 40%',
    accent: '160 35% 95%',
    chartColors: ['160 60% 40%', '140 55% 45%', '180 50% 40%', '120 45% 45%', '200 50% 45%'],
  },
  {
    id: 'coral',
    name: 'Coral',
    primary: '16 85% 60%',
    accent: '16 50% 95%',
    chartColors: ['16 85% 60%', '0 75% 55%', '30 80% 55%', '350 70% 55%', '45 75% 55%'],
  },
];

const STORAGE_KEY = 'cryptoswap-color-scheme';

export function useThemeCustomization() {
  const [currentScheme, setCurrentScheme] = useState<ColorScheme>(PRESET_SCHEMES[0]);
  const [customScheme, setCustomScheme] = useState<Partial<ColorScheme> | null>(null);

  // Load saved scheme on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.id === 'custom') {
          setCustomScheme(parsed);
          setCurrentScheme(parsed);
        } else {
          const preset = PRESET_SCHEMES.find(s => s.id === parsed.id);
          if (preset) setCurrentScheme(preset);
        }
      } catch (e) {
        console.error('Failed to parse saved color scheme');
      }
    }
  }, []);

  // Apply scheme to CSS variables
  const applyScheme = useCallback((scheme: ColorScheme) => {
    const root = document.documentElement;
    
    // Apply primary color
    root.style.setProperty('--primary', scheme.primary);
    root.style.setProperty('--ring', scheme.primary);
    
    // Apply accent colors (light mode)
    const [h, s, l] = scheme.primary.split(' ').map(v => parseFloat(v));
    root.style.setProperty('--accent', `${h} 40% 95%`);
    root.style.setProperty('--accent-foreground', `${h} ${s}% ${Math.max(l - 10, 30)}%`);
    
    // Apply success color (same as primary for consistency)
    root.style.setProperty('--success', scheme.primary);
    
    // Apply chart colors
    scheme.chartColors.forEach((color, i) => {
      root.style.setProperty(`--chart-${i + 1}`, color);
    });

    // Save to storage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scheme));
    setCurrentScheme(scheme);
  }, []);

  const selectPreset = useCallback((schemeId: string) => {
    const scheme = PRESET_SCHEMES.find(s => s.id === schemeId);
    if (scheme) {
      applyScheme(scheme);
      setCustomScheme(null);
    }
  }, [applyScheme]);

  const setCustomPrimary = useCallback((hslValue: string) => {
    const [h] = hslValue.split(' ').map(v => parseFloat(v));
    
    const custom: ColorScheme = {
      id: 'custom',
      name: 'Custom',
      primary: hslValue,
      accent: `${h} 40% 95%`,
      chartColors: [
        hslValue,
        `${(h + 60) % 360} 70% 55%`,
        `${(h + 120) % 360} 65% 55%`,
        `${(h + 180) % 360} 60% 50%`,
        `${(h + 240) % 360} 70% 55%`,
      ],
    };
    
    setCustomScheme(custom);
    applyScheme(custom);
  }, [applyScheme]);

  const resetToDefault = useCallback(() => {
    const defaultScheme = PRESET_SCHEMES[0];
    applyScheme(defaultScheme);
    setCustomScheme(null);
    localStorage.removeItem(STORAGE_KEY);
  }, [applyScheme]);

  // Initialize scheme on mount - removed applyScheme call since ThemeProvider handles it
  // This prevents double application of styles

  return {
    currentScheme,
    customScheme,
    presetSchemes: PRESET_SCHEMES,
    selectPreset,
    setCustomPrimary,
    resetToDefault,
    applyScheme,
  };
}
