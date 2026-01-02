import React, { useState, useCallback } from 'react';
import { Wallet, ChevronDown, ExternalLink, LogOut, Copy, Check, Loader2, Smartphone, Wifi } from 'lucide-react';
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
import { isMobileBrowser, isInWalletBrowser, getWalletInstallUrl } from '@/lib/wallet-deeplinks';
import { TonWalletPicker } from './TonWalletPicker';

// Import wallet logos
import phantomLogo from '@/assets/wallets/phantom-logo.png';
import solflareLogo from '@/assets/wallets/solflare-logo.png';
import suiWalletLogo from '@/assets/wallets/sui-wallet-logo.png';
import tonkeeperLogo from '@/assets/wallets/tonkeeper-logo.jpeg';
import okxWalletLogo from '@/assets/wallets/okx-wallet-logo.png';

interface WalletOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  installUrl: string;
  chainType: ChainType;
}

const walletOptions: WalletOption[] = [
  // EVM - On mobile, these will trigger WalletConnect
  {
    id: 'okx',
    name: 'OKX Wallet',
    icon: okxWalletLogo,
    description: 'Multi-chain wallet for EVM, Solana & more',
    installUrl: 'https://www.okx.com/web3',
    chainType: 'evm',
  },
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg',
    description: 'Popular Ethereum & EVM wallet',
    installUrl: 'https://metamask.io/download/',
    chainType: 'evm',
  },
  // Solana
  {
    id: 'phantom',
    name: 'Phantom',
    icon: phantomLogo,
    description: 'Leading Solana wallet',
    installUrl: 'https://phantom.app/',
    chainType: 'solana',
  },
  {
    id: 'solflare',
    name: 'Solflare',
    icon: solflareLogo,
    description: 'Secure Solana wallet',
    installUrl: 'https://solflare.com/',
    chainType: 'solana',
  },
  // Tron - Only TronLink (TokenPocket removed as it doesn't support Tron properly)
  {
    id: 'tronlink',
    name: 'TronLink',
    icon: 'https://www.tronlink.org/images/logo.png',
    description: 'Official TRON wallet',
    installUrl: 'https://www.tronlink.org/',
    chainType: 'tron',
  },
  // Sui - Multiple wallet options
  {
    id: 'sui-wallet',
    name: 'Sui Wallet',
    icon: suiWalletLogo,
    description: 'Official Sui network wallet',
    installUrl: 'https://chrome.google.com/webstore/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil',
    chainType: 'sui',
  },
  {
    id: 'suiet',
    name: 'Suiet',
    icon: 'https://suiet.app/logo.svg',
    description: 'Open-source Sui wallet',
    installUrl: 'https://suiet.app/',
    chainType: 'sui',
  },
  // TON
  {
    id: 'tonkeeper',
    name: 'Tonkeeper',
    icon: tonkeeperLogo,
    description: 'Premier TON wallet',
    installUrl: 'https://tonkeeper.com/',
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
    evmAddress,
    solanaAddress,
    tronAddress,
    suiAddress,
    tonAddress,
    connectEvm,
    connectSolana,
    connectTron,
    connectSui,
    connectTon,
    disconnect,
    isWalletAvailable,
    openInWallet,
  } = useMultiWallet();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTonPickerOpen, setIsTonPickerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedTab, setSelectedTab] = useState<ChainType>('evm');
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
  const { toast } = useToast();

  const isMobile = isMobileBrowser();
  const isInsideWallet = isInWalletBrowser();

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleConnect = useCallback(async (wallet: WalletOption) => {
    setConnectingWallet(wallet.id);
    
    try {
      let connected = false;
      
      switch (wallet.chainType) {
        case 'evm':
          // On mobile without injected provider, use WalletConnect instead of deep-links
          if (isMobile && !isInsideWallet && !isWalletAvailable(wallet.id)) {
            // Close dialog and trigger WalletConnect
            setIsDialogOpen(false);
            await new Promise((r) => setTimeout(r, 75));
            connected = await connectEvm(undefined, true);
          } else {
            connected = await connectEvm(wallet.id as 'okx' | 'metamask');
          }
          break;
        case 'solana':
          connected = await connectSolana(wallet.id as 'phantom' | 'solflare');
          break;
        case 'tron':
          connected = await connectTron(wallet.id as 'tronlink');
          break;
        case 'sui':
          connected = await connectSui(wallet.id);
          break;
        case 'ton':
          // Open Tonkeeper-only picker instead
          setIsDialogOpen(false);
          setIsTonPickerOpen(true);
          setConnectingWallet(null);
          return; // Don't show toast yet
      }
      
      if (connected) {
        setIsDialogOpen(false);
        toast({
          title: 'Wallet Connected',
          description: `${wallet.name} connected successfully.`,
        });
      }
      // If not connected but no error, it means deep-link was opened
    } catch (error: any) {
      toast({
        title: 'Connection Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setConnectingWallet(null);
    }
  }, [connectEvm, connectSolana, connectTron, connectSui, toast, isMobile, isInsideWallet, isWalletAvailable]);

  const handleWalletConnectEvm = useCallback(async () => {
    setConnectingWallet('walletconnect');

    // Close our Radix Dialog first so it can remove its scroll-lock.
    // Otherwise the WalletConnect modal list can become unscrollable on mobile.
    setIsDialogOpen(false);

    try {
      // Give the Dialog a moment to unmount and release scroll lock before opening WalletConnect.
      await new Promise((r) => setTimeout(r, 75));

      const connected = await connectEvm(undefined, true);
      if (connected) {
        toast({
          title: 'Wallet Connected',
          description: 'Connected via WalletConnect.',
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
  }, [connectEvm, toast]);

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

  const handleOpenInWallet = useCallback((walletId: string) => {
    openInWallet(walletId);
    toast({
      title: 'Opening Wallet',
      description: 'Redirecting to wallet app...',
    });
  }, [openInWallet, toast]);

  const handleInstallWallet = useCallback((wallet: WalletOption) => {
    window.open(wallet.installUrl, '_blank');
  }, []);

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

  const displayAddress = activeAddress;

  const handleIconError = (e: React.SyntheticEvent<HTMLImageElement>, name: string) => {
    const target = e.target as HTMLImageElement;
    target.onerror = null;
    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name.slice(0, 2))}&background=6366f1&color=fff&size=64`;
  };

  const getConnectedWalletLabel = () => {
    if (activeChainType === 'evm' && evmAddress) return 'EVM Wallet';
    if (activeChainType === 'solana' && solanaAddress) return 'Solana Wallet';
    if (activeChainType === 'tron' && tronAddress) return 'Tron Wallet';
    if (activeChainType === 'sui' && suiAddress) return 'Sui Wallet';
    if (activeChainType === 'ton' && tonAddress) return 'TON Wallet';
    return 'Wallet';
  };

  if (isConnected && displayAddress) {
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
            </div>
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            {getConnectedWalletLabel()}
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

  const filteredWallets = walletOptions.filter(w => w.chainType === selectedTab);

  return (
    <>
      <Button onClick={() => setIsDialogOpen(true)} disabled={isConnecting} className="gap-2">
        <Wallet className="w-4 h-4" />
        <span className="hidden sm:inline">{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Wallet</DialogTitle>
            <DialogDescription>Choose a wallet for your selected network.</DialogDescription>
          </DialogHeader>
          
          <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as ChainType)} className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-4">
              <TabsTrigger value="evm" className="text-xs">EVM</TabsTrigger>
              <TabsTrigger value="solana" className="text-xs">Solana</TabsTrigger>
              <TabsTrigger value="tron" className="text-xs">Tron</TabsTrigger>
              <TabsTrigger value="sui" className="text-xs">Sui</TabsTrigger>
              <TabsTrigger value="ton" className="text-xs">TON</TabsTrigger>
            </TabsList>
            
            <TabsContent value={selectedTab} className="mt-0">
              <div className="grid gap-3">
                {/* WalletConnect option for EVM on mobile */}
                {selectedTab === 'evm' && isMobile && !isInsideWallet && (
                  <button
                    onClick={handleWalletConnectEvm}
                    disabled={connectingWallet !== null}
                    className="flex items-center gap-4 p-4 rounded-lg border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-left group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Wifi className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">WalletConnect</span>
                        <Badge variant="secondary" className="text-[10px]">Recommended</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Scan QR with any wallet</p>
                    </div>
                    {connectingWallet === 'walletconnect' && (
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    )}
                  </button>
                )}

                {filteredWallets.map((wallet) => {
                  const available = isWalletAvailable(wallet.id);
                  const isConnectingThis = connectingWallet === wallet.id;
                  const showMobileOptions = isMobile && !isInsideWallet && !available && wallet.chainType !== 'ton';
                  
                  return (
                    <div key={wallet.id} className="space-y-2">
                      <button
                        onClick={() => handleConnect(wallet)}
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
                            {wallet.id === 'okx' && (
                              <Badge variant="secondary" className="text-[10px]">Recommended</Badge>
                            )}
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
                      
                      {/* Mobile: Open in Wallet option */}
                      {showMobileOptions && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-2 text-xs"
                          onClick={() => handleOpenInWallet(wallet.id)}
                        >
                          <Smartphone className="w-3 h-3" />
                          Open in {wallet.name} App
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>

          <div className="text-xs text-muted-foreground text-center">
            By connecting, you agree to our Terms of Service
          </div>
        </DialogContent>
      </Dialog>

      {/* Tonkeeper-only picker for TON */}
      <TonWalletPicker
        open={isTonPickerOpen}
        onOpenChange={setIsTonPickerOpen}
        onConnectionSuccess={handleTonConnectionSuccess}
        onConnectionError={handleTonConnectionError}
      />
    </>
  );
}
