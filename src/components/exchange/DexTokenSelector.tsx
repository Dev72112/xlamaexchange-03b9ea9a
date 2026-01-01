import { useState, useMemo, useCallback, useEffect } from "react";
import { Check, ChevronDown, Loader2, Search, Star, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OkxToken, okxDexService } from "@/services/okxdex";
import { Chain } from "@/data/chains";

interface DexTokenSelectorProps {
  value: OkxToken | null;
  onChange: (token: OkxToken) => void;
  tokens: OkxToken[];
  nativeToken: OkxToken | null;
  chain: Chain | null;
  excludeAddress?: string;
  isLoading?: boolean;
}

// Popular tokens to feature at the top
const POPULAR_SYMBOLS = ['ETH', 'USDT', 'USDC', 'WETH', 'WBTC', 'DAI', 'OKB', 'MATIC', 'BNB', 'AVAX'];

// Check if string looks like a contract address
function isContractAddress(query: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/i.test(query.trim());
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

  // Reset custom token state when popup closes or chain changes
  useEffect(() => {
    if (!open) {
      setCustomToken(null);
      setCustomTokenError(null);
      setIsLoadingCustom(false);
    }
  }, [open]);

  useEffect(() => {
    setCustomToken(null);
    setCustomTokenError(null);
  }, [chain?.chainIndex]);

  // Fetch custom token by address
  useEffect(() => {
    const query = searchQuery.trim();
    if (!isContractAddress(query) || !chain) {
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
        console.log('Searching for token by address:', query, 'on chain:', chain.chainIndex);
        const tokenInfo = await okxDexService.getTokenInfo(chain.chainIndex, query);
        console.log('Token info result:', tokenInfo);
        
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

  // Filter and group tokens
  const { popularTokens, stableTokens, otherTokens, searchResults, totalCount } = useMemo(() => {
    // Add native token at the start
    const allTokens = nativeToken ? [nativeToken, ...tokens] : tokens;
    
    // Filter out excluded token
    const filtered = allTokens.filter(
      t => t.tokenContractAddress.toLowerCase() !== excludeAddress?.toLowerCase()
    );

    const total = filtered.length;

    // Search filter - also search by contract address
    const searchFiltered = searchQuery
      ? filtered.filter(t =>
          t.tokenSymbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.tokenName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.tokenContractAddress.toLowerCase().includes(searchQuery.toLowerCase())
        ).slice(0, 50)
      : [];

    // Group by category
    const popular = filtered.filter(t => 
      POPULAR_SYMBOLS.includes(t.tokenSymbol.toUpperCase()) ||
      t.tokenContractAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
    ).slice(0, 12);

    const stables = filtered.filter(t =>
      ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'USDP', 'FRAX'].includes(t.tokenSymbol.toUpperCase()) &&
      !popular.includes(t)
    ).slice(0, 10);

    const others = filtered.filter(t => 
      !popular.includes(t) && !stables.includes(t)
    ).slice(0, 50);

    return {
      popularTokens: popular,
      stableTokens: stables,
      otherTokens: others,
      searchResults: searchFiltered,
      totalCount: total,
    };
  }, [tokens, nativeToken, excludeAddress, searchQuery]);

  const handleSelect = useCallback((token: OkxToken) => {
    onChange(token);
    setOpen(false);
    setSearchQuery("");
    setCustomToken(null);
  }, [onChange]);

  const renderTokenItem = (token: OkxToken, isCustom = false, keyPrefix = '') => (
    <div
      key={`${keyPrefix}${token.tokenContractAddress}`}
      onClick={() => handleSelect(token)}
      className={cn(
        "flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2.5 cursor-pointer rounded-lg transition-colors",
        "hover:bg-accent/50",
        value?.tokenContractAddress === token.tokenContractAddress && "bg-accent",
        isCustom && "border border-primary/30 bg-primary/5"
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
            <span className="text-[10px] px-1 py-0.5 bg-primary/20 text-primary rounded">Custom</span>
          )}
        </div>
        <div className="text-xs text-muted-foreground truncate">{token.tokenName}</div>
        {isCustom && (
          <div className="text-[10px] text-muted-foreground font-mono truncate">
            {token.tokenContractAddress.slice(0, 10)}...{token.tokenContractAddress.slice(-8)}
          </div>
        )}
      </div>
      {value?.tokenContractAddress === token.tokenContractAddress && (
        <Check className="h-4 w-4 text-primary shrink-0" />
      )}
    </div>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="h-auto py-2.5 px-3 justify-between gap-2 bg-secondary/50 hover:bg-secondary border border-border rounded-xl min-w-[130px] shrink-0"
          disabled={isLoading || !chain}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : value ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={value.tokenLogoUrl || `https://ui-avatars.com/api/?name=${value.tokenSymbol}&background=random`}
                alt={value.tokenName}
                className="w-7 h-7 rounded-full shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${value.tokenSymbol}&background=random`;
                }}
              />
              <div className="text-left min-w-0">
                <div className="font-semibold uppercase text-sm">{value.tokenSymbol}</div>
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
            autoFocus
          />
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">{totalCount}</span>
        </div>

        <ScrollArea className="h-[350px]">
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
                {isContractAddress(searchQuery.trim()) && (
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
                        <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
                          Found by Address
                        </div>
                        {renderTokenItem(customToken, true)}
                      </>
                    ) : null}
                  </div>
                )}

                {/* Regular search results */}
                {searchResults.length > 0 ? (
                  <div className="space-y-1">
                    <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
                      Results ({searchResults.length})
                    </div>
                    {searchResults.map((t, i) => renderTokenItem(t, false, `search-${i}-`))}
                  </div>
                ) : !isContractAddress(searchQuery.trim()) ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    <p>No tokens found</p>
                    <p className="text-xs mt-1">Try pasting a contract address</p>
                  </div>
                ) : null}
              </div>
            ) : (
              // Grouped view
              <div className="space-y-4">
                {popularTokens.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-3 py-2 text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Star className="w-3 h-3 fill-warning text-warning" />
                      Popular
                    </div>
                    {popularTokens.map((t, i) => renderTokenItem(t, false, `pop-${i}-`))}
                  </div>
                )}
                
                {stableTokens.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-3 py-2 text-xs font-medium text-muted-foreground">Stablecoins</div>
                    {stableTokens.map((t, i) => renderTokenItem(t, false, `stable-${i}-`))}
                  </div>
                )}
                
                {otherTokens.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-3 py-2 text-xs font-medium text-muted-foreground">All Tokens</div>
                    {otherTokens.map((t, i) => renderTokenItem(t, false, `other-${i}-`))}
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
