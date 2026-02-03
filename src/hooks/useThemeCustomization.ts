import { useState, useEffect, useCallback } from 'react';

export interface ColorScheme {
  id: string;
  name: string;
  primary: string; // HSL values like "142 71% 45%"
  accent: string;
  chartColors: string[];
  gradient?: {
    start: string;  // HSL
    end: string;    // HSL
    angle: number;  // degrees
  };
  category?: 'solid' | 'gradient' | 'special';
}

// ============ SOLID COLOR PRESETS ============
export const SOLID_SCHEMES: ColorScheme[] = [
  {
    id: 'default',
    name: 'Emerald',
    primary: '142 71% 45%',
    accent: '142 40% 95%',
    chartColors: ['142 76% 50%', '217 91% 65%', '262 83% 65%', '38 92% 55%', '340 82% 58%'],
    category: 'solid',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    primary: '210 100% 50%',
    accent: '210 40% 95%',
    chartColors: ['210 100% 50%', '180 70% 50%', '240 80% 60%', '160 60% 45%', '270 70% 55%'],
    category: 'solid',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    primary: '25 95% 53%',
    accent: '25 40% 95%',
    chartColors: ['25 95% 53%', '45 90% 50%', '0 80% 55%', '350 85% 60%', '280 60% 55%'],
    category: 'solid',
  },
  {
    id: 'purple',
    name: 'Royal',
    primary: '270 70% 55%',
    accent: '270 40% 95%',
    chartColors: ['270 70% 55%', '290 80% 60%', '250 75% 55%', '310 70% 50%', '230 65% 50%'],
    category: 'solid',
  },
  {
    id: 'rose',
    name: 'Rose',
    primary: '340 82% 52%',
    accent: '340 40% 95%',
    chartColors: ['340 82% 52%', '320 70% 55%', '0 75% 55%', '280 60% 50%', '350 90% 60%'],
    category: 'solid',
  },
  {
    id: 'teal',
    name: 'Teal',
    primary: '175 80% 40%',
    accent: '175 40% 95%',
    chartColors: ['175 80% 40%', '160 70% 45%', '190 75% 50%', '150 60% 40%', '200 65% 55%'],
    category: 'solid',
  },
  {
    id: 'gold',
    name: 'Gold',
    primary: '45 93% 47%',
    accent: '45 40% 95%',
    chartColors: ['45 93% 47%', '35 90% 50%', '55 85% 45%', '25 80% 50%', '40 95% 55%'],
    category: 'solid',
  },
  {
    id: 'crimson',
    name: 'Crimson',
    primary: '0 72% 51%',
    accent: '0 40% 95%',
    chartColors: ['0 72% 51%', '350 80% 55%', '10 75% 50%', '340 70% 50%', '20 65% 55%'],
    category: 'solid',
  },
  {
    id: 'lavender',
    name: 'Lavender',
    primary: '270 50% 65%',
    accent: '270 30% 95%',
    chartColors: ['270 50% 65%', '290 45% 60%', '250 55% 60%', '310 40% 58%', '230 50% 55%'],
    category: 'solid',
  },
  {
    id: 'mint',
    name: 'Mint',
    primary: '160 60% 50%',
    accent: '160 40% 95%',
    chartColors: ['160 60% 50%', '140 55% 50%', '180 50% 48%', '120 45% 48%', '200 50% 52%'],
    category: 'solid',
  },
];

