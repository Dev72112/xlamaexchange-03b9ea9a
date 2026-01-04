import { memo } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { RouteLoadComplete } from "@/contexts/RouteLoadingContext";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = memo(function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden max-w-[100vw]">
      <Header />
      <main className="flex-1 overflow-x-hidden min-w-0">
        <RouteLoadComplete />
        {children}
      </main>
      <Footer />
    </div>
  );
});