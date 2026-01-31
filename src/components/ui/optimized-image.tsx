/**
 * Optimized Image Component
 * Provides lazy loading, error handling, and placeholder support
 */
import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  aspectRatio?: 'square' | 'video' | 'auto';
  priority?: boolean;
  onLoadComplete?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  fallbackSrc = '/placeholder.svg',
  aspectRatio = 'auto',
  priority = false,
  className,
  onLoadComplete,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '200px', // Start loading 200px before entering viewport
        threshold: 0,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority, isInView]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoadComplete?.();
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  const aspectRatioClass = {
    square: 'aspect-square',
    video: 'aspect-video',
    auto: '',
  }[aspectRatio];

  const currentSrc = hasError ? fallbackSrc : src;

  return (
    <div
      ref={imgRef}
      className={cn(
        'relative overflow-hidden bg-muted',
        aspectRatioClass,
        className
      )}
    >
      {/* Loading placeholder with explicit dimensions */}
      {!isLoaded && (
        <div 
          className="absolute inset-0 animate-pulse bg-muted" 
          style={{ width: props.width || '100%', height: props.height || '100%' }}
        />
      )}
      
      {/* Actual image with explicit dimensions for CLS prevention */}
      {isInView && (
        <img
          src={currentSrc}
          alt={alt}
          width={props.width}
          height={props.height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          {...props}
        />
      )}
    </div>
  );
}

/**
 * Token image with optimized loading and chain-specific fallbacks
 */
interface TokenImageProps {
  src?: string | null;
  symbol?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  xs: 'w-4 h-4',
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
};

export function TokenImage({
  src,
  symbol = '?',
  size = 'md',
  className,
}: TokenImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    // Fallback to symbol initial
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-muted text-muted-foreground font-medium',
          sizeClasses[size],
          className
        )}
      >
        {symbol.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={symbol}
      loading="lazy"
      decoding="async"
      onError={() => setHasError(true)}
      className={cn('rounded-full object-cover', sizeClasses[size], className)}
    />
  );
}
