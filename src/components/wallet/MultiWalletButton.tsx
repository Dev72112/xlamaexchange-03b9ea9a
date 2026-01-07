import React, { useState, useCallback } from 'react';
import { Wallet, ChevronDown, ExternalLink, LogOut, Copy, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useMultiWallet, ChainType } from '@/contexts/MultiWalletContext';
import { useToast } from '@/hooks/use-toast';
import { isMobileBrowser, isInWalletBrowser, getRecommendedConnectionMethod } from '@/lib/wallet-deeplinks';
import { TonWalletPicker } from './TonWalletPicker';

// Import wallet logos
import suiWalletLogo from '@/assets/wallets/sui-wallet-logo.png';
import tonkeeperLogo from '@/assets/wallets/tonkeeper-logo.jpeg';
import okxWalletLogo from '@/assets/wallets/okx-wallet-logo.png';

interface WalletOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  chainType: ChainType;
}

const nativeWalletOptions: WalletOption[] = [
  // Sui
  {
    id: 'sui-wallet',
    name: 'Sui Wallet',
    icon: suiWalletLogo,
    description: 'Official Sui network wallet',
    chainType: 'sui',
  },
  {
    id: 'suiet',
    name: 'Suiet',
    icon: 'https://suiet.app/logo.svg',
    description: 'Open-source Sui wallet',
    chainType: 'sui',
  },
  // Tron
  {
    id: 'tronlink',
    name: 'TronLink',
    icon: 'https://www.tronlink.org/images/logo.png',
    description: 'Official TRON wallet',
    chainType: 'tron',
  },
  // TON
  {
    id: 'tonkeeper',
    name: 'Tonkeeper',
    icon: tonkeeperLogo,
    description: 'Premier TON wallet',
    chainType: 'ton',
  },
];

