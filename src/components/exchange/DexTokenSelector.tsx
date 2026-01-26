import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Check, ChevronDown, Loader2, Search, Clock, AlertCircle, AlertTriangle, X, TrendingUp, TrendingDown, BadgeCheck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useVirtualizer } from "@tanstack/react-virtual";
import { OkxToken, okxDexService, TokenSearchResult } from "@/services/okxdex";
import { Chain } from "@/data/chains";
import { useRecentTokens } from "@/hooks/useRecentTokens";
import { useCustomTokens } from "@/hooks/useCustomTokens";
import { useMultiWallet } from "@/contexts/MultiWalletContext";
import { CustomTokenConfirmDialog } from "./CustomTokenConfirmDialog";
import { useTokenWatchlist } from "@/hooks/useTokenWatchlist";
interface DexTokenSelectorProps {
  value: OkxToken | null;
  onChange: (token: OkxToken) => void;
  tokens: OkxToken[];
  nativeToken: OkxToken | null;
  chain: Chain | null;
  excludeAddress?: string;
  isLoading?: boolean;
}

// Check if string looks like a contract address for any supported chain type
function isContractAddress(query: string, chain: Chain | null): boolean {
  const trimmed = query.trim();
  
  if (!chain) {
    // Fallback: check common formats
    return /^0x[a-fA-F0-9]{40,64}$/i.test(trimmed) || // EVM or Sui
           /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed); // Solana/Tron base58
  }
  
  // Chain-specific validation
  switch (chain.chainIndex) {
    case '501': // Solana - Base58, typically 32-44 chars
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed);
    
    case '195': // Tron - Base58 starting with T, 34 chars
      return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(trimmed);
    
    case '784': // Sui - 0x followed by 64 hex chars, optionally with ::module::TYPE
      return /^0x[a-fA-F0-9]{64}(::[a-zA-Z_][a-zA-Z0-9_]*::[a-zA-Z_][a-zA-Z0-9_]*)?$/i.test(trimmed);
    
    case '607': // TON - Various formats (EQ, UQ, or raw)
      return /^(EQ|UQ)[A-Za-z0-9_-]{46}$/.test(trimmed) || 
             /^0:[a-fA-F0-9]{64}$/.test(trimmed);
    
    default: // EVM chains - 0x followed by 40 hex chars
      return /^0x[a-fA-F0-9]{40}$/i.test(trimmed);
  }
}

