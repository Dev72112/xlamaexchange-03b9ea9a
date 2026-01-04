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
      <div className="text-center px-4">
        <div className="relative w-32 h-32 mx-auto mb-6">
          <img 
            src={xlamaMascot} 
            alt="xLama mascot" 
            className="w-full h-full object-contain animate-bounce"
            style={{ animationDuration: '2s' }}
          />
        </div>
        <h1 className="mb-2 text-6xl font-bold text-primary">404</h1>
        <p className="mb-2 text-2xl font-semibold text-foreground">Oops! Lost in the DEX?</p>
        <p className="mb-6 text-muted-foreground">This page doesn't exist or has been moved.</p>
        <Link 
          to="/" 
          className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
