import { memo, Suspense, lazy, useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Layout } from "@/shared/components";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListOrdered, TrendingUp, Clock, ArrowRightLeft, Wallet, Layers, Zap, AlertTriangle, Activity, Rocket } from "lucide-react";
import { useMultiWallet } from "@/contexts/MultiWalletContext";
import { useExchangeMode } from "@/contexts/ExchangeModeContext";
import { MultiWalletButton } from "@/features/wallet";
import { OrdersSkeleton } from "@/components/skeletons";
import { getStaggerStyle, STAGGER_ITEM_CLASS } from "@/lib/staggerAnimation";
import { cn } from "@/lib/utils";
import { SUPPORTED_CHAINS } from "@/data/chains";
import { useNavigate } from "react-router-dom";

// Lazy load order components from feature modules
const DexTransactionHistory = lazy(() => import("@/components/DexTransactionHistory").then(m => ({ default: m.DexTransactionHistory })));

const ordersFeatures = [
  {
    icon: TrendingUp,
    title: "Limit Orders",
    description: "Set price targets and automatically execute trades when conditions are met.",
  },
  {
    icon: Clock,
    title: "DCA Schedules",
    description: "Automate your investing with scheduled recurring purchases.",
  },
  {
    icon: ArrowRightLeft,
    title: "Transaction History",
    description: "View all your past trades with detailed execution information.",
  },
  {
    icon: ListOrdered,
    title: "Order Management",
    description: "Monitor, modify, or cancel your active orders anytime.",
  },
];

type ChainFilter = 'evm' | 'solana';

const chainFilterOptions: { value: ChainFilter; label: string; description: string; icon?: React.ReactNode }[] = [
  { value: 'evm', label: 'EVM', description: 'ETH, BSC, Polygon, etc.' },
  { value: 'solana', label: 'Solana', description: 'SOL & SPL tokens', icon: <Zap className="w-3 h-3" /> },
];

