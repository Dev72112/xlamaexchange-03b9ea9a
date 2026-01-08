import { useState, memo } from 'react';
import { cn } from '@/lib/utils';

interface TokenImageProps {
  src: string | undefined | null;
  alt: string;
  fallbackText?: string;
  className?: string;
  size?: number;
}

/**
 * Token image with proper width/height attributes to prevent CLS
 * Uses ui-avatars as fallback with consistent sizing
 */
export const TokenImage = memo(function TokenImage({ 
  src, 
  alt, 
  fallbackText, 
  className,
  size = 32,
}: TokenImageProps) {
  const [hasError, setHasError] = useState(false);
  
  // Generate fallback URL with proper size
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackText || alt?.slice(0, 2) || '??')}&background=random&size=${size * 2}`;
  
  return (
    <img
      src={hasError || !src ? fallbackUrl : src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={cn("rounded-full object-cover", className)}
      onError={() => setHasError(true)}
    />
  );
});

interface ChainImageProps {
  src: string | undefined | null;
  alt: string;
  fallbackText?: string;
  className?: string;
  size?: number;
}

/**
 * Chain image with proper width/height attributes to prevent CLS
 */
export const ChainImage = memo(function ChainImage({ 
  src, 
  alt, 
  fallbackText, 
  className,
  size = 24,
}: ChainImageProps) {
  const [hasError, setHasError] = useState(false);
  
  // Generate fallback URL with proper size and brand color
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackText || alt?.slice(0, 2) || '??')}&background=6366f1&color=fff&size=${size * 2}`;
  
  return (
    <img
      src={hasError || !src ? fallbackUrl : src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={cn("rounded-full object-cover", className)}
      onError={() => setHasError(true)}
    />
  );
});
