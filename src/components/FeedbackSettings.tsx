import { memo } from 'react';
import { Volume2, VolumeX, Vibrate } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useFeedback } from '@/hooks/useFeedback';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const FeedbackSettings = memo(function FeedbackSettings() {
  const { settings, toggleSound, toggleHaptic, triggerFeedback } = useFeedback();

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
        className="w-56 p-4" 
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
          
          <p className="text-xs text-muted-foreground">
            Sound and vibration for swaps, mode changes, and interactions.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
});