export function MultiWalletButton() {
  const {
    activeChainType,
    activeAddress,
    hasAnyConnection,
    anyConnectedAddress,
    isConnecting,
    activeChain,
    isOkxConnected,
    isOkxAvailable,
    connectOkx,
    openConnectModal,
    connectTron,
    connectSui,
    disconnect,
    isWalletAvailable,
  } = useMultiWallet();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTonPickerOpen, setIsTonPickerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
  const { toast } = useToast();

  const isMobile = isMobileBrowser();
  const recommendedMethod = getRecommendedConnectionMethod();

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Primary: Connect OKX Wallet
  const handleOkxConnect = useCallback(async () => {
    setConnectingWallet('okx');
    try {
      const connected = await connectOkx();
      if (connected) {
        toast({
          title: 'OKX Wallet Connected',
          description: 'Multi-chain wallet ready for seamless swaps.',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to connect OKX Wallet',
        variant: 'destructive',
      });
    } finally {
      setConnectingWallet(null);
    }
  }, [connectOkx, toast]);

  // Fallback: Other wallets via AppKit or native
  const handleOtherWallets = useCallback(() => {
    const isNativeChain = ['sui', 'tron', 'ton'].includes(activeChainType);
    if (isNativeChain) {
      setIsDialogOpen(true);
    } else {
      openConnectModal();
    }
  }, [activeChainType, openConnectModal]);

  // For Sui/Tron/TON - use native dialogs
  const handleNativeConnect = useCallback(async (wallet: WalletOption) => {
    setConnectingWallet(wallet.id);
    
    try {
      let connected = false;
      
      switch (wallet.chainType) {
        case 'tron':
          connected = await connectTron(wallet.id as 'tronlink');
          break;
        case 'sui':
          connected = await connectSui(wallet.id);
          break;
        case 'ton':
          setIsDialogOpen(false);
          setIsTonPickerOpen(true);
          setConnectingWallet(null);
          return;
      }
      
      if (connected) {
        setIsDialogOpen(false);
        toast({
          title: 'Wallet Connected',
          description: `${wallet.name} connected successfully.`,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Connection Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setConnectingWallet(null);
    }
  }, [connectTron, connectSui, toast]);

  const handleTonConnectionSuccess = useCallback(() => {
    toast({
      title: 'Wallet Connected',
      description: 'Tonkeeper connected successfully.',
    });
  }, [toast]);

  const handleTonConnectionError = useCallback((error: string) => {
    toast({
      title: 'Connection Failed',
      description: error,
      variant: 'destructive',
    });
  }, [toast]);

  const handleDisconnect = () => {
    disconnect();
    toast({
      title: 'Wallet Disconnected',
      description: 'All wallets have been disconnected.',
    });
  };

  const handleCopyAddress = async () => {
    const addressToCopy = activeAddress || anyConnectedAddress;
    if (addressToCopy) {
      await navigator.clipboard.writeText(addressToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Address Copied',
        description: 'Wallet address copied to clipboard.',
      });
    }
  };

  const handleOpenExplorer = () => {
    if (activeChain && activeAddress) {
      window.open(`${activeChain.blockExplorer}/address/${activeAddress}`, '_blank');
    }
  };

  const handleIconError = (e: React.SyntheticEvent<HTMLImageElement>, name: string) => {
    const target = e.target as HTMLImageElement;
    target.onerror = null;
    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name.slice(0, 2))}&background=6366f1&color=fff&size=64`;
  };

  // Use the display address - prefer active, fall back to any connected
  const displayAddress = activeAddress || anyConnectedAddress;

  // Connected state - show dropdown
  if (hasAnyConnection && displayAddress) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <div className="flex items-center gap-2">
              {activeChain && (
                <img 
                  src={activeChain.icon} 
                  alt={activeChain.name} 
                  className="w-4 h-4 rounded-full"
                  onError={(e) => handleIconError(e, activeChain.shortName)}
                />
              )}
              <span className="hidden sm:inline">{truncateAddress(displayAddress)}</span>
              <span className="sm:hidden">
                <Wallet className="w-4 h-4" />
              </span>
              {isOkxConnected && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-green-500/50 text-green-500">
                  OKX
                </Badge>
              )}
            </div>
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            {activeChainType.toUpperCase()} Wallet
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleCopyAddress}>
            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            Copy Address
          </DropdownMenuItem>
          {activeChain && (
            <DropdownMenuItem onClick={handleOpenExplorer}>
              <ExternalLink className="w-4 h-4 mr-2" />
              View on Explorer
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDisconnect} className="text-destructive">
            <LogOut className="w-4 h-4 mr-2" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const filteredWallets = nativeWalletOptions.filter(w => w.chainType === activeChainType);
  const isConnectingAny = isConnecting || connectingWallet !== null;

  return (
    <>
      {/* Primary: OKX Connect Button */}
      <div className="flex items-center gap-2">
        <Button 
          onClick={handleOkxConnect} 
          disabled={isConnectingAny}
          className="gap-2 bg-green-600 hover:bg-green-700 text-white"
        >
          {connectingWallet === 'okx' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <img src={okxWalletLogo} alt="OKX" className="w-4 h-4 rounded" onError={(e) => handleIconError(e, 'OKX')} />
          )}
          <span className="hidden sm:inline">
            {connectingWallet === 'okx' ? 'Connecting...' : 'Connect OKX'}
          </span>
          <span className="sm:hidden">
            <Wallet className="w-4 h-4" />
          </span>
        </Button>
        
        {/* Secondary: Other Wallets */}
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleOtherWallets}
          disabled={isConnectingAny}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Other
        </Button>
      </div>

      {/* Native wallet picker for Sui/Tron/TON */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect {activeChainType.toUpperCase()} Wallet</DialogTitle>
            <DialogDescription>Choose a wallet to connect.</DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-3">
            {filteredWallets.map((wallet) => {
              const available = isWalletAvailable(wallet.id);
              const isConnectingThis = connectingWallet === wallet.id;
              
              return (
                <button
                  key={wallet.id}
                  onClick={() => handleNativeConnect(wallet)}
                  disabled={connectingWallet !== null}
                  className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-accent transition-colors text-left group w-full"
                >
                  <img 
                    src={wallet.icon} 
                    alt={wallet.name} 
                    className="w-10 h-10 rounded-lg object-cover"
                    onError={(e) => handleIconError(e, wallet.name)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{wallet.name}</span>
                      {available && wallet.chainType !== 'ton' && (
                        <Badge variant="outline" className="text-[10px] text-green-600 border-green-600/30">
                          Detected
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{wallet.description}</p>
                  </div>
                  {isConnectingThis && (
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="text-xs text-muted-foreground text-center">
            By connecting, you agree to our Terms of Service
          </div>
        </DialogContent>
      </Dialog>

      {/* Tonkeeper picker for TON */}
      <TonWalletPicker
        open={isTonPickerOpen}
        onOpenChange={setIsTonPickerOpen}
        onConnectionSuccess={handleTonConnectionSuccess}
        onConnectionError={handleTonConnectionError}
      />
    </>
  );
}
