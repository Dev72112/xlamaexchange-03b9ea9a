import { memo } from 'react';
import { Volume2, VolumeX, Vibrate, Bell, Play } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useFeedback } from '@/hooks/useFeedback';
import { NOTIFICATION_SOUNDS, NotificationSoundId } from '@/lib/sounds';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export const FeedbackSettings = memo(function FeedbackSettings() {
  const { settings, toggleSound, toggleHaptic, triggerFeedback, updateSettings, previewSound } = useFeedback();

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
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "gap-1.5 text-muted-foreground hover:text-foreground",
            (!settings.soundEnabled && !settings.hapticEnabled) && "opacity-50"
          )}
          aria-label="Feedback settings"
        >
          {settings.soundEnabled ? (
            <Volume2 className="w-4 h-4" />
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
          <span className="text-xs hidden sm:inline">Sounds</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-72 p-4" 
        align="end"
        side="top"
      >
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Feedback Settings</h4>
          
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
          
          <p className="text-xs text-muted-foreground">
            Sound and vibration for swaps, price alerts, and limit orders.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
});
