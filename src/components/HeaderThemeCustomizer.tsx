import { Palette, Check, RotateCcw, Sun, Moon, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useThemeCustomization } from '@/hooks/useThemeCustomization';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function HeaderThemeCustomizer() {
  const { theme, setTheme } = useTheme();
  const { 
    currentScheme, 
    presetSchemes, 
    selectPreset, 
    setCustomPrimary, 
    resetToDefault 
  } = useThemeCustomization();
  
  const [customHue, setCustomHue] = useState(142);
  const [customSaturation, setCustomSaturation] = useState(71);
  const [customLightness, setCustomLightness] = useState(45);
  const [open, setOpen] = useState(false);

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

  const currentTheme = theme === 'system' 
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover-lift"
          aria-label="Customize theme"
        >
          <Palette className="h-[1.2rem] w-[1.2rem]" />
          <span 
            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background"
            style={{ backgroundColor: `hsl(${currentScheme.primary})` }}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        align="end" 
        className="w-80 p-4 glass border-border/50 shadow-lg z-50"
        sideOffset={8}
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Theme Customizer
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-xs h-7 hover:bg-destructive/10 hover:text-destructive"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset
            </Button>
          </div>

          {/* Light/Dark Mode Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-sunken border border-border/30">
            <span className="text-sm font-medium">Appearance</span>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-background/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme('light')}
                className={cn(
                  "h-7 px-3 text-xs transition-all",
                  currentTheme === 'light' && "bg-background shadow-sm text-primary"
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
                  "h-7 px-3 text-xs transition-all",
                  currentTheme === 'dark' && "bg-background shadow-sm text-primary"
                )}
              >
                <Moon className="w-3.5 h-3.5 mr-1" />
                Dark
              </Button>
            </div>
          </div>

          <Tabs defaultValue="presets" className="w-full">
            <TabsList className="w-full grid grid-cols-2 bg-surface-sunken">
              <TabsTrigger value="presets" className="text-xs data-[state=active]:bg-background">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Presets
              </TabsTrigger>
              <TabsTrigger value="custom" className="text-xs data-[state=active]:bg-background">
                <Palette className="w-3.5 h-3.5 mr-1.5" />
                Custom
              </TabsTrigger>
            </TabsList>

            <TabsContent value="presets" className="mt-3">
              <div className="grid grid-cols-4 gap-2">
                {presetSchemes.map((scheme) => (
                  <button
                    key={scheme.id}
                    onClick={() => handlePresetSelect(scheme.id)}
                    className={cn(
                      "relative flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all hover-lift",
                      currentScheme.id === scheme.id
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border/30 hover:border-primary/50 hover:bg-surface-elevated"
                    )}
                  >
                    <div
                      className="w-7 h-7 rounded-full shadow-md ring-2 ring-background"
                      style={{ backgroundColor: `hsl(${scheme.primary})` }}
                    />
                    <span className="text-[9px] text-muted-foreground truncate max-w-full font-medium">
                      {scheme.name}
                    </span>
                    {currentScheme.id === scheme.id && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center shadow-sm">
                        <Check className="w-2.5 h-2.5 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="custom" className="mt-3 space-y-3">
              {/* Color Preview */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-sunken border border-border/30">
                <div
                  className="w-10 h-10 rounded-lg shadow-md flex-shrink-0 ring-2 ring-background"
                  style={{ backgroundColor: `hsl(${customHue} ${customSaturation}% ${customLightness}%)` }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Custom Color</p>
                  <p className="text-[10px] text-muted-foreground font-mono truncate">
                    hsl({customHue}, {customSaturation}%, {customLightness}%)
                  </p>
                </div>
              </div>

              {/* Hue Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Hue</Label>
                  <span className="text-xs text-muted-foreground font-mono">{customHue}°</span>
                </div>
                <div 
                  className="h-2.5 rounded-full p-0.5"
                  style={{
                    background: 'linear-gradient(to right, hsl(0, 70%, 50%), hsl(60, 70%, 50%), hsl(120, 70%, 50%), hsl(180, 70%, 50%), hsl(240, 70%, 50%), hsl(300, 70%, 50%), hsl(360, 70%, 50%))'
                  }}
                >
                  <Slider
                    value={[customHue]}
                    onValueChange={([value]) => setCustomHue(value)}
                    max={360}
                    step={1}
                    className="[&>span]:bg-transparent [&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
                  />
                </div>
              </div>

              {/* Saturation Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Saturation</Label>
                  <span className="text-xs text-muted-foreground font-mono">{customSaturation}%</span>
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
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Lightness</Label>
                  <span className="text-xs text-muted-foreground font-mono">{customLightness}%</span>
                </div>
                <Slider
                  value={[customLightness]}
                  onValueChange={([value]) => setCustomLightness(value)}
                  min={25}
                  max={65}
                  step={1}
                />
              </div>

              <Button onClick={handleCustomColorChange} className="w-full hover-lift" size="sm">
                <Palette className="w-4 h-4 mr-2" />
                Apply Custom Color
              </Button>
            </TabsContent>
          </Tabs>

          <p className="text-[10px] text-muted-foreground text-center opacity-70">
            Theme preferences are saved automatically
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
