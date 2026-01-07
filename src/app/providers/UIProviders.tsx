/**
 * UI-related providers: Tooltip, Toast, Route Loading
 */
import React, { ReactNode } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';

interface UIProvidersProps {
  children: ReactNode;
}

export function UIProviders({ children }: UIProvidersProps) {
  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {children}
    </TooltipProvider>
  );
}