// ============ GRADIENT PRESETS ============
export const GRADIENT_SCHEMES: ColorScheme[] = [
  {
    id: 'cyber',
    name: 'Cyber',
    primary: '180 100% 50%',
    accent: '180 60% 95%',
    chartColors: ['180 100% 50%', '280 100% 60%', '320 100% 55%', '60 100% 50%', '200 100% 55%'],
    gradient: { start: '180 100% 50%', end: '280 100% 60%', angle: 135 },
    category: 'gradient',
  },
  {
    id: 'fire',
    name: 'Fire',
    primary: '25 100% 55%',
    accent: '25 60% 95%',
    chartColors: ['25 100% 55%', '0 85% 55%', '45 95% 50%', '350 80% 55%', '15 90% 58%'],
    gradient: { start: '45 100% 55%', end: '0 85% 55%', angle: 135 },
    category: 'gradient',
  },
  {
    id: 'ice',
    name: 'Ice',
    primary: '200 100% 60%',
    accent: '200 50% 95%',
    chartColors: ['200 100% 60%', '220 90% 65%', '180 80% 55%', '240 70% 60%', '190 85% 58%'],
    gradient: { start: '200 100% 70%', end: '240 80% 55%', angle: 135 },
    category: 'gradient',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    primary: '160 80% 50%',
    accent: '160 50% 95%',
    chartColors: ['160 80% 50%', '280 70% 60%', '200 75% 55%', '320 65% 55%', '140 70% 52%'],
    gradient: { start: '160 80% 50%', end: '280 70% 60%', angle: 135 },
    category: 'gradient',
  },
  {
    id: 'neon',
    name: 'Neon',
    primary: '280 100% 65%',
    accent: '280 60% 95%',
    chartColors: ['280 100% 65%', '320 100% 60%', '180 100% 50%', '60 100% 50%', '200 100% 55%'],
    gradient: { start: '280 100% 65%', end: '320 100% 60%', angle: 135 },
    category: 'gradient',
  },
];

// ============ SPECIAL PRESETS ============
export const SPECIAL_SCHEMES: ColorScheme[] = [
  {
    id: 'matrix',
    name: 'Matrix',
    primary: '120 100% 40%',
    accent: '120 50% 95%',
    chartColors: ['120 100% 40%', '140 90% 45%', '100 85% 42%', '160 80% 40%', '80 75% 45%'],
    category: 'special',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    primary: '230 80% 55%',
    accent: '230 40% 95%',
    chartColors: ['230 80% 55%', '250 70% 60%', '210 75% 50%', '270 65% 55%', '190 60% 50%'],
    category: 'special',
  },
  {
    id: 'forest',
    name: 'Forest',
    primary: '160 60% 40%',
    accent: '160 35% 95%',
    chartColors: ['160 60% 40%', '140 55% 45%', '180 50% 40%', '120 45% 45%', '200 50% 45%'],
    category: 'special',
  },
  {
    id: 'coral',
    name: 'Coral',
    primary: '16 85% 60%',
    accent: '16 50% 95%',
    chartColors: ['16 85% 60%', '0 75% 55%', '30 80% 55%', '350 70% 55%', '45 75% 55%'],
    category: 'special',
  },
];

// Combined list for backward compatibility
export const PRESET_SCHEMES: ColorScheme[] = [
  ...SOLID_SCHEMES,
  ...GRADIENT_SCHEMES,
  ...SPECIAL_SCHEMES,
];

const STORAGE_KEY = 'cryptoswap-color-scheme';
const OLED_STORAGE_KEY = 'cryptoswap-oled-mode';
const UI_DENSITY_KEY = 'cryptoswap-ui-density';
const FONT_SIZE_KEY = 'cryptoswap-font-size';

export type UIDensity = 'compact' | 'comfortable';
export type FontSize = 'small' | 'medium' | 'large';

