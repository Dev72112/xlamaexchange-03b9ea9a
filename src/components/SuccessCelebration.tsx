import { memo, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ExternalLink, Copy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface SuccessCelebrationProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  txHash?: string;
  explorerUrl?: string;
}

// Confetti particle component
const Particle = memo(function Particle({ delay, x }: { delay: number; x: number }) {
  const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-full"
      style={{ backgroundColor: color, left: `${x}%` }}
      initial={{ y: -20, opacity: 1, scale: 1 }}
      animate={{ 
        y: 400, 
        opacity: 0, 
        scale: 0,
        x: (Math.random() - 0.5) * 200,
        rotate: Math.random() * 720
      }}
      transition={{ 
        duration: 2 + Math.random(), 
        delay: delay,
        ease: "easeOut"
      }}
    />
  );
});

export const SuccessCelebration = memo(function SuccessCelebration({
  isOpen,
  onClose,
  title = "Transaction Successful!",
  message = "Your transaction has been confirmed.",
  txHash,
  explorerUrl
}: SuccessCelebrationProps) {
  const [particles, setParticles] = useState<Array<{ id: number; delay: number; x: number }>>([]);

  useEffect(() => {
    if (isOpen) {
      // Generate confetti particles
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        delay: Math.random() * 0.5,
        x: Math.random() * 100
      }));
      setParticles(newParticles);
    }
  }, [isOpen]);

  const copyTxHash = () => {
    if (txHash) {
      navigator.clipboard.writeText(txHash);
      toast.success('Transaction hash copied!');
    }
  };

  const truncateHash = (hash: string) => {
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div 
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Confetti container */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map(p => (
              <Particle key={p.id} delay={p.delay} x={p.x} />
            ))}
          </div>

          {/* Modal */}
          <motion.div
            className="relative glass border border-border rounded-2xl p-6 max-w-sm w-full gradient-border"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Animated checkmark */}
            <motion.div 
              className="flex justify-center mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <div className="relative">
                <motion.div
                  className="absolute inset-0 bg-success/20 rounded-full blur-xl"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1.5 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                />
                <div className="relative bg-success/10 rounded-full p-4">
                  <motion.div
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                  >
                    <CheckCircle2 className="w-12 h-12 text-success" />
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* Content */}
            <motion.div 
              className="text-center space-y-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="text-xl font-bold gradient-text">{title}</h3>
              <p className="text-muted-foreground text-sm">{message}</p>
            </motion.div>

            {/* Transaction hash */}
            {txHash && (
              <motion.div 
                className="mt-4 p-3 bg-secondary/50 rounded-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">TX Hash:</span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono">{truncateHash(txHash)}</code>
                    <button 
                      onClick={copyTxHash}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Actions */}
            <motion.div 
              className="mt-6 flex gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {explorerUrl && (
                <Button 
                  variant="outline" 
                  className="flex-1 gap-2"
                  onClick={() => window.open(explorerUrl, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                  View Explorer
                </Button>
              )}
              <Button 
                className="flex-1"
                onClick={onClose}
              >
                Done
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
