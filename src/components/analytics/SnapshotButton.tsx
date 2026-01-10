import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Check, Loader2 } from 'lucide-react';
import { useWalletSnapshot } from '@/hooks/useWalletSnapshot';
import { useMultiWallet } from '@/contexts/MultiWalletContext';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SnapshotButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
}

export const SnapshotButton = memo(function SnapshotButton({ 
  className,
  variant = 'outline' 
}: SnapshotButtonProps) {
  const { anyConnectedAddress, isConnected } = useMultiWallet();
  const { captureSnapshot } = useWalletSnapshot();
  const { toast } = useToast();
  const [isCapturing, setIsCapturing] = useState(false);
  const [justCaptured, setJustCaptured] = useState(false);

  const handleCapture = async () => {
    if (!anyConnectedAddress || !isConnected) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet first.',
        variant: 'destructive',
      });
      return;
    }

    setIsCapturing(true);
    try {
      const success = await captureSnapshot(anyConnectedAddress, 'manual');
      
      if (success) {
        setJustCaptured(true);
        toast({
          title: 'Snapshot Captured! 📸',
          description: 'Your portfolio has been saved for historical tracking.',
        });
        // Reset the success indicator after 3 seconds
        setTimeout(() => setJustCaptured(false), 3000);
      } else {
        toast({
          title: 'Snapshot Failed',
          description: 'Could not capture wallet snapshot. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error capturing snapshot:', error);
      toast({
        title: 'Snapshot Failed',
        description: 'An error occurred while capturing the snapshot.',
        variant: 'destructive',
      });
    } finally {
      setIsCapturing(false);
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size="icon"
            onClick={handleCapture}
            disabled={isCapturing}
            className={className}
          >
            {isCapturing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : justCaptured ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Take Portfolio Snapshot</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});