export function DexTokenSelector({ 
  value, 
  onChange, 
  tokens,
  nativeToken,
  chain,
  excludeAddress,
  isLoading 
}: DexTokenSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [customToken, setCustomToken] = useState<OkxToken | null>(null);
  const [isLoadingCustom, setIsLoadingCustom] = useState(false);
  const [customTokenError, setCustomTokenError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingCustomToken, setPendingCustomToken] = useState<OkxToken | null>(null);
  const [searchResults, setSearchResults] = useState<TokenSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Get wallet address for custom token storage
  const { activeAddress } = useMultiWallet();
  
  // Recent tokens hook
  const { recentTokens, addRecentToken, clearRecentTokens } = useRecentTokens(chain?.chainIndex || '');
  
  // Custom tokens hook - persists confirmed custom tokens for portfolio
  const { addCustomToken } = useCustomTokens(chain?.chainIndex || '', activeAddress || undefined);
  
  // Watchlist hook
  const { isInWatchlist, toggleToken } = useTokenWatchlist();

  // Reset state when popup closes or chain changes
  useEffect(() => {
    if (!open) {
      setCustomToken(null);
      setCustomTokenError(null);
      setIsLoadingCustom(false);
      setSearchQuery("");
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [open]);

  useEffect(() => {
    setCustomToken(null);
    setCustomTokenError(null);
    setSearchResults([]);
  }, [chain?.chainIndex]);

  // Search tokens using v6 API when query is 3+ chars
  useEffect(() => {
    const query = searchQuery.trim();
    
    // If it's a contract address, use the existing custom token flow
    if (isContractAddress(query, chain)) {
      setSearchResults([]);
      return;
    }

    // Clear search results if query is too short
    if (query.length < 3 || !chain) {
      setSearchResults([]);
      return;
    }

    const searchTokens = async () => {
      setIsSearching(true);
      try {
        const results = await okxDexService.searchTokens(chain.chainIndex, query);
        setSearchResults(results);
      } catch (err) {
        console.error('Token search failed:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchTokens, 400);
    return () => clearTimeout(debounce);
  }, [searchQuery, chain]);

  // Fetch custom token by address
  useEffect(() => {
    const query = searchQuery.trim();
    if (!isContractAddress(query, chain) || !chain) {
      setCustomToken(null);
      setCustomTokenError(null);
      return;
    }

    // Check if token already exists in list
    const existingToken = tokens.find(
      t => t.tokenContractAddress.toLowerCase() === query.toLowerCase()
    );
    if (existingToken) {
      setCustomToken(null);
      setCustomTokenError(null);
      return;
    }

    // Fetch token info
    const fetchToken = async () => {
      setIsLoadingCustom(true);
      setCustomTokenError(null);
      try {
        const tokenInfo = await okxDexService.getTokenInfo(chain.chainIndex, query);
        
        if (tokenInfo && tokenInfo.tokenSymbol) {
          setCustomToken({
            ...tokenInfo,
            tokenContractAddress: query,
            isCustom: true,
          } as OkxToken);
          setCustomTokenError(null);
        } else {
          setCustomTokenError("Token not found on this chain");
        }
      } catch (err: any) {
        console.error('Failed to fetch custom token:', err);
        const errorMsg = err?.message || '';
        if (errorMsg.includes('not found') || errorMsg.includes('404')) {
          setCustomTokenError("Token not found on this chain");
        } else {
          setCustomTokenError("Failed to load token. Try again.");
        }
      } finally {
        setIsLoadingCustom(false);
      }
    };

    const debounce = setTimeout(fetchToken, 600);
    return () => clearTimeout(debounce);
  }, [searchQuery, chain, tokens]);

  // Filter tokens - simple flat list without groupings (removed limit for virtualization)
  const { filteredTokens, localSearchResults, totalCount } = useMemo(() => {
    // Add native token at the start
    const allTokens = nativeToken ? [nativeToken, ...tokens] : tokens;
    
    // Filter out excluded token
    const filtered = allTokens.filter(
      t => t.tokenContractAddress.toLowerCase() !== excludeAddress?.toLowerCase()
    );

    const total = filtered.length;

    // Local search filter - also search by contract address
    const localFiltered = searchQuery && searchResults.length === 0
      ? filtered.filter(t =>
          t.tokenSymbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.tokenName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.tokenContractAddress.toLowerCase().includes(searchQuery.toLowerCase())
        ).slice(0, 50)
      : [];

    return {
      filteredTokens: filtered, // No limit - virtualization handles performance
      localSearchResults: localFiltered,
      totalCount: total,
    };
  }, [tokens, nativeToken, excludeAddress, searchQuery, searchResults.length]);

  // Virtualized token list ref
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: filteredTokens.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56, // Height of each token row
    overscan: 5,
  });

  // Filter recent tokens to only show valid ones
  const validRecentTokens = useMemo(() => {
    return recentTokens.filter(
      t => t.tokenContractAddress.toLowerCase() !== excludeAddress?.toLowerCase()
    );
  }, [recentTokens, excludeAddress]);

  const handleSelect = useCallback((token: OkxToken, isCustom = false) => {
    // Close popover FIRST to prevent stuck state
    setOpen(false);
    
    // Process selection after closing to prevent re-render conflicts
    requestAnimationFrame(() => {
      if (isCustom) {
        // For custom tokens, show confirmation dialog first
        setPendingCustomToken(token);
        setShowConfirmDialog(true);
        return;
      }
      
      // Add to recent tokens
      addRecentToken(token);
      
      onChange(token);
      setSearchQuery("");
      setCustomToken(null);
    });
  }, [onChange, addRecentToken]);

  const handleConfirmCustomToken = useCallback(() => {
    if (pendingCustomToken) {
      // Mark as confirmed custom token
      const confirmedToken = { ...pendingCustomToken, isCustom: true } as OkxToken;
      
      // Add to recent tokens for quick access
      addRecentToken(confirmedToken);
      
      // IMPORTANT: Also persist to custom tokens storage for portfolio discovery
      addCustomToken(confirmedToken);
      
      onChange(confirmedToken);
    }
    setShowConfirmDialog(false);
    setPendingCustomToken(null);
    setOpen(false);
    setSearchQuery("");
    setCustomToken(null);
  }, [pendingCustomToken, onChange, addRecentToken, addCustomToken]);

  const handleCancelCustomToken = useCallback(() => {
    setShowConfirmDialog(false);
    setPendingCustomToken(null);
  }, []);

  const renderTokenItem = (token: OkxToken, isCustom = false, keyPrefix = '') => {
    const inWatchlist = chain ? isInWatchlist(chain.chainIndex, token.tokenContractAddress) : false;
    
    const handleWatchlistToggle = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (chain) {
        toggleToken({
          chainIndex: chain.chainIndex,
          tokenContractAddress: token.tokenContractAddress,
          tokenSymbol: token.tokenSymbol,
          tokenName: token.tokenName,
          tokenLogoUrl: token.tokenLogoUrl,
          decimals: token.decimals,
        });
      }
    };
    
    return (
      <div
        key={`${keyPrefix}${token.tokenContractAddress}`}
        onClick={() => handleSelect(token, isCustom)}
        className={cn(
          "flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2.5 min-h-[44px] cursor-pointer rounded-lg transition-colors group",
          "hover:bg-accent/50 active:bg-accent/70",
          value?.tokenContractAddress === token.tokenContractAddress && "bg-accent",
          isCustom && "border border-warning/30 bg-warning/5"
        )}
      >
        <img
          src={token.tokenLogoUrl || `https://ui-avatars.com/api/?name=${token.tokenSymbol}&background=random`}
          alt={token.tokenName}
          className="w-6 h-6 sm:w-7 sm:h-7 rounded-full shrink-0"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${token.tokenSymbol}&background=random`;
          }}
        />
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="font-semibold uppercase text-sm truncate flex items-center gap-1">
            {token.tokenSymbol}
            {isCustom && (
              <span className="text-[10px] px-1 py-0.5 bg-warning/20 text-warning rounded flex items-center gap-0.5">
                <AlertTriangle className="w-2.5 h-2.5" />
                Custom
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate">{token.tokenName}</div>
          {isCustom && (
            <div className="text-[10px] text-muted-foreground font-mono truncate">
              {token.tokenContractAddress.slice(0, 10)}...{token.tokenContractAddress.slice(-8)}
            </div>
          )}
        </div>
        <button
          onClick={handleWatchlistToggle}
          className={cn(
            "p-1 rounded-md transition-colors opacity-0 group-hover:opacity-100",
            inWatchlist ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500"
          )}
          title={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
        >
          <Star className={cn("h-4 w-4", inWatchlist && "fill-yellow-500")} />
        </button>
        {value?.tokenContractAddress === token.tokenContractAddress && (
          <Check className="h-4 w-4 text-primary shrink-0" />
        )}
      </div>
    );
  };

  // Enhanced token item with price/market data from v6 search
  const renderSearchResultItem = (result: TokenSearchResult, keyPrefix = '') => {
    const change = parseFloat(result.change24H || '0');
    const isPositive = change >= 0;
    const hasMarketCap = result.marketCap && parseFloat(result.marketCap) > 0;
    const isVerified = result.tagList?.communityRecognized;

    const formatMarketCap = (mcap: string) => {
      const num = parseFloat(mcap);
      if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
      if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
      if (num >= 1e3) return `$${(num / 1e3).toFixed(0)}K`;
      return `$${num.toFixed(0)}`;
    };

    const formatPrice = (price: string) => {
      const num = parseFloat(price);
      if (num >= 1000) return `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
      if (num >= 1) return `$${num.toFixed(2)}`;
      if (num >= 0.0001) return `$${num.toFixed(4)}`;
      return `$${num.toFixed(6)}`;
    };

    return (
      <div
        key={`${keyPrefix}${result.tokenContractAddress}`}
        onClick={() => {
          // Convert search result to OkxToken
          const token: OkxToken = {
            tokenContractAddress: result.tokenContractAddress,
            tokenSymbol: result.tokenSymbol,
            tokenName: result.tokenName,
            decimals: result.decimal,
            tokenLogoUrl: result.tokenLogoUrl,
          };
          handleSelect(token, false);
        }}
        className={cn(
          "flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2.5 min-h-[44px] cursor-pointer rounded-lg transition-colors",
          "hover:bg-accent/50 active:bg-accent/70",
          value?.tokenContractAddress === result.tokenContractAddress && "bg-accent"
        )}
      >
        <img
          src={result.tokenLogoUrl || `https://ui-avatars.com/api/?name=${result.tokenSymbol}&background=random`}
          alt={result.tokenName}
          className="w-6 h-6 sm:w-7 sm:h-7 rounded-full shrink-0"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${result.tokenSymbol}&background=random`;
          }}
        />
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="font-semibold uppercase text-sm truncate flex items-center gap-1">
            {result.tokenSymbol}
            {isVerified && (
              <BadgeCheck className="w-3.5 h-3.5 text-primary" />
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate flex items-center gap-2">
            <span className="truncate">{result.tokenName}</span>
            {hasMarketCap && (
              <span className="text-[10px] text-muted-foreground/70">
                MCap: {formatMarketCap(result.marketCap)}
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          {result.price && parseFloat(result.price) > 0 && (
            <div className="text-xs font-medium">{formatPrice(result.price)}</div>
          )}
          {change !== 0 && (
            <div className={cn(
              "text-[10px] flex items-center justify-end gap-0.5",
              isPositive ? "text-success" : "text-destructive"
            )}>
              {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
              {Math.abs(change).toFixed(1)}%
            </div>
          )}
        </div>
        {value?.tokenContractAddress === result.tokenContractAddress && (
          <Check className="h-4 w-4 text-primary shrink-0" />
        )}
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="h-auto py-2.5 px-3 justify-between gap-2 bg-secondary/50 hover:bg-secondary border border-border rounded-xl min-w-[130px] w-[150px] sm:w-[170px] max-w-full shrink-0 overflow-hidden"
          disabled={isLoading || !chain}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : value ? (
            <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
              <img
                src={value.tokenLogoUrl || `https://ui-avatars.com/api/?name=${value.tokenSymbol}&background=random`}
                alt={value.tokenName}
                className="w-7 h-7 rounded-full shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${value.tokenSymbol}&background=random`;
                }}
              />
              <div className="text-left min-w-0 overflow-hidden">
                <div className="font-semibold uppercase text-sm truncate">{value.tokenSymbol}</div>
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground">Select token</span>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[min(calc(100vw-1rem),340px)] p-0 bg-popover border-border shadow-2xl z-50 rounded-xl overflow-hidden" 
        align="start"
        sideOffset={8}
      >
        {/* Chain indicator */}
        {chain && (
          <div className="px-4 py-2 bg-secondary/50 border-b border-border flex items-center gap-2">
            <img 
              src={chain.icon} 
              alt={chain.name} 
              className="w-4 h-4 rounded-full" 
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${chain.shortName}&background=6366f1&color=fff`;
              }}
            />
            <span className="text-xs text-muted-foreground">Tokens on {chain.name}</span>
          </div>
        )}

        {/* Search header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            placeholder="Search or paste address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">{totalCount}</span>
        </div>

        <div className="h-[350px] overflow-auto" ref={parentRef}>
          <div className="p-2">
            {isLoading ? (
              <div className="py-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">Loading tokens...</p>
              </div>
            ) : searchQuery ? (
              // Search results
              <div className="space-y-2">
                {/* Custom token from address search */}
                {isContractAddress(searchQuery.trim(), chain) && (
                  <div className="space-y-1">
                    {isLoadingCustom ? (
                      <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Loading token info...</span>
                      </div>
                    ) : customTokenError ? (
                      <div className="flex items-center gap-2 px-3 py-3 text-sm text-destructive bg-destructive/10 rounded-lg">
                        <AlertCircle className="w-4 h-4" />
                        <span>{customTokenError}</span>
                      </div>
                    ) : customToken ? (
                      <>
                        <div className="px-3 py-2 text-xs font-medium text-warning flex items-center gap-1.5">
                          <AlertTriangle className="w-3 h-3" />
                          Found by Address (Unverified)
                        </div>
                        {renderTokenItem(customToken, true, 'custom-')}
                      </>
                    ) : null}
                  </div>
                )}

                {/* v6 API search results with metadata */}
                {isSearching ? (
                  <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Searching...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-1">
                    <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
                      Results ({searchResults.length})
                    </div>
                    {searchResults.map((t, i) => renderSearchResultItem(t, `api-search-${i}-`))}
                  </div>
                ) : localSearchResults.length > 0 ? (
                  <div className="space-y-1">
                    <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
                      Results ({localSearchResults.length})
                    </div>
                    {localSearchResults.map((t, i) => renderTokenItem(t, false, `search-${i}-`))}
                  </div>
                ) : !isContractAddress(searchQuery.trim(), chain) && searchQuery.length >= 3 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    <p>No tokens found</p>
                    <p className="text-xs mt-1">Try pasting a contract address</p>
                  </div>
                ) : searchQuery.length < 3 && !isContractAddress(searchQuery.trim(), chain) ? (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    Type 3+ characters to search
                  </div>
                ) : null}
              </div>
            ) : (
              // Default view - Recent + Virtualized all tokens
              <div className="space-y-4">
                {/* Recent tokens */}
                {validRecentTokens.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-3 py-2 text-xs font-medium text-muted-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        Recent
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearRecentTokens();
                        }}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    {validRecentTokens.map((t, i) => renderTokenItem(t, (t as any).isCustom, `recent-${i}-`))}
                  </div>
                )}

                {/* All tokens - virtualized for performance */}
                <div className="space-y-1">
                  <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
                    All Tokens ({filteredTokens.length})
                  </div>
                  <div
                    style={{
                      height: `${virtualizer.getTotalSize()}px`,
                      width: '100%',
                      position: 'relative',
                    }}
                  >
                    {virtualizer.getVirtualItems().map((virtualRow) => {
                      const token = filteredTokens[virtualRow.index];
                      return (
                        <div
                          key={token.tokenContractAddress}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: `${virtualRow.size}px`,
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                        >
                          {renderTokenItem(token, false, `virt-${virtualRow.index}-`)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>

      {/* Custom Token Confirmation Dialog */}
      <CustomTokenConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        token={pendingCustomToken}
        chain={chain}
        onConfirm={handleConfirmCustomToken}
        onCancel={handleCancelCustomToken}
      />
    </Popover>
  );
}
