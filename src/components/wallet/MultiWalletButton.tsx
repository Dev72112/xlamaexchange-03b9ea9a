import React, { useState } from 'react';
import { Wallet, ChevronDown, ExternalLink, LogOut, Copy, Check } from 'lucide-react';
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
import { useMultiWallet, ChainType } from '@/contexts/MultiWalletContext';
import { useToast } from '@/hooks/use-toast';

interface WalletOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  installUrl: string;
  chainType: ChainType;
}

const walletOptions: WalletOption[] = [
  // EVM
  {
    id: 'okx',
    name: 'OKX Wallet',
    icon: 'https://static.okx.com/cdn/wallet/logo/okxwallet.png',
    description: 'For EVM chains (Ethereum, X Layer, etc.)',
    installUrl: 'https://www.okx.com/web3',
    chainType: 'evm',
  },
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg',
    description: 'For EVM chains',
    installUrl: 'https://metamask.io/download/',
    chainType: 'evm',
  },
  // Solana
  {
    id: 'phantom',
    name: 'Phantom',
    icon: 'https://phantom.app/img/phantom-logo.svg',
    description: 'For Solana',
    installUrl: 'https://phantom.app/',
    chainType: 'solana',
  },
  {
    id: 'solflare',
    name: 'Solflare',
    icon: 'https://solflare.com/assets/logo.svg',
    description: 'For Solana',
    installUrl: 'https://solflare.com/',
    chainType: 'solana',
  },
  // Tron
  {
    id: 'tronlink',
    name: 'TronLink',
    icon: 'https://www.tronlink.org/images/logo.png',
    description: 'For TRON network',
    installUrl: 'https://www.tronlink.org/',
    chainType: 'tron',
  },
  // Sui
  {
    id: 'sui-wallet',
    name: 'Sui Wallet',
    icon: 'https://sui.io/favicon.svg',
    description: 'For Sui network',
    installUrl: 'https://chrome.google.com/webstore/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil',
    chainType: 'sui',
  },
  // TON
  {
    id: 'tonkeeper',
    name: 'Tonkeeper',
    icon: 'https://tonkeeper.com/assets/tonkeeper-logo.svg',
    description: 'For TON network',
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
  } = useMultiWallet();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedTab, setSelectedTab] = useState<ChainType>('evm');
  const { toast } = useToast();

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleConnect = async (wallet: WalletOption) => {
    try {
      switch (wallet.chainType) {
        case 'evm':
          await connectEvm(wallet.id as 'okx' | 'metamask');
          break;
        case 'solana':
          await connectSolana();
          break;
        case 'tron':
          await connectTron();
          break;
        case 'sui':
          await connectSui();
          break;
        case 'ton':
          await connectTon();
          break;
      }
      setIsDialogOpen(false);
      toast({
        title: 'Wallet Connected',
        description: `${wallet.name} connected successfully.`,
      });
    } catch (error: any) {
      toast({
        title: 'Connection Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

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

  // Get the address for the current active chain type
  const displayAddress = activeAddress;

  // Fallback icon handler
  const handleIconError = (e: React.SyntheticEvent<HTMLImageElement>, name: string) => {
    const target = e.target as HTMLImageElement;
    target.onerror = null;
    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name.slice(0, 2))}&background=6366f1&color=fff&size=64`;
  };

  // Get connected wallet info for dropdown
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
            {copied ? (
              <Check className="w-4 h-4 mr-2" />
            ) : (
              <Copy className="w-4 h-4 mr-2" />
            )}
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

  // Filter wallets by chain type for the selected tab
  const filteredWallets = walletOptions.filter(w => w.chainType === selectedTab);

  return (
    <>
      <Button 
        onClick={() => setIsDialogOpen(true)} 
        disabled={isConnecting}
        className="gap-2"
      >
        <Wallet className="w-4 h-4" />
        <span className="hidden sm:inline">
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </span>
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Wallet</DialogTitle>
            <DialogDescription>
              Choose a wallet for your selected network.
            </DialogDescription>
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
                {filteredWallets.map((wallet) => (
                  <button
                    key={wallet.id}
                    onClick={() => handleConnect(wallet)}
                    disabled={isConnecting}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-accent transition-colors text-left group"
                  >
                    <img 
                      src={wallet.icon} 
                      alt={wallet.name} 
                      className="w-10 h-10 rounded-lg"
                      onError={(e) => handleIconError(e, wallet.name)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{wallet.name}</span>
                        {wallet.id === 'okx' && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {wallet.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <div className="text-xs text-muted-foreground text-center">
            By connecting, you agree to our Terms of Service
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
