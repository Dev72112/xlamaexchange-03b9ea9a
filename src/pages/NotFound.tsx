import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import xlamaMascot from "@/assets/xlama-mascot.png";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    // Log 404 for debugging purposes (kept as it's useful for tracking)
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center px-4 max-w-md">
        {/* Animated background orbs */}
        <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
          <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        <div className="relative w-32 h-32 mx-auto mb-6">
          <img 
            src={xlamaMascot} 
            alt="xLama mascot" 
            className="w-full h-full object-contain"
            style={{ animation: 'bounce 2s ease-in-out infinite' }}
          />
        </div>
        <h1 className="mb-2 text-7xl font-bold bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent">404</h1>
        <p className="mb-2 text-2xl font-semibold text-foreground">Oops! Lost in the DEX?</p>
        <p className="mb-8 text-muted-foreground">This page doesn't exist or has been moved. Let's get you back on track.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link 
            to="/" 
            className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-lg"
          >
            Back to Home
          </Link>
          <Link 
            to="/docs" 
            className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition-all hover:bg-accent hover:-translate-y-0.5"
          >
            View Docs
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
