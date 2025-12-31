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
import { useWallet, WalletType } from '@/contexts/WalletContext';
import { useToast } from '@/hooks/use-toast';

interface WalletOption {
  id: WalletType;
  name: string;
  icon: string;
  description: string;
  installUrl: string;
}

const walletOptions: WalletOption[] = [
  {
    id: 'okx',
    name: 'OKX Wallet',
    icon: 'https://static.okx.com/cdn/wallet/logo/okxwallet.png',
    description: 'Connect using OKX Wallet',
    installUrl: 'https://www.okx.com/web3',
  },
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg',
    description: 'Connect using MetaMask',
    installUrl: 'https://metamask.io/download/',
  },
];

export function WalletButton() {
  const { isConnected, address, chain, walletType, isConnecting, connect, disconnect } = useWallet();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleConnect = async (wallet: WalletType) => {
    try {
      await connect(wallet);
      setIsDialogOpen(false);
      toast({
        title: 'Wallet Connected',
        description: 'Your wallet has been connected successfully.',
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
      description: 'Your wallet has been disconnected.',
    });
  };

  const handleCopyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Address Copied',
        description: 'Wallet address copied to clipboard.',
      });
    }
  };

  const handleOpenExplorer = () => {
    if (chain && address) {
      window.open(`${chain.blockExplorer}/address/${address}`, '_blank');
    }
  };

  const isWalletAvailable = (walletId: WalletType): boolean => {
    if (walletId === 'okx') return !!window.okxwallet;
    if (walletId === 'metamask') return !!window.ethereum;
    return false;
  };

  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <div className="flex items-center gap-2">
              {chain && (
                <img 
                  src={chain.icon} 
                  alt={chain.name} 
                  className="w-4 h-4 rounded-full"
                />
              )}
              <span className="hidden sm:inline">{truncateAddress(address)}</span>
              <span className="sm:hidden">
                <Wallet className="w-4 h-4" />
              </span>
            </div>
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            {walletType === 'okx' ? 'OKX Wallet' : 'MetaMask'}
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
          {chain && (
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
              Choose a wallet to connect for DEX swaps on X Layer and other chains.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-3 py-4">
            {walletOptions.map((wallet) => {
              const isAvailable = isWalletAvailable(wallet.id);
              
              return (
                <button
                  key={wallet.id}
                  onClick={() => isAvailable ? handleConnect(wallet.id) : window.open(wallet.installUrl, '_blank')}
                  disabled={isConnecting}
                  className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-accent transition-colors text-left group"
                >
                  <img 
                    src={wallet.icon} 
                    alt={wallet.name} 
                    className="w-10 h-10 rounded-lg"
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
                      {isAvailable ? wallet.description : 'Click to install'}
                    </p>
                  </div>
                  {!isAvailable && (
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
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
    </>
  );
}
