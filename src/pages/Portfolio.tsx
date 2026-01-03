import { Layout } from "@/components/Layout";
import { Helmet } from "react-helmet-async";
import { useMultiWallet } from "@/contexts/MultiWalletContext";
import { usePortfolioBalances, PortfolioToken } from "@/hooks/usePortfolioBalances";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, RefreshCw, Layers } from "lucide-react";
import { getStaggerStyle, STAGGER_ITEM_CLASS } from "@/lib/staggerAnimation";
import { Link } from "react-router-dom";
import { SUPPORTED_CHAINS } from "@/data/chains";

function formatUsd(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
}

function formatBalance(value: string): string {
  const num = parseFloat(value);
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(2)}K`;
  }
  if (num < 0.0001 && num > 0) {
    return '< 0.0001';
  }
  return num.toFixed(4).replace(/\.?0+$/, '');
}

function TokenRow({ token, index }: { token: PortfolioToken; index: number }) {
  return (
    <div
      className={`${STAGGER_ITEM_CLASS} flex items-center justify-between py-4 border-b border-border last:border-0`}
      style={getStaggerStyle(index)}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <img
            src={token.tokenLogoUrl || '/placeholder.svg'}
            alt={token.tokenSymbol}
            className="w-10 h-10 rounded-full bg-secondary"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }}
          />
          {/* Chain badge */}
          <img
            src={token.chainIcon}
            alt={token.chainName}
            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border border-background"
          />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{token.tokenSymbol}</span>
            {token.isCustom && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground">
                Custom
              </span>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {token.tokenName} · {token.chainName}
          </div>
        </div>
      </div>
      
      <div className="text-right">
        <div className="font-medium text-foreground">{formatUsd(token.usdValue)}</div>
        <div className="text-sm text-muted-foreground">
          {formatBalance(token.balanceFormatted)} {token.tokenSymbol}
        </div>
      </div>
    </div>
  );
}

function PortfolioSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
      <Card>
        <CardContent className="p-0">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-4 px-6 border-b border-border last:border-0">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-20 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <div className="text-right">
                <Skeleton className="h-4 w-16 mb-1 ml-auto" />
                <Skeleton className="h-3 w-24 ml-auto" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="text-center py-12">
      <CardContent>
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
          <Wallet className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No Assets Found</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          We couldn't find any tokens in your connected wallet. Add custom tokens in the DEX to track them here.
        </p>
        <Button asChild>
          <Link to="/">Go to Exchange</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function ConnectWalletState() {
  return (
    <Card className="text-center py-12">
      <CardContent>
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
          <Wallet className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Connect Your Wallet</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Connect your wallet to view your portfolio across all supported chains.
        </p>
        <Button asChild>
          <Link to="/">Connect Wallet</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Portfolio() {
  const { evmAddress, solanaAddress, suiAddress, tronAddress, tonAddress } = useMultiWallet();
  const { 
    tokens, 
    allTokens,
    loading, 
    totalValue, 
    refetch,
    selectedChain,
    setSelectedChain,
    chainsWithBalances,
    error,
    isAnyConnected,
  } = usePortfolioBalances();

  // Get a display address from any connected wallet
  const displayAddress = evmAddress || solanaAddress || suiAddress || tronAddress || tonAddress;

  return (
    <Layout>
      <Helmet>
        <title>Portfolio | xlama</title>
        <meta name="description" content="View your cryptocurrency portfolio across all connected chains with real-time USD values." />
      </Helmet>
      
      <div className="container py-8 max-w-3xl mx-auto">
        <div className="content-fade-in">
          {!isAnyConnected ? (
            <ConnectWalletState />
          ) : loading && tokens.length === 0 ? (
            <PortfolioSkeleton />
          ) : error ? (
            <Card className="text-center py-12">
              <CardContent>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Failed to Load Portfolio</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">{error}</p>
                <Button onClick={refetch}>Try Again</Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-foreground mb-1">
                    {formatUsd(totalValue)}
                  </h1>
                  <p className="text-muted-foreground">
                    Portfolio Value · {allTokens.length} asset{allTokens.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={refetch}
                  disabled={loading}
                  aria-label="Refresh portfolio"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              {/* Token List */}
              {allTokens.length === 0 ? (
                <EmptyState />
              ) : (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        Assets
                      </CardTitle>
                      <Select value={selectedChain} onValueChange={setSelectedChain}>
                        <SelectTrigger className="w-[160px] h-9">
                          <SelectValue placeholder="All Chains" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            <span className="flex items-center gap-2">All Chains</span>
                          </SelectItem>
                          {chainsWithBalances.map(chainIndex => {
                            const chain = SUPPORTED_CHAINS.find(c => c.chainIndex === chainIndex);
                            return chain ? (
                              <SelectItem key={chainIndex} value={chainIndex}>
                                <span className="flex items-center gap-2">
                                  <img src={chain.icon} alt={chain.name} className="w-4 h-4 rounded-full" />
                                  {chain.name}
                                </span>
                              </SelectItem>
                            ) : null;
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    {tokens.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No tokens on this chain</p>
                      </div>
                    ) : (
                      tokens.map((token, i) => (
                        <TokenRow 
                          key={`${token.chainIndex}-${token.tokenContractAddress}`} 
                          token={token} 
                          index={i} 
                        />
                      ))
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Wallet info */}
              {displayAddress && (
                <div className="mt-6 text-center text-sm text-muted-foreground">
                  Connected: {displayAddress.slice(0, 6)}...{displayAddress.slice(-4)}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
