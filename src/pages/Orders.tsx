import { memo, Suspense, lazy, useState, useEffect, useCallback, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { GlowBar } from "@/components/ui/glow-bar";
import { ListOrdered, TrendingUp, Clock, ArrowRightLeft, Wallet, Layers, Zap, AlertTriangle, Activity, ChevronDown, Target, CalendarClock, History, RefreshCw } from "lucide-react";
import { useMultiWallet } from "@/contexts/MultiWalletContext";
import { useExchangeMode } from "@/contexts/ExchangeModeContext";
import { MultiWalletButton } from "@/features/wallet";
import { cn } from "@/lib/utils";
import { SUPPORTED_CHAINS } from "@/data/chains";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { OrdersFAB } from "@/components/OrdersFAB";
import { headerBadge, headerTitle, cardEntrance, pressable } from "@/lib/animations";

// Lazy load order components
const ActiveLimitOrders = lazy(() => import("@/components/ActiveLimitOrders").then(m => ({ default: m.ActiveLimitOrders })));
const ActiveDCAOrders = lazy(() => import("@/components/ActiveDCAOrders").then(m => ({ default: m.ActiveDCAOrders })));
const OrderExecutionHistory = lazy(() => import("@/components/OrderExecutionHistory").then(m => ({ default: m.OrderExecutionHistory })));
const LimitOrderForm = lazy(() => import("@/components/LimitOrderForm").then(m => ({ default: m.LimitOrderForm })));
const DCAOrderForm = lazy(() => import("@/components/DCAOrderForm").then(m => ({ default: m.DCAOrderForm })));

type ChainFilter = 'evm' | 'solana';

const Orders = memo(function Orders() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { 
    isConnected, 
    activeChainType, 
    setActiveChain, 
    switchChainByIndex,
    isOkxConnected,
    switchEvmChain,
    activeChain,
  } = useMultiWallet();
  
  const { setGlobalChainFilter } = useExchangeMode();
  
  // Collapsible states
  const [showLimitOrders, setShowLimitOrders] = useState(true);
  const [showDCAOrders, setShowDCAOrders] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Default chain filter based on current wallet connection
  const [chainFilter, setChainFilter] = useState<ChainFilter>(
    activeChainType === 'solana' ? 'solana' : 'evm'
  );
  
  // Track if we need a network switch
  const [isSwitching, setIsSwitching] = useState(false);
  
  // Refs to scroll to quick actions
  const quickActionsRef = useRef<HTMLDivElement>(null);

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

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['limit-orders'] });
    await queryClient.invalidateQueries({ queryKey: ['dca-orders'] });
    toast.success('Orders refreshed');
    setIsRefreshing(false);
  }, [queryClient]);

  return (
    <AppLayout>
      <Helmet>
        <title>Orders | xlama - Manage Limit & DCA Orders</title>
        <meta
          name="description"
          content="Manage your limit orders and DCA (Dollar Cost Averaging) orders. View active orders, order history, and track execution status."
        />
      </Helmet>

      <div className="container px-4 pb-6 max-w-2xl lg:max-w-3xl 2xl:max-w-4xl mx-auto">
        {/* Header with animations */}
        <motion.div 
          className="text-center mb-6"
          variants={headerBadge}
          initial="initial"
          animate="animate"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-primary/20 text-xs sm:text-sm text-primary mb-3">
            <ListOrdered className="w-3.5 h-3.5" />
            <span>Order Management</span>
          </div>
          <motion.h1 
            className="text-2xl sm:text-3xl font-bold gradient-text mb-1"
            variants={headerTitle}
            initial="initial"
            animate="animate"
          >
            Orders
          </motion.h1>
          <p className="text-sm text-muted-foreground">Limit orders & DCA strategies</p>
        </motion.div>

        {/* Chain Toggle & Refresh Row */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="inline-flex items-center gap-1 p-1 rounded-lg glass border border-border/50">
            <Layers className="w-4 h-4 text-muted-foreground ml-2" />
            <Button
              variant={chainFilter === 'evm' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleChainFilterChange('evm')}
              disabled={isSwitching}
              className={cn(
                "h-7 px-2.5 text-xs",
                chainFilter === 'evm' && "bg-primary text-primary-foreground"
              )}
            >
              EVM
            </Button>
            <Button
              variant={chainFilter === 'solana' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleChainFilterChange('solana')}
              disabled={isSwitching}
              className={cn(
                "h-7 px-2.5 text-xs gap-1",
                chainFilter === 'solana' && "bg-primary text-primary-foreground"
              )}
            >
              <Zap className="w-3 h-3" />
              SOL
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Sync indicator */}
            {isConnected && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className={cn("w-1.5 h-1.5 rounded-full", isWalletSynced ? 'bg-success' : 'bg-warning')} />
                {isWalletSynced ? 'Synced' : 'Switch wallet'}
              </div>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 w-8"
            >
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            </Button>
          </div>
        </div>

        {!isConnected ? (
          <motion.div
            variants={cardEntrance}
            initial="initial"
            animate="animate"
          >
            <Card className="glass glow-sm border-primary/10 overflow-hidden">
              <GlowBar variant="multi" />
              <CardContent className="pt-8 pb-8 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-4 glow-sm">
                  <Wallet className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Connect Wallet</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
                  Connect an EVM wallet to create and manage limit orders and DCA strategies.
                </p>
                <MultiWalletButton />
                
                {/* Feature preview */}
                <div className="mt-8 pt-6 border-t border-border/50 grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg glass-subtle text-center">
                    <Target className="w-5 h-5 text-primary mx-auto mb-1.5" />
                    <p className="text-xs font-medium">Limit Orders</p>
                    <p className="text-[10px] text-muted-foreground">Set target prices</p>
                  </div>
                  <div className="p-3 rounded-lg glass-subtle text-center">
                    <CalendarClock className="w-5 h-5 text-primary mx-auto mb-1.5" />
                    <p className="text-xs font-medium">DCA Strategies</p>
                    <p className="text-[10px] text-muted-foreground">Automated buys</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : chainFilter === 'solana' ? (
          // Solana orders - coming soon
          <Card className="glass border-border/50">
            <CardContent className="py-12 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Solana Orders Coming Soon</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Limit orders and DCA for Solana are in development.
              </p>
              <Button variant="outline" onClick={() => handleChainFilterChange('evm')}>
                Switch to EVM
              </Button>
            </CardContent>
          </Card>
        ) : (
          // EVM Orders - Full functionality
          <div className="space-y-3">
            {/* Quick Actions */}
            <div ref={quickActionsRef} className="flex items-center gap-2">
              <Suspense fallback={<div className="h-9 flex-1 skeleton-shimmer rounded-lg" />}>
                <LimitOrderForm standalone className="flex-1" />
              </Suspense>
              <Suspense fallback={<div className="h-9 flex-1 skeleton-shimmer rounded-lg" />}>
                <DCAOrderForm standalone className="flex-1" />
              </Suspense>
            </div>

            {/* Active Limit Orders */}
            <Collapsible open={showLimitOrders} onOpenChange={setShowLimitOrders}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between h-10 glass-subtle">
                  <span className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    Active Limit Orders
                  </span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", showLimitOrders && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <Suspense fallback={<div className="h-32 skeleton-shimmer rounded-lg" />}>
                  <ActiveLimitOrders />
                </Suspense>
              </CollapsibleContent>
            </Collapsible>

            {/* Active DCA Strategies */}
            <Collapsible open={showDCAOrders} onOpenChange={setShowDCAOrders}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between h-10 glass-subtle">
                  <span className="flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-primary" />
                    DCA Strategies
                  </span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", showDCAOrders && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <Suspense fallback={<div className="h-32 skeleton-shimmer rounded-lg" />}>
                  <ActiveDCAOrders />
                </Suspense>
              </CollapsibleContent>
            </Collapsible>

            {/* Order History */}
            <Collapsible open={showHistory} onOpenChange={setShowHistory}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between h-10 glass-subtle">
                  <span className="flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" />
                    Order History
                  </span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", showHistory && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <Suspense fallback={<div className="h-32 skeleton-shimmer rounded-lg" />}>
                  <OrderExecutionHistory />
                </Suspense>
              </CollapsibleContent>
            </Collapsible>

            {/* Perpetuals CTA */}
            <Card className="glass border-primary/10 mt-4">
              <CardContent className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Trade Perpetuals</p>
                    <p className="text-xs text-muted-foreground">Up to 50x leverage</p>
                  </div>
                </div>
                <Button 
                  onClick={() => navigate('/perpetuals')}
                  size="sm"
                  variant="outline"
                >
                  Open
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Mobile FAB for quick order creation - scrolls to buttons */}
        {isConnected && chainFilter === 'evm' && (
          <OrdersFAB 
            onCreateLimitOrder={() => {
              quickActionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }} 
            onCreateDCAOrder={() => {
              quickActionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }} 
          />
        )}
      </div>
    </AppLayout>
  );
});

export default Orders;
