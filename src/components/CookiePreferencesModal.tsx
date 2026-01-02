import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Shield, BarChart3, Megaphone } from "lucide-react";

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
}

const COOKIE_PREFERENCES_KEY = "xlama-cookie-preferences";

export function getCookiePreferences(): CookiePreferences {
  const stored = localStorage.getItem(COOKIE_PREFERENCES_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return { essential: true, analytics: false, marketing: false };
    }
  }
  return { essential: true, analytics: false, marketing: false };
}

export function saveCookiePreferences(preferences: CookiePreferences) {
  localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(preferences));
  localStorage.setItem("xlama-cookie-consent", "customized");
}

interface CookiePreferencesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
}

export function CookiePreferencesModal({ 
  open, 
  onOpenChange,
  onSave 
}: CookiePreferencesModalProps) {
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    if (open) {
      setPreferences(getCookiePreferences());
    }
  }, [open]);

  const handleToggle = (category: keyof CookiePreferences) => {
    if (category === "essential") return; // Essential cookies cannot be disabled
    setPreferences(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleSave = () => {
    saveCookiePreferences(preferences);
    onOpenChange(false);
    onSave?.();
  };

  const handleAcceptAll = () => {
    const allAccepted = { essential: true, analytics: true, marketing: true };
    saveCookiePreferences(allAccepted);
    onOpenChange(false);
    onSave?.();
  };

  const categories = [
    {
      key: "essential" as const,
      label: "Essential Cookies",
      description: "Required for the website to function. Cannot be disabled.",
      icon: Shield,
      disabled: true,
    },
    {
      key: "analytics" as const,
      label: "Analytics Cookies",
      description: "Help us understand how visitors interact with our website.",
      icon: BarChart3,
      disabled: false,
    },
    {
      key: "marketing" as const,
      label: "Marketing Cookies",
      description: "Used to deliver personalized advertisements.",
      icon: Megaphone,
      disabled: false,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cookie Preferences</DialogTitle>
          <DialogDescription>
            Manage your cookie preferences. Essential cookies are always enabled as they are necessary for the website to function.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {categories.map(({ key, label, description, icon: Icon, disabled }) => (
            <div
              key={key}
              className="flex items-start gap-4 p-3 rounded-lg border border-border bg-muted/30"
            >
              <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 space-y-1">
                <Label htmlFor={key} className="font-medium cursor-pointer">
                  {label}
                </Label>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <Switch
                id={key}
                checked={preferences[key]}
                onCheckedChange={() => handleToggle(key)}
                disabled={disabled}
                className="shrink-0"
              />
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleSave} className="w-full sm:w-auto">
            Save Preferences
          </Button>
          <Button onClick={handleAcceptAll} className="w-full sm:w-auto">
            Accept All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
