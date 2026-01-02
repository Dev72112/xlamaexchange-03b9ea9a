import React, { useEffect, useState, useCallback } from 'react';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink, Smartphone } from 'lucide-react';
import tonkeeperLogo from '@/assets/wallets/tonkeeper-logo.jpeg';
import { isMobileBrowser } from '@/lib/wallet-deeplinks';

interface TonWalletPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnectionSuccess: () => void;
  onConnectionError: (error: string) => void;
}

export function TonWalletPicker({ 
  open, 
  onOpenChange, 
  onConnectionSuccess,
  onConnectionError 
}: TonWalletPickerProps) {
  const [tonConnectUI] = useTonConnectUI();
  const tonAddress = useTonAddress();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStarted, setConnectionStarted] = useState(false);
  
  const isMobile = isMobileBrowser();

  // Track connection status changes
  useEffect(() => {
    if (!tonConnectUI) return;

    const unsubscribe = tonConnectUI.onStatusChange((wallet) => {
      if (wallet && connectionStarted) {
        setIsConnecting(false);
        setConnectionStarted(false);
        onConnectionSuccess();
        onOpenChange(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [tonConnectUI, connectionStarted, onConnectionSuccess, onOpenChange]);

  // Also check if address appears (backup for status change)
  useEffect(() => {
    if (tonAddress && connectionStarted) {
      setIsConnecting(false);
      setConnectionStarted(false);
      onConnectionSuccess();
      onOpenChange(false);
    }
  }, [tonAddress, connectionStarted, onConnectionSuccess, onOpenChange]);

  const handleConnectTonkeeper = useCallback(async () => {
    if (!tonConnectUI) return;
    
    setIsConnecting(true);
    setConnectionStarted(true);

    try {
      // Get available wallets
      const wallets = await tonConnectUI.getWallets();
      
      // Find Tonkeeper specifically
      const tonkeeper = wallets.find(
        (w) => w.name.toLowerCase().includes('tonkeeper')
      );

      if (tonkeeper) {
        // Connect to Tonkeeper specifically
        await tonConnectUI.openSingleWalletModal(tonkeeper.appName);
      } else {
        // Fallback: open modal but TonConnect will show available wallets
        await tonConnectUI.openModal();
      }
    } catch (error: any) {
      console.error('TON connection error:', error);
      setIsConnecting(false);
      setConnectionStarted(false);
      onConnectionError(error.message || 'Failed to connect to Tonkeeper');
    }
  }, [tonConnectUI, onConnectionError]);

  const handleOpenTonkeeperDeeplink = () => {
    const dappUrl = encodeURIComponent(window.location.href);
    // Tonkeeper universal link format
    window.location.href = `https://app.tonkeeper.com/dapp/${dappUrl}`;
  };

  const handleInstallTonkeeper = () => {
    window.open('https://tonkeeper.com/', '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect TON Wallet</DialogTitle>
          <DialogDescription>
            Connect with Tonkeeper to interact with the TON network.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Tonkeeper Option */}
          <button
            onClick={handleConnectTonkeeper}
            disabled={isConnecting}
            className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-accent transition-colors text-left w-full group disabled:opacity-50"
          >
            <img 
              src={tonkeeperLogo} 
              alt="Tonkeeper" 
              className="w-12 h-12 rounded-xl object-cover"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Tonkeeper</span>
                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded">
                  Recommended
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Premier wallet for the TON network
              </p>
            </div>
            {isConnecting && (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            )}
          </button>

          {/* Mobile: Open in Tonkeeper option */}
          {isMobile && (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleOpenTonkeeperDeeplink}
            >
              <Smartphone className="w-4 h-4" />
              Open in Tonkeeper App
            </Button>
          )}

          {/* Install link */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <span className="text-sm text-muted-foreground">
              Don't have Tonkeeper?
            </span>
            <Button 
              variant="link" 
              size="sm" 
              className="p-0 h-auto gap-1"
              onClick={handleInstallTonkeeper}
            >
              Download
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground text-center border-t pt-4">
          By connecting, you agree to our Terms of Service
        </div>
      </DialogContent>
    </Dialog>
  );
}
