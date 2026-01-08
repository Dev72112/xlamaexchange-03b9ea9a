/**
 * Optimized Image Components
 * Provides lazy loading, responsive srcset, WebP support, and proper sizing
 */
import React, { useState, useRef, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  aspectRatio?: 'square' | 'video' | 'auto';
  priority?: boolean;
  sizes?: string;
  onLoadComplete?: () => void;
}

export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  fallbackSrc = '/placeholder.svg',
  aspectRatio = 'auto',
  priority = false,
  sizes,
  className,
  onLoadComplete,
  width,
  height,
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
        rootMargin: '200px',
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
      style={width && height ? { width, height } : undefined}
    >
      {/* Loading placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-muted" />
      )}
      
      {/* Actual image */}
      {isInView && (
        <img
          src={currentSrc}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          sizes={sizes}
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
});

/**
 * Token image with optimized loading, proper sizing, and CDN fallbacks
 */
interface TokenImageProps {
  src?: string | null;
  symbol?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeConfig = {
  xs: { class: 'w-4 h-4', px: 16 },
  sm: { class: 'w-6 h-6', px: 24 },
  md: { class: 'w-8 h-8', px: 32 },
  lg: { class: 'w-10 h-10', px: 40 },
  xl: { class: 'w-12 h-12', px: 48 },
};

export const TokenImageOptimized = memo(function TokenImageOptimized({
  src,
  symbol = '?',
  size = 'md',
  className,
}: TokenImageProps) {
  const [hasError, setHasError] = useState(false);
  const config = sizeConfig[size];

  if (!src || hasError) {
    // Generate consistent color from symbol
    const hash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full text-white font-medium',
          config.class,
          className
        )}
        style={{ 
          backgroundColor: `hsl(${hue}, 60%, 45%)`,
          fontSize: config.px * 0.4,
        }}
      >
        {symbol.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={symbol}
      width={config.px}
      height={config.px}
      loading="lazy"
      decoding="async"
      onError={() => setHasError(true)}
      className={cn('rounded-full object-cover', config.class, className)}
    />
  );
});

/**
 * Chain image with optimized loading and consistent fallbacks
 */
interface ChainImageProps {
  src?: string | null;
  chainName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const ChainImageOptimized = memo(function ChainImageOptimized({
  src,
  chainName = 'Chain',
  size = 'sm',
  className,
}: ChainImageProps) {
  const [hasError, setHasError] = useState(false);
  const config = sizeConfig[size];

  if (!src || hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-primary/20 text-primary font-medium',
          config.class,
          className
        )}
        style={{ fontSize: config.px * 0.35 }}
      >
        {chainName.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={chainName}
      width={config.px}
      height={config.px}
      loading="lazy"
      decoding="async"
      onError={() => setHasError(true)}
      className={cn('rounded-full object-cover', config.class, className)}
    />
  );
});

/**
 * Responsive hero image with srcset support
 */
interface ResponsiveImageProps {
  src: string;
  alt: string;
  srcSet?: string;
  sizes?: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
}

export const ResponsiveImage = memo(function ResponsiveImage({
  src,
  alt,
  srcSet,
  sizes = '100vw',
  width,
  height,
  priority = false,
  className,
}: ResponsiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      onLoad={() => setIsLoaded(true)}
      className={cn(
        'transition-opacity duration-300',
        isLoaded ? 'opacity-100' : 'opacity-0',
        className
      )}
    />
  );
});

// Re-export for backwards compatibility
export { TokenImageOptimized as TokenImage };
