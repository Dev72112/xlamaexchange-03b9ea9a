import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);

  const toggleTheme = () => {
    setIsAnimating(true);
    const currentTheme = theme === "system" 
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme;
    setTheme(currentTheme === "dark" ? "light" : "dark");
    
    // Reset animation state after transition
    setTimeout(() => setIsAnimating(false), 500);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={cn(
        "relative overflow-hidden",
        isAnimating && "theme-toggle-animate"
      )}
    >
      <Sun className={cn(
        "h-5 w-5 transition-all duration-500",
        "rotate-0 scale-100 dark:-rotate-90 dark:scale-0"
      )} />
      <Moon className={cn(
        "absolute h-5 w-5 transition-all duration-500",
        "rotate-90 scale-0 dark:rotate-0 dark:scale-100"
      )} />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
