import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

// Storage key for color scheme (must match useThemeCustomization)
const COLOR_SCHEME_STORAGE_KEY = 'cryptoswap-color-scheme';

// Apply saved color scheme to CSS variables
function applyStoredColorScheme() {
  try {
    const saved = localStorage.getItem(COLOR_SCHEME_STORAGE_KEY);
    if (saved) {
      const scheme = JSON.parse(saved);
      const root = document.documentElement;
      
      if (scheme.primary) {
        root.style.setProperty('--primary', scheme.primary);
        root.style.setProperty('--ring', scheme.primary);
        root.style.setProperty('--success', scheme.primary);
        
        // Apply accent colors based on primary
        const [h, s, l] = scheme.primary.split(' ').map((v: string) => parseFloat(v));
        root.style.setProperty('--accent', `${h} 40% 95%`);
        root.style.setProperty('--accent-foreground', `${h} ${s}% ${Math.max(l - 10, 30)}%`);
      }
      
      // Apply chart colors if present
      if (scheme.chartColors && Array.isArray(scheme.chartColors)) {
        scheme.chartColors.forEach((color: string, i: number) => {
          root.style.setProperty(`--chart-${i + 1}`, color);
        });
      }
    }
  } catch (e) {
    console.warn('Failed to apply stored color scheme:', e);
  }
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "cryptoswap-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );

  // Apply color scheme on initial mount
  useEffect(() => {
    applyStoredColorScheme();
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;

    // Add transitioning class for smooth theme switch
    root.classList.add("theme-transitioning");

    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }

    // Re-apply color scheme after theme change
    applyStoredColorScheme();

    // Remove transitioning class after animation completes
    const timer = setTimeout(() => {
      root.classList.remove("theme-transitioning");
    }, 300);

    return () => clearTimeout(timer);
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
