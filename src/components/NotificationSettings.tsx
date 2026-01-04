import { memo } from 'react';
import { Bell, BellOff, Loader2, AlertCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { cn } from '@/lib/utils';

export const NotificationSettings = memo(function NotificationSettings() {
  const { activeAddress } = useMultiWallet();
  const { 
    isSupported, 
    isSubscribed, 
    isLoading, 
    permission,
    subscribe, 
    unsubscribe,
    showNotification 
  } = usePushNotifications(activeAddress);

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <AlertCircle className="w-4 h-4" />
        <span>Push notifications not supported</span>
      </div>
    );
  }

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      const success = await subscribe();
      if (success) {
        showNotification('Notifications Enabled', {
          body: 'You will now receive alerts for price changes, limit orders, and more!',
        });
      }
    }
  };

  const handleTestNotification = () => {
    showNotification('Test Notification', {
      body: 'This is a test notification from xlama!',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label 
          htmlFor="push-toggle" 
          className="flex items-center gap-2 text-sm cursor-pointer"
        >
          {isSubscribed ? (
            <Bell className="w-4 h-4 text-primary" />
          ) : (
            <BellOff className="w-4 h-4 text-muted-foreground" />
          )}
          Push Notifications
        </Label>
        <Switch
          id="push-toggle"
          checked={isSubscribed}
          onCheckedChange={handleToggle}
          disabled={isLoading || !activeAddress}
        />
      </div>

      {permission === 'denied' && (
        <p className="text-xs text-destructive">
          Notifications are blocked. Please enable them in your browser settings.
        </p>
      )}

      {!activeAddress && (
        <p className="text-xs text-muted-foreground">
          Connect your wallet to enable notifications.
        </p>
      )}

      {isSubscribed && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleTestNotification}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Bell className="w-4 h-4 mr-2" />
          )}
          Send Test Notification
        </Button>
      )}

      <p className="text-xs text-muted-foreground">
        Get notified for price alerts, limit orders, DCA executions, and swap completions.
      </p>
    </div>
  );
});
