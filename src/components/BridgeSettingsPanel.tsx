import { memo } from 'react';
import { Shield, Bell, DollarSign, Info } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useBridgeSettings } from '@/hooks/useBridgeSettings';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface BridgeSettingsPanelProps {
  className?: string;
}

export const BridgeSettingsPanel = memo(function BridgeSettingsPanel({ className }: BridgeSettingsPanelProps) {
  const { 
    settings, 
    toggleSignature, 
    togglePushNotifications, 
    setSignatureThreshold 
  } = useBridgeSettings();

  return (
    <div className={cn("space-y-4", className)}>
      {/* Signature Authentication */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label 
            htmlFor="signature-toggle" 
            className="flex items-center gap-2 text-sm cursor-pointer"
          >
            <Shield className={cn(
              "w-4 h-4",
              settings.requireSignature ? "text-primary" : "text-muted-foreground"
            )} />
            <span>Sign Bridge Transactions</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[200px]">
                <p className="text-xs">
                  Adds an extra signature verification step before bridging, 
                  creating an audit trail for security and phishing protection.
                </p>
              </TooltipContent>
            </Tooltip>
          </Label>
          <Switch
            id="signature-toggle"
            checked={settings.requireSignature}
            onCheckedChange={toggleSignature}
          />
        </div>

        {settings.requireSignature && (
          <div className="pl-6 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="w-3 h-3" />
                Threshold
              </span>
              <span className="font-mono text-xs">
                ${settings.signatureThresholdUsd}+
              </span>
            </div>
            <Slider
              value={[settings.signatureThresholdUsd]}
              onValueChange={([value]) => setSignatureThreshold(value)}
              min={0}
              max={1000}
              step={50}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {settings.signatureThresholdUsd === 0 
                ? 'Sign all bridge transactions' 
                : `Sign bridges over $${settings.signatureThresholdUsd}`}
            </p>
          </div>
        )}
      </div>

      {/* Push Notifications */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <Label 
          htmlFor="bridge-push-toggle" 
          className="flex items-center gap-2 text-sm cursor-pointer"
        >
          <Bell className={cn(
            "w-4 h-4",
            settings.pushNotificationsEnabled ? "text-primary" : "text-muted-foreground"
          )} />
          <span>Bridge Completion Alerts</span>
        </Label>
        <Switch
          id="bridge-push-toggle"
          checked={settings.pushNotificationsEnabled}
          onCheckedChange={togglePushNotifications}
        />
      </div>
      
      {settings.pushNotificationsEnabled && (
        <p className="text-xs text-muted-foreground pl-6">
          Get notified when your bridge transactions complete or fail, even when the app is closed.
        </p>
      )}
    </div>
  );
});