const Orders = memo(function Orders() {
  const navigate = useNavigate();
  const { 
    isConnected, 
    activeChainType, 
    setActiveChain, 
    switchChainByIndex,
    isOkxConnected,
    switchEvmChain,
    evmChainId,
  } = useMultiWallet();
  
  const { setGlobalChainFilter } = useExchangeMode();
  
  // Default chain filter based on current wallet connection
  const [chainFilter, setChainFilter] = useState<ChainFilter>(
    activeChainType === 'solana' ? 'solana' : 'evm'
  );
  
  // Track if we need a network switch
  const [isSwitching, setIsSwitching] = useState(false);

  // Sync chain filter with wallet connection changes
  useEffect(() => {
    if (activeChainType === 'solana') {
      setChainFilter('solana');
    } else if (activeChainType === 'evm') {
      setChainFilter('evm');
    }
  }, [activeChainType]);

  // Handle chain filter change - actually switch the app's active chain
  const handleChainFilterChange = useCallback(async (newFilter: ChainFilter) => {
    setChainFilter(newFilter);
    
    // Update global chain filter for Analytics/Portfolio/History pages
    if (newFilter === 'solana') {
      setGlobalChainFilter('501');
    } else {
      setGlobalChainFilter('all-evm');
    }
    
    // Find the target chain
    const targetChain = newFilter === 'solana'
      ? SUPPORTED_CHAINS.find(c => c.chainIndex === '501')
      : SUPPORTED_CHAINS.find(c => c.chainIndex === '1'); // Default to Ethereum for EVM
    
    if (!targetChain) return;
    
    // Update the app's active chain
    setActiveChain(targetChain);
    
    // For OKX wallet, also switch the wallet's namespace
    if (isOkxConnected) {
      try {
        setIsSwitching(true);
        await switchChainByIndex(targetChain.chainIndex);
      } catch (err) {
        console.warn('[Orders] Chain switch failed:', err);
      } finally {
        setIsSwitching(false);
      }
    }
  }, [setActiveChain, switchChainByIndex, isOkxConnected, setGlobalChainFilter]);

  // Handle manual network switch for EVM when not synced
  const handleNetworkSwitch = useCallback(async () => {
    if (chainFilter !== 'evm') return;
    
    const targetChain = SUPPORTED_CHAINS.find(c => c.chainIndex === '1');
    if (!targetChain?.chainId) return;
    
    try {
      setIsSwitching(true);
      
      if (isOkxConnected) {
        await switchChainByIndex(targetChain.chainIndex);
      } else {
        await switchEvmChain(targetChain.chainId);
      }
      
      setActiveChain(targetChain);
    } catch (err) {
      console.warn('[Orders] Network switch failed:', err);
    } finally {
      setIsSwitching(false);
    }
  }, [chainFilter, isOkxConnected, switchChainByIndex, switchEvmChain, setActiveChain]);

  // Check if wallet is synced with selected filter
  const isWalletSynced = activeChainType === chainFilter || 
    (chainFilter === 'evm' && activeChainType !== 'solana' && activeChainType !== 'tron' && activeChainType !== 'sui' && activeChainType !== 'ton');

  return (
    <Layout>
      <Helmet>
        <title>Orders | xlama - Manage Limit & DCA Orders</title>
        <meta
          name="description"
          content="Manage your limit orders and DCA (Dollar Cost Averaging) orders. View active orders, order history, and track execution status."
        />
        <meta property="og:title" content="Orders | xlama" />
        <meta property="og:description" content="Manage your limit orders and DCA orders. Track execution status and view order history." />
        <link rel="canonical" href="https://xlama.exchange/orders" />
      </Helmet>

      <main className="container px-4 sm:px-6 pb-8 sm:pb-12">
        {/* Animated background accent */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
        </div>

        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-primary/20 text-sm text-primary mb-4">
            <ListOrdered className="w-4 h-4" />
            <span>Order Management</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 gradient-text">
            Your Orders
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Manage limit orders, DCA schedules, and view your transaction history. 
            All orders are monitored 24/7 with instant notifications.
          </p>
        </div>

        {/* Connect wallet prompt if not connected */}
        {!isConnected ? (
          <div className="max-w-xl mx-auto">
            <Card className="glass glow-sm border-primary/10 sweep-effect glow-border-animated">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-4 glow-sm">
                  <ListOrdered className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  We recommend <strong className="text-primary">OKX Wallet</strong> for the best multi-chain experience.
                </p>
                <p className="text-xs text-muted-foreground mb-6">
                  Connect to view and manage your orders, DCA schedules, and transaction history.
                </p>
                <MultiWalletButton />

                {/* Feature Preview */}
                <div className="mt-8 pt-8 border-t border-border/50">
                  <h4 className="text-sm font-medium text-muted-foreground mb-4">What you'll get access to:</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {ordersFeatures.map((feature, index) => (
                      <div
                        key={feature.title}
                        className={`p-3 rounded-lg glass-subtle hover-lift sweep-effect ${STAGGER_ITEM_CLASS}`}
                        style={getStaggerStyle(index, 80)}
                      >
                        <feature.icon className="w-5 h-5 text-primary mb-2" />
                        <p className="text-sm font-medium">{feature.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Suspense fallback={<OrdersSkeleton />}>
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Chain Filter Toggle with Connection Indicator */}
              <div className="flex flex-col items-center gap-3">
                <div className="inline-flex items-center gap-1 p-1 rounded-lg glass border border-border/50">
                  <Layers className="w-4 h-4 text-muted-foreground ml-2" />
                  {chainFilterOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={chainFilter === option.value ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handleChainFilterChange(option.value)}
                      disabled={isSwitching}
                      className={cn(
                        "h-8 px-3 text-xs gap-1.5",
                        chainFilter === option.value && "bg-primary text-primary-foreground"
                      )}
                    >
                      {option.icon}
                      {option.label}
                      {chainFilter === option.value && (
                        <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-primary-foreground/20">
                          Active
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>

                {/* Connection Indicator */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    isWalletSynced ? 'bg-success animate-pulse' : 'bg-warning'
                  )} />
                  <span>
                    Connected to <span className="font-medium text-foreground">
                      {activeChainType === 'solana' ? 'Solana' : 'EVM'}
                    </span>
                  </span>
                  {isWalletSynced ? (
                    <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                      Synced
                    </Badge>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNetworkSwitch}
                      disabled={isSwitching}
                      className="h-5 px-2 text-[10px] border-warning text-warning hover:bg-warning/10"
                    >
                      {isSwitching ? 'Switching...' : `Switch to ${chainFilter === 'solana' ? 'Solana' : 'Ethereum'}`}
                    </Button>
                  )}
                </div>
                
                {/* Network mismatch warning */}
                {!isWalletSynced && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-warning/10 border border-warning/20 text-xs text-warning">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Wallet is on a different network than selected filter</span>
                  </div>
                )}
              </div>

              <p className="text-center text-xs text-muted-foreground">
                Viewing {chainFilter === 'solana' ? 'Solana' : 'EVM'} orders • 
                {chainFilter === 'solana' 
                  ? ' Limit orders & DCA coming soon' 
                  : ' ETH, BSC, Polygon, Arbitrum, Base & more'}
              </p>

              {/* Perpetuals CTA for EVM */}
              {chainFilter === 'evm' && (
                <Card className="glass border-primary/20 glow-sm sweep-effect">
                  <CardContent className="py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Activity className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Trade Perpetuals on Hyperliquid</p>
                        <p className="text-xs text-muted-foreground">
                          Long or short with up to 50x leverage on BTC, ETH, SOL and more
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => window.location.href = '/perpetuals'}
                      className="shrink-0"
                      size="sm"
                    >
                      <Activity className="w-4 h-4 mr-2" />
                      Open Perpetuals
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Solana Orders - Coming Soon */}
              {chainFilter === 'solana' && (
                <Card className="glass border-warning/20 glow-sm">
                  <CardContent className="py-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-warning/20 to-warning/5 flex items-center justify-center mx-auto mb-4">
                      <Rocket className="w-8 h-8 text-warning" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Solana Limit Orders & DCA Coming Soon</h3>
                    <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                      We're working on bringing limit orders and DCA schedules to Solana. 
                      For now, you can use instant swaps or try Perpetuals for advanced trading.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button 
                        onClick={() => navigate('/swap')}
                        variant="outline"
                        size="sm"
                      >
                        <ArrowRightLeft className="w-4 h-4 mr-2" />
                        Swap on Solana
                      </Button>
                      <Button 
                        onClick={() => navigate('/perpetuals')}
                        size="sm"
                      >
                        <Activity className="w-4 h-4 mr-2" />
                        Try Perpetuals
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Transaction History */}
              <section id="history" className="scroll-mt-20">
                <Suspense fallback={<div className="h-48 skeleton-shimmer rounded-lg" />}>
                  <DexTransactionHistory />
                </Suspense>
              </section>
            </div>
          </Suspense>
        )}
      </main>
    </Layout>
  );
});

export default Orders;
