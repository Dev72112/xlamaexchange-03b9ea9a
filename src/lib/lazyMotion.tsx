/**
 * Lazy Motion Utilities
 * CSS-based animations that don't require framer-motion for initial bundle
 * Use these for simple fade-in effects to reduce bundle size
 */

import { cn } from '@/lib/utils';
import type { ReactNode, CSSProperties, HTMLAttributes } from 'react';

interface FadeInProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'none';
}

/**
 * CSS-based fade-in animation - no framer-motion required
 * Use this for simple entrance animations
 */
export function FadeIn({ 
  children, 
  className, 
  delay = 0, 
  duration = 300,
  direction = 'up',
  style,
  ...props
}: FadeInProps) {
  const animationClass = direction === 'none' ? 'animate-fade-in-simple' : 'animate-fade-in';
  
  return (
    <div 
      className={cn(animationClass, className)}
      style={{
        animationDelay: `${delay}ms`,
        animationDuration: `${duration}ms`,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

interface StaggerContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  staggerDelay?: number;
}

/**
 * Container that staggers children with CSS animation delays
 * Apply stagger-item class to children
 */
export function StaggerContainer({ 
  children, 
  className,
  staggerDelay = 50,
  style,
  ...props
}: StaggerContainerProps) {
  return (
    <div 
      className={cn("stagger-container", className)}
      style={{
        '--stagger-delay': `${staggerDelay}ms`,
        ...style,
      } as CSSProperties}
      {...props}
    >
      {children}
    </div>
  );
}

interface ScaleInProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  delay?: number;
}

/**
 * CSS-based scale-in animation
 */
export function ScaleIn({ 
  children, 
  className, 
  delay = 0,
  style,
  ...props
}: ScaleInProps) {
  return (
    <div 
      className={cn("animate-scale-in", className)}
      style={{
        animationDelay: `${delay}ms`,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Get inline style for staggered animation delays
 * Use with CSS animations for staggered list items
 */
export function getStaggerDelay(index: number, baseDelayMs = 50): CSSProperties {
  return {
    animationDelay: `${index * baseDelayMs}ms`,
  };
}
