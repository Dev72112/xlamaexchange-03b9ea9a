import { useState } from 'react';
import { cn } from '@/lib/utils';

interface TokenImageProps {
  src: string | undefined | null;
  alt: string;
  fallbackText?: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export function TokenImage({ src, alt, fallbackText, className, width = 32, height = 32, priority = false }: TokenImageProps) {
  const [hasError, setHasError] = useState(false);
  
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackText || alt?.slice(0, 2) || '??')}&background=random&size=${Math.max(width, height) * 2}`;
  
  return (
    <img
      src={hasError || !src ? fallbackUrl : src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={cn("rounded-full", className)}
      onError={() => setHasError(true)}
    />
  );
}

interface ChainImageProps {
  src: string | undefined | null;
  alt: string;
  fallbackText?: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export function ChainImage({ src, alt, fallbackText, className, width = 24, height = 24, priority = false }: ChainImageProps) {
  const [hasError, setHasError] = useState(false);
  
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackText || alt?.slice(0, 2) || '??')}&background=6366f1&color=fff&size=${Math.max(width, height) * 2}`;
  
  return (
    <img
      src={hasError || !src ? fallbackUrl : src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={cn("rounded-full", className)}
      onError={() => setHasError(true)}
    />
  );
}
