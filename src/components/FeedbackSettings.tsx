import { memo, useState } from 'react';
import { Volume2, VolumeX, Vibrate, Bell, Play, Settings, HelpCircle, RotateCcw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFeedback } from '@/hooks/useFeedback';
import { NOTIFICATION_SOUNDS, NotificationSoundId } from '@/lib/sounds';
import { NotificationSettings } from '@/components/NotificationSettings';
import { ThemeCustomizer } from '@/components/ThemeCustomizer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const FeedbackSettings = memo(function FeedbackSettings() {
  const { settings, toggleSound, toggleHaptic, triggerFeedback, updateSettings, previewSound } = useFeedback();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleRestartTour = () => {
    setDialogOpen(false);
    toast.info('Tour will restart on next page load');
    localStorage.removeItem('xlama-tour-completed');
    // Give toast time to show before reload
    setTimeout(() => {
      window.location.href = '/';
    }, 500);
  };

  const handleSoundToggle = () => {
    toggleSound();
    // Play a test sound if enabling
    if (!settings.soundEnabled) {
      setTimeout(() => triggerFeedback('click', 'light'), 100);
    }
  };

  const handleHapticToggle = () => {
    toggleHaptic();
    // Trigger a test vibration if enabling
    if (!settings.hapticEnabled) {
      setTimeout(() => triggerFeedback('click', 'medium'), 100);
    }
  };

  const handleSoundChange = (soundId: NotificationSoundId) => {
    updateSettings({ notificationSound: soundId });
    previewSound(soundId);
  };

  const handleVolumeChange = (value: number[]) => {
    updateSettings({ notificationVolume: value[0] });
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "gap-1.5 text-muted-foreground hover:text-foreground",
            (!settings.soundEnabled && !settings.hapticEnabled) && "opacity-50"
          )}
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
          <span className="text-xs hidden sm:inline">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="sounds" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="sounds" className="text-xs">
              <Volume2 className="w-3.5 h-3.5 mr-1.5" />
              Sound
            </TabsTrigger>
            <TabsTrigger value="theme" className="text-xs">
              <Settings className="w-3.5 h-3.5 mr-1.5" />
              Theme
            </TabsTrigger>
            <TabsTrigger value="help" className="text-xs">
              <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
              Help
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sounds" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label 
                htmlFor="sound-toggle" 
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <Volume2 className="w-4 h-4 text-muted-foreground" />
                Sound Effects
              </Label>
              <Switch
                id="sound-toggle"
                checked={settings.soundEnabled}
                onCheckedChange={handleSoundToggle}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label 
                htmlFor="haptic-toggle" 
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <Vibrate className="w-4 h-4 text-muted-foreground" />
                Haptic Feedback
              </Label>
              <Switch
                id="haptic-toggle"
                checked={settings.hapticEnabled}
                onCheckedChange={handleHapticToggle}
              />
            </div>

            {/* Notification Sound Selection */}
            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="flex items-center gap-2 text-sm">
                <Bell className="w-4 h-4 text-muted-foreground" />
                Alert Sound
              </Label>
              <div className="flex gap-2">
                <Select
                  value={settings.notificationSound}
                  onValueChange={(value) => handleSoundChange(value as NotificationSoundId)}
                  disabled={!settings.soundEnabled}
                >
                  <SelectTrigger className="flex-1 h-9">
                    <SelectValue placeholder="Select sound" />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTIFICATION_SOUNDS.map((sound) => (
                      <SelectItem key={sound.id} value={sound.id}>
                        <div className="flex flex-col">
                          <span>{sound.name}</span>
                          <span className="text-xs text-muted-foreground">{sound.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => previewSound(settings.notificationSound)}
                  disabled={!settings.soundEnabled}
                >
                  <Play className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Volume Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Volume</Label>
                <span className="text-xs text-muted-foreground">
                  {Math.round(settings.notificationVolume * 100)}%
                </span>
              </div>
              <Slider
                value={[settings.notificationVolume]}
                onValueChange={handleVolumeChange}
                max={1}
                min={0.1}
                step={0.1}
                disabled={!settings.soundEnabled}
                className="w-full"
              />
            </div>

            <Separator />

            {/* Push Notifications */}
            <NotificationSettings />
            
            <p className="text-xs text-muted-foreground">
              Sound and vibration for swaps, price alerts, and limit orders.
            </p>
          </TabsContent>

          <TabsContent value="theme" className="mt-4">
            <ThemeCustomizer />
          </TabsContent>

          <TabsContent value="help" className="mt-4 space-y-4">
            {/* Restart Tour */}
            <div className="p-4 rounded-lg glass border border-border/50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm">Restart Onboarding Tour</h4>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">
                    Review the guided tour that shows you how to use xlama's key features.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRestartTour}
                    className="gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restart Tour
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Quick Links</h4>
              <div className="grid gap-2">
                <a 
                  href="/docs" 
                  className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm"
                  onClick={() => setDialogOpen(false)}
                >
                  📚 Documentation
                </a>
                <a 
                  href="/faq" 
                  className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm"
                  onClick={() => setDialogOpen(false)}
                >
                  ❓ FAQ
                </a>
                <a 
                  href="/feedback" 
                  className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm"
                  onClick={() => setDialogOpen(false)}
                >
                  💬 Send Feedback
                </a>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
});
