import { useState } from 'react';
import { Palette, Check, RotateCcw, Sun, Moon, Sparkles, Zap, CircleDot, Type, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  useThemeCustomization, 
  ColorScheme, 
  SOLID_SCHEMES,
  GRADIENT_SCHEMES,
  SPECIAL_SCHEMES,
} from '@/hooks/useThemeCustomization';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ThemeCustomizerProps {
  className?: string;
}

export function ThemeCustomizer({ className }: ThemeCustomizerProps) {
  const { theme, setTheme } = useTheme();
  const { 
    currentScheme, 
    selectPreset, 
    setCustomPrimary, 
    resetToDefault,
    oledMode,
    toggleOledMode,
    uiDensity,
    updateUIDensity,
    fontSize,
    updateFontSize,
  } = useThemeCustomization();
  
  const [customHue, setCustomHue] = useState(142);
  const [customSaturation, setCustomSaturation] = useState(71);
  const [customLightness, setCustomLightness] = useState(45);

  const handleCustomColorChange = () => {
    const hslValue = `${customHue} ${customSaturation}% ${customLightness}%`;
    setCustomPrimary(hslValue);
    toast.success('Custom color applied');
  };

  const handlePresetSelect = (schemeId: string) => {
    selectPreset(schemeId);
    toast.success('Theme applied');
  };

  const handleReset = () => {
    resetToDefault();
    setCustomHue(142);
    setCustomSaturation(71);
    setCustomLightness(45);
    toast.success('Theme reset to default');
  };

  const getPreviewColor = (scheme: ColorScheme) => {
    if (scheme.gradient) {
      return `linear-gradient(${scheme.gradient.angle}deg, hsl(${scheme.gradient.start}), hsl(${scheme.gradient.end}))`;
    }
    return `hsl(${scheme.primary})`;
  };

  const getCustomPreviewColor = () => {
    return `hsl(${customHue} ${customSaturation}% ${customLightness}%)`;
  };

  const currentTheme = theme === 'system' 
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;

  const PresetGrid = ({ schemes, title }: { schemes: ColorScheme[]; title: string }) => (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground font-medium">{title}</p>
      <div className="grid grid-cols-5 gap-1.5">
        {schemes.map((scheme) => (
          <button
            key={scheme.id}
            onClick={() => handlePresetSelect(scheme.id)}
            className={cn(
              "relative flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-all",
              currentScheme.id === scheme.id
                ? "border-primary bg-primary/5"
                : "border-border/50 hover:border-border hover:bg-secondary/30"
            )}
            title={scheme.name}
          >
            <div
              className="w-7 h-7 rounded-full shadow-sm flex-shrink-0"
              style={{ background: getPreviewColor(scheme) }}
            />
            <span className="text-[9px] text-muted-foreground truncate max-w-full leading-tight">
              {scheme.name}
            </span>
            {currentScheme.id === scheme.id && (
              <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-2 h-2 text-primary-foreground" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Palette className="w-4 h-4 text-primary" />
          Theme Customizer
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="text-xs h-7"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Reset
        </Button>
      </div>

      {/* Light/Dark Mode Toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
        <span className="text-sm font-medium">Appearance</span>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme('light')}
            className={cn(
              "h-7 px-3 text-xs",
              currentTheme === 'light' && "bg-background shadow-sm"
            )}
          >
            <Sun className="w-3.5 h-3.5 mr-1" />
            Light
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme('dark')}
            className={cn(
              "h-7 px-3 text-xs",
              currentTheme === 'dark' && "bg-background shadow-sm"
            )}
          >
            <Moon className="w-3.5 h-3.5 mr-1" />
            Dark
          </Button>
        </div>
      </div>

      {/* OLED Mode Toggle (only in dark mode) */}
      {currentTheme === 'dark' && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-muted-foreground" />
            <div>
              <span className="text-sm font-medium">OLED Mode</span>
              <p className="text-[10px] text-muted-foreground">True black + Matrix theme</p>
            </div>
          </div>
          <Switch
            checked={oledMode}
            onCheckedChange={(enabled) => {
              toggleOledMode(enabled);
              if (enabled) {
                toast.success('OLED Mode + Matrix theme applied');
              }
            }}
          />
        </div>
      )}

      <Tabs defaultValue="presets" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="presets" className="text-xs">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Colors
          </TabsTrigger>
          <TabsTrigger value="custom" className="text-xs">
            <Palette className="w-3.5 h-3.5 mr-1.5" />
            Custom
          </TabsTrigger>
          <TabsTrigger value="display" className="text-xs">
            <Type className="w-3.5 h-3.5 mr-1.5" />
            Display
          </TabsTrigger>
        </TabsList>

        <TabsContent value="presets" className="mt-3 space-y-4">
          <PresetGrid schemes={SOLID_SCHEMES} title="Solid Colors" />
          <PresetGrid schemes={GRADIENT_SCHEMES} title="Gradients" />
          <PresetGrid schemes={SPECIAL_SCHEMES} title="Special" />
        </TabsContent>

        <TabsContent value="custom" className="mt-3 space-y-4">
          {/* Color Preview */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
            <div
              className="w-12 h-12 rounded-lg shadow-md flex-shrink-0"
              style={{ backgroundColor: getCustomPreviewColor() }}
            />
            <div className="flex-1">
              <p className="text-sm font-medium">Custom Color</p>
              <p className="text-xs text-muted-foreground font-mono">
                hsl({customHue}, {customSaturation}%, {customLightness}%)
              </p>
            </div>
          </div>

          {/* Hue Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Hue</Label>
              <span className="text-xs text-muted-foreground">{customHue}°</span>
            </div>
            <div 
              className="h-3 rounded-full"
              style={{
                background: 'linear-gradient(to right, hsl(0, 70%, 50%), hsl(60, 70%, 50%), hsl(120, 70%, 50%), hsl(180, 70%, 50%), hsl(240, 70%, 50%), hsl(300, 70%, 50%), hsl(360, 70%, 50%))'
              }}
            >
              <Slider
                value={[customHue]}
                onValueChange={([value]) => setCustomHue(value)}
                max={360}
                step={1}
                className="[&>span]:bg-transparent"
              />
            </div>
          </div>

          {/* Saturation Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Saturation</Label>
              <span className="text-xs text-muted-foreground">{customSaturation}%</span>
            </div>
            <Slider
              value={[customSaturation]}
              onValueChange={([value]) => setCustomSaturation(value)}
              min={20}
              max={100}
              step={1}
            />
          </div>

          {/* Lightness Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Lightness</Label>
              <span className="text-xs text-muted-foreground">{customLightness}%</span>
            </div>
            <Slider
              value={[customLightness]}
              onValueChange={([value]) => setCustomLightness(value)}
              min={25}
              max={65}
              step={1}
            />
          </div>

          <Button onClick={handleCustomColorChange} className="w-full" size="sm">
            <Palette className="w-4 h-4 mr-2" />
            Apply Custom Color
          </Button>
        </TabsContent>

        <TabsContent value="display" className="mt-3 space-y-4">
          {/* UI Density */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CircleDot className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm font-medium">UI Density</Label>
            </div>
            <div className="flex gap-2">
              <Button
                variant={uiDensity === 'compact' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateUIDensity('compact')}
                className="flex-1"
              >
                Compact
              </Button>
              <Button
                variant={uiDensity === 'comfortable' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateUIDensity('comfortable')}
                className="flex-1"
              >
                Comfortable
              </Button>
            </div>
          </div>

          {/* Font Size */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Font Size</Label>
            </div>
            <div className="flex gap-2">
              <Button
                variant={fontSize === 'small' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateFontSize('small')}
                className="flex-1 text-xs"
              >
                <span className="text-xs">A</span>
              </Button>
              <Button
                variant={fontSize === 'medium' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateFontSize('medium')}
                className="flex-1"
              >
                <span className="text-sm">A</span>
              </Button>
              <Button
                variant={fontSize === 'large' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateFontSize('large')}
                className="flex-1"
              >
                <span className="text-base">A</span>
              </Button>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground">
            Display settings affect layout spacing and text size throughout the app.
          </p>
        </TabsContent>
      </Tabs>

      <p className="text-[10px] text-muted-foreground text-center">
        Theme preferences are saved automatically
      </p>
    </div>
  );
}
