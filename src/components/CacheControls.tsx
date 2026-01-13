import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, RefreshCw, Loader2, CheckCircle } from 'lucide-react';

export function CacheControls() {
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState(false);

  const clearCachesAndReload = async () => {
    setClearing(true);
    setCleared(false);

    try {
      // Clear app-related localStorage keys
      const keysToRemove = [
        'onboarding-tour-complete',
        'xlama-notifications',
        'wc@2:',
        'walletconnect',
        'WALLETCONNECT',
        'appkit',
        'wagmi',
        '-walletlink',
      ];

      const allKeys = Object.keys(localStorage);
      for (const key of allKeys) {
        if (keysToRemove.some(pattern => key.toLowerCase().includes(pattern.toLowerCase()))) {
          localStorage.removeItem(key);
        }
      }

      // Clear sessionStorage
      sessionStorage.clear();

      // Tell service worker to clear cache
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
      }

      // Unregister service worker for complete refresh
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }

      // Clear browser caches if available
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      setCleared(true);
      
      // Reload after a brief pause to show success
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Failed to clear caches:', error);
      setClearing(false);
    }
  };

  const getServiceWorkerStatus = () => {
    if (!('serviceWorker' in navigator)) {
      return { active: false, label: 'Not Supported' };
    }
    if (navigator.serviceWorker.controller) {
      return { active: true, label: 'Active' };
    }
    return { active: false, label: 'Inactive' };
  };

  const swStatus = getServiceWorkerStatus();

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <RefreshCw className="h-5 w-5" />
          Cache Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
          <span className="text-sm font-medium">Service Worker</span>
          <Badge variant={swStatus.active ? 'default' : 'secondary'} className="font-mono">
            {swStatus.label}
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground">
          If you've published changes but still see old behavior, clear all caches and reload 
          to ensure you're running the latest build.
        </p>

        <Button 
          onClick={clearCachesAndReload} 
          disabled={clearing || cleared}
          className="w-full gap-2"
          variant={cleared ? 'default' : 'destructive'}
        >
          {clearing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Clearing...
            </>
          ) : cleared ? (
            <>
              <CheckCircle className="h-4 w-4" />
              Cleared! Reloading...
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4" />
              Clear All Caches & Reload
            </>
          )}
        </Button>

        <div className="p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground">
          <p><strong>This will:</strong></p>
          <ul className="mt-1 space-y-0.5 ml-3 list-disc">
            <li>Clear localStorage app data</li>
            <li>Unregister service worker</li>
            <li>Delete browser caches</li>
            <li>Reload the page</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
