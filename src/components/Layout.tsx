import { Header } from "./Header";
import { Footer } from "./Footer";
import { RouteLoadComplete } from "@/contexts/RouteLoadingContext";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <Header />
      <main className="flex-1 overflow-x-hidden">
        <RouteLoadComplete />
        {children}
      </main>
      <Footer />
    </div>
  );
}