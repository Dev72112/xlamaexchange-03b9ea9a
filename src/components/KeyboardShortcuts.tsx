import { useEffect, useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExchangeMode } from '@/contexts/ExchangeModeContext';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

const shortcuts = [
  { keys: ['I'], description: 'Switch to Instant mode' },
  { keys: ['D'], description: 'Switch to DEX mode' },
  { keys: ['/', '⌘', 'K'], description: 'Open search' },
  { keys: ['?'], description: 'Show keyboard shortcuts' },
  { keys: ['H'], description: 'Go to Home' },
  { keys: ['F'], description: 'Go to Favorites' },
  { keys: ['T'], description: 'Go to History' },
];

export const KeyboardShortcuts = memo(function KeyboardShortcuts() {
  const [showHelp, setShowHelp] = useState(false);
  const navigate = useNavigate();
  const { setMode } = useExchangeMode();
  const isMobile = useIsMobile();

  useEffect(() => {
    // Don't add keyboard shortcuts on mobile
    if (isMobile) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Handle shortcuts
      switch (e.key.toLowerCase()) {
        case 'i':
          e.preventDefault();
          setMode('instant');
          break;
        case 'd':
          e.preventDefault();
          setMode('dex');
          break;
        case '/':
          e.preventDefault();
          // Trigger global search - dispatch custom event
          window.dispatchEvent(new CustomEvent('open-global-search'));
          break;
        case 'k':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent('open-global-search'));
          }
          break;
        case '?':
          e.preventDefault();
          setShowHelp(true);
          break;
        case 'h':
          e.preventDefault();
          navigate('/');
          break;
        case 'f':
          e.preventDefault();
          navigate('/favorites');
          break;
        case 't':
          e.preventDefault();
          navigate('/history');
          break;
        case 'escape':
          setShowHelp(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobile, navigate, setMode]);

  // Don't render anything on mobile
  if (isMobile) return null;

  return (
    <>
      {/* Floating hint button */}
      <button
        onClick={() => setShowHelp(true)}
        className="fixed bottom-6 right-6 z-40 p-3 rounded-xl glass border border-border/50 shadow-lg hover:border-primary/30 hover-lift transition-all group"
        aria-label="Show keyboard shortcuts"
      >
        <Keyboard className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </button>

      {/* Shortcuts help dialog */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="sm:max-w-md glass border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg glass border border-primary/20 flex items-center justify-center glow-sm">
                <Keyboard className="w-4 h-4 text-primary" />
              </div>
              <span className="gradient-text">Keyboard Shortcuts</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-4">
            {shortcuts.map((shortcut, index) => (
              <div
                key={shortcut.description}
                className="flex items-center justify-between p-3 rounded-lg glass border border-border/30 hover:border-primary/20 transition-colors"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, i) => (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 && <span className="text-muted-foreground/50 text-xs">+</span>}
                      <kbd className="px-2.5 py-1 rounded-md bg-secondary/50 border border-border text-xs font-mono text-foreground">
                        {key}
                      </kbd>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-border/30">
            <p className="text-xs text-muted-foreground">
              Press <kbd className="px-1.5 py-0.5 rounded bg-secondary/50 border border-border text-xs font-mono">Esc</kbd> to close
            </p>
            <span className="text-xs text-muted-foreground/50">Desktop only</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});
