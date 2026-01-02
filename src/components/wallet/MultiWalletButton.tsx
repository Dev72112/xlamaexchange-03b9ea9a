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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useMultiWallet, ChainType } from '@/contexts/MultiWalletContext';
import { useToast } from '@/hooks/use-toast';
import { isMobileBrowser, isInWalletBrowser } from '@/lib/wallet-deeplinks';
import { TonWalletPicker } from './TonWalletPicker';

// Import wallet logos
import suiWalletLogo from '@/assets/wallets/sui-wallet-logo.png';
import tonkeeperLogo from '@/assets/wallets/tonkeeper-logo.jpeg';

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
    isConnected,
    isConnecting,
    activeChain,
    openConnectModal,
    connectTron,
    connectSui,
    disconnect,
    isWalletAvailable,
  } = useMultiWallet();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTonPickerOpen, setIsTonPickerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedTab, setSelectedTab] = useState<ChainType>('sui');
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
  const { toast } = useToast();

  const isMobile = isMobileBrowser();

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // For EVM/Solana - use AppKit modal
  const handleAppKitConnect = useCallback(() => {
    openConnectModal();
  }, [openConnectModal]);

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
    if (activeAddress) {
      await navigator.clipboard.writeText(activeAddress);
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

  // Connected state - show dropdown
  if (isConnected && activeAddress) {
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
              <span className="hidden sm:inline">{truncateAddress(activeAddress)}</span>
              <span className="sm:hidden">
                <Wallet className="w-4 h-4" />
              </span>
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

  // Disconnected state - for EVM/Solana use AppKit, for others show native dialog
  const isNativeChain = ['sui', 'tron', 'ton'].includes(activeChainType);

  if (!isNativeChain) {
    // EVM/Solana - use AppKit modal directly
    return (
      <Button onClick={handleAppKitConnect} disabled={isConnecting} className="gap-2">
        <Wallet className="w-4 h-4" />
        <span className="hidden sm:inline">{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
      </Button>
    );
  }

  // Sui/Tron/TON - show native wallet picker
  const filteredWallets = nativeWalletOptions.filter(w => w.chainType === activeChainType);

  return (
    <>
      <Button onClick={() => setIsDialogOpen(true)} disabled={isConnecting} className="gap-2">
        <Wallet className="w-4 h-4" />
        <span className="hidden sm:inline">{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
      </Button>

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
