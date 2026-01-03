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
        className="fixed bottom-4 right-4 z-40 p-2 rounded-lg bg-card/80 backdrop-blur-sm border border-border shadow-lg hover:bg-accent transition-colors group"
        aria-label="Show keyboard shortcuts"
      >
        <Keyboard className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </button>

      {/* Shortcuts help dialog */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="w-5 h-5" />
              Keyboard Shortcuts
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {shortcuts.map((shortcut) => (
              <div
                key={shortcut.description}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">{shortcut.description}</span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, i) => (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 && <span className="text-muted-foreground text-xs">+</span>}
                      <kbd className="px-2 py-1 rounded bg-muted border border-border text-xs font-mono">
                        {key}
                      </kbd>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            Press <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-xs">Esc</kbd> to close
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
});
