import { useState } from 'react';
import { cn } from '@/lib/utils';

interface TokenImageProps {
  src: string | undefined | null;
  alt: string;
  fallbackText?: string;
  className?: string;
}

export function TokenImage({ src, alt, fallbackText, className }: TokenImageProps) {
  const [hasError, setHasError] = useState(false);
  
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackText || alt?.slice(0, 2) || '??')}&background=random&size=64`;
  
  return (
    <img
      src={hasError || !src ? fallbackUrl : src}
      alt={alt}
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
}

export function ChainImage({ src, alt, fallbackText, className }: ChainImageProps) {
  const [hasError, setHasError] = useState(false);
  
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackText || alt?.slice(0, 2) || '??')}&background=6366f1&color=fff&size=64`;
  
  return (
    <img
      src={hasError || !src ? fallbackUrl : src}
      alt={alt}
      className={cn("rounded-full", className)}
      onError={() => setHasError(true)}
    />
  );
}
