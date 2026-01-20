import { Component, ReactNode, useState } from "react";
import { AlertTriangle, RefreshCw, Copy, ChevronDown, ChevronUp, Bug } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Render prop that receives the error for custom fallback rendering */
  renderFallback?: (error: Error | null, errorInfo: React.ErrorInfo | null) => ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    // Log structured error for debugging
    console.error("[ErrorBoundary]", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      url: typeof window !== 'undefined' ? window.location.href : '',
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      // Priority 1: renderFallback prop (passes error to custom component)
      if (this.props.renderFallback) {
        return this.props.renderFallback(this.state.error, this.state.errorInfo);
      }
      // Priority 2: static fallback prop
      if (this.props.fallback) {
        return this.props.fallback;
      }
      // Default: built-in error UI
      return (
        <ErrorFallbackUI
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

// Separated fallback UI for cleaner code
interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  onRetry: () => void;
}

function ErrorFallbackUI({ error, errorInfo, onRetry }: ErrorFallbackProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const isDev = import.meta.env.DEV || localStorage.getItem('debugErrors') === '1';

  const copyErrorDetails = () => {
    const details = {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };
    navigator.clipboard.writeText(JSON.stringify(details, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 rounded-full bg-destructive/10 p-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="mb-2 text-xl font-semibold">Something went wrong</h2>
      <p className="mb-6 max-w-md text-muted-foreground">
        We encountered an unexpected error. Please try again or refresh the page.
      </p>
      
      <div className="flex gap-3 mb-4">
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
        <Button onClick={() => window.location.reload()}>
          Refresh Page
        </Button>
      </div>

      {/* Debug Details Section */}
      {(isDev || error) && (
        <div className="mt-6 w-full max-w-xl">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Bug className="h-3 w-3" />
            {showDetails ? 'Hide' : 'Show'} error details
            {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>

          {showDetails && (
            <div className="mt-3 text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Error Details</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyErrorDetails}
                  className="h-7 text-xs gap-1"
                >
                  <Copy className="h-3 w-3" />
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              
              <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs font-mono overflow-auto max-h-64">
                <p className="text-destructive font-medium mb-2">
                  {error?.name}: {error?.message}
                </p>
                {error?.stack && (
                  <pre className="text-muted-foreground whitespace-pre-wrap text-[10px] leading-relaxed">
                    {error.stack.split('\n').slice(0, 10).join('\n')}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Mini inline boundary for wrapping risky components
export function SafeRender({ 
  children, 
  fallback 
}: { 
  children: ReactNode; 
  fallback?: ReactNode;
}) {
  return (
    <ErrorBoundary fallback={fallback || <div className="p-4 text-sm text-muted-foreground">Failed to render</div>}>
      {children}
    </ErrorBoundary>
  );
}
