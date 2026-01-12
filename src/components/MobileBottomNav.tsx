import { memo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { 
  ArrowLeftRight, 
  Compass, 
  ClipboardList, 
  PieChart, 
  BarChart3,
  History
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";

const navItems = [
  { path: "/", icon: ArrowLeftRight, label: "Exchange" },
  { path: "/bridge", icon: Compass, label: "Bridge" },
  { path: "/orders", icon: ClipboardList, label: "Orders" },
  { path: "/portfolio", icon: PieChart, label: "Portfolio" },
  { path: "/analytics", icon: BarChart3, label: "Analytics" },
  { path: "/history", icon: History, label: "History" },
];

export const MobileBottomNav = memo(function MobileBottomNav() {
  const location = useLocation();
  const { trigger } = useHapticFeedback();

  const handleNavClick = () => {
    trigger('light');
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass border-t border-border/50 safe-area-bottom"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="grid grid-cols-6 gap-1 px-1 py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-200",
                "touch-target min-h-[56px]",
                isActive 
                  ? "text-primary bg-primary/10 glow-sm" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon 
                className={cn(
                  "w-5 h-5 mb-1 transition-transform duration-200",
                  isActive && "scale-110"
                )} 
              />
              <span className={cn(
                "text-[10px] font-medium leading-tight truncate max-w-full",
                isActive && "text-primary"
              )}>
                {item.label}
              </span>
              
              {/* Active indicator dot */}
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary animate-pulse" />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
});
