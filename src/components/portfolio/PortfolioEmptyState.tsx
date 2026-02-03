/**
 * Portfolio Empty States
 * Context-aware friendly messages for portfolio holdings
 */

import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Wallet, 
  Coins, 
  Search, 
  Filter,
  ArrowRightLeft,
} from 'lucide-react';

interface PortfolioEmptyStateProps {
  isConnected: boolean;
  hasAnyBalances: boolean;
  searchQuery: string;
  dustFilterActive: boolean;
  dustCount?: number;
}

export const PortfolioEmptyState = memo(function PortfolioEmptyState({
  isConnected,
  hasAnyBalances,
  searchQuery,
  dustFilterActive,
  dustCount = 0,
}: PortfolioEmptyStateProps) {
  const navigate = useNavigate();

  // Not connected
  if (!isConnected) {
    return (
      <div className="py-8 text-center">
        <Wallet className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <p className="font-medium mb-1">Connect your wallet</p>
        <p className="text-sm text-muted-foreground">
          View your portfolio holdings across all chains
        </p>
      </div>
    );
  }

  // Connected but empty wallet
  if (!hasAnyBalances) {
    return (
      <div className="py-8 text-center">
        <Coins className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <p className="font-medium mb-1">Your wallet is empty</p>
        <p className="text-sm text-muted-foreground">
          Time to make some trades! 🚀
        </p>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-3 gap-1.5" 
          onClick={() => navigate('/')}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          Start Trading
        </Button>
      </div>
    );
  }

  // Search returns no match
  if (searchQuery) {
    return (
      <div className="py-8 text-center">
        <Search className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <p className="font-medium mb-1">No "{searchQuery}" found</p>
        <p className="text-sm text-muted-foreground">
          You don't own this token yet. Maybe time to trade some! 😏
        </p>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-3 gap-1.5" 
          onClick={() => navigate('/')}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          Buy {searchQuery.toUpperCase()}
        </Button>
      </div>
    );
  }

  // Dust filter hides all tokens
  if (dustFilterActive) {
    return (
      <div className="py-8 text-center">
        <Filter className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <p className="font-medium mb-1">All tokens hidden</p>
        <p className="text-sm text-muted-foreground">
          {dustCount > 0 
            ? `Your ${dustCount} token${dustCount > 1 ? 's are' : ' is'} all dust (<$1). Toggle the filter to see them!`
            : 'Your holdings are all dust (<$1). Toggle the filter to see them!'
          }
        </p>
      </div>
    );
  }

  return null;
});

export default PortfolioEmptyState;
