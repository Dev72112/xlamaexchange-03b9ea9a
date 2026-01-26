/**
 * AppLayout - Minimal layout for trading/app pages
 * No footer, compact header for immersive trading experience
 */
import { memo } from "react";
import { AppHeader } from "./AppHeader";
import { RouteLoadComplete } from "@/contexts/RouteLoadingContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { OnboardingTour } from "@/components/OnboardingTour";

interface AppLayoutProps {
  children: React.ReactNode;
  /** Optional: Show a back button in the header */
  showBack?: boolean;
  /** Optional: Page title for mobile header */
  title?: string;
}

export const AppLayout = memo(function AppLayout({ 
  children, 
  showBack,
  title 
}: AppLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden max-w-[100vw] bg-background">
      {/* Compact App Header - Desktop only, mobile uses bottom nav */}
      {!isMobile && <AppHeader />}
      
      <main 
        id="main-content" 
        className="flex-1 overflow-x-hidden min-w-0 pb-20 md:pb-0 app-content"
        role="main" 
        tabIndex={-1}
      >
        <RouteLoadComplete />
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && <MobileBottomNav />}

      {/* Onboarding Tour for first-time users */}
      <OnboardingTour />
    </div>
  );
});