export function useThemeCustomization() {
  const [currentScheme, setCurrentScheme] = useState<ColorScheme>(PRESET_SCHEMES[0]);
  const [customScheme, setCustomScheme] = useState<Partial<ColorScheme> | null>(null);
  const [oledMode, setOledMode] = useState(false);
  const [uiDensity, setUiDensity] = useState<UIDensity>('comfortable');
  const [fontSize, setFontSize] = useState<FontSize>('medium');

  // Load saved settings on mount - DEFAULT TO OLED + MATRIX FOR NEW USERS
  useEffect(() => {
    // Load color scheme
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      // Existing user - load their saved preference
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
    } else {
      // NEW USER - Apply Matrix theme as default
      const matrixScheme = SPECIAL_SCHEMES.find(s => s.id === 'matrix');
      if (matrixScheme) {
        // Apply the scheme without saving yet (will save on first interaction)
        const root = document.documentElement;
        root.style.setProperty('--primary', matrixScheme.primary);
        root.style.setProperty('--ring', matrixScheme.primary);
        const [h, s, l] = matrixScheme.primary.split(' ').map(v => parseFloat(v));
        root.style.setProperty('--accent', `${h} 40% 95%`);
        root.style.setProperty('--accent-foreground', `${h} ${s}% ${Math.max(l - 10, 30)}%`);
        root.style.setProperty('--success', matrixScheme.primary);
        matrixScheme.chartColors.forEach((color, i) => {
          root.style.setProperty(`--chart-${i + 1}`, color);
        });
        setCurrentScheme(matrixScheme);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(matrixScheme));
      }
    }
    
    // Load OLED mode - DEFAULT TO TRUE FOR NEW USERS
    const savedOled = localStorage.getItem(OLED_STORAGE_KEY);
    if (savedOled === null) {
      // New user - enable OLED by default
      setOledMode(true);
      document.documentElement.classList.add('oled-mode');
      localStorage.setItem(OLED_STORAGE_KEY, 'true');
    } else if (savedOled === 'true') {
      setOledMode(true);
      document.documentElement.classList.add('oled-mode');
    }
    
    // Load UI density
    const savedDensity = localStorage.getItem(UI_DENSITY_KEY) as UIDensity | null;
    if (savedDensity) {
      setUiDensity(savedDensity);
      document.documentElement.classList.toggle('ui-compact', savedDensity === 'compact');
    }
    
    // Load font size
    const savedFontSize = localStorage.getItem(FONT_SIZE_KEY) as FontSize | null;
    if (savedFontSize) {
      setFontSize(savedFontSize);
      applyFontSize(savedFontSize);
    }
  }, []);

  const applyFontSize = (size: FontSize) => {
    const root = document.documentElement;
    const sizes = { small: '14px', medium: '16px', large: '18px' };
    root.style.setProperty('--base-font-size', sizes[size]);
  };

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
    
    // Apply gradient if available
    if (scheme.gradient) {
      root.style.setProperty('--gradient-primary', 
        `linear-gradient(${scheme.gradient.angle}deg, hsl(${scheme.gradient.start}), hsl(${scheme.gradient.end}))`
      );
    }

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

  const toggleOledMode = useCallback((enabled: boolean) => {
    setOledMode(enabled);
    localStorage.setItem(OLED_STORAGE_KEY, String(enabled));
    document.documentElement.classList.toggle('oled-mode', enabled);
    
    // Auto-select Matrix theme when OLED mode is enabled
    if (enabled) {
      const matrixScheme = SPECIAL_SCHEMES.find(s => s.id === 'matrix');
      if (matrixScheme) {
        applyScheme(matrixScheme);
      }
    }
  }, [applyScheme]);

  const updateUIDensity = useCallback((density: UIDensity) => {
    setUiDensity(density);
    localStorage.setItem(UI_DENSITY_KEY, density);
    document.documentElement.classList.toggle('ui-compact', density === 'compact');
  }, []);

  const updateFontSize = useCallback((size: FontSize) => {
    setFontSize(size);
    localStorage.setItem(FONT_SIZE_KEY, size);
    applyFontSize(size);
  }, []);

  const resetToDefault = useCallback(() => {
    // Reset to Matrix + OLED (the new default for all users)
    const matrixScheme = SPECIAL_SCHEMES.find(s => s.id === 'matrix') || PRESET_SCHEMES[0];
    applyScheme(matrixScheme);
    setCustomScheme(null);
    toggleOledMode(true); // OLED is now the default
    updateUIDensity('comfortable');
    updateFontSize('medium');
  }, [applyScheme, toggleOledMode, updateUIDensity, updateFontSize]);

  return {
    currentScheme,
    customScheme,
    presetSchemes: PRESET_SCHEMES,
    solidSchemes: SOLID_SCHEMES,
    gradientSchemes: GRADIENT_SCHEMES,
    specialSchemes: SPECIAL_SCHEMES,
    selectPreset,
    setCustomPrimary,
    resetToDefault,
    applyScheme,
    // OLED mode
    oledMode,
    toggleOledMode,
    // UI customization
    uiDensity,
    updateUIDensity,
    fontSize,
    updateFontSize,
  };
}
