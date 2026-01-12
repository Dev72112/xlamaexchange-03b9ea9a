import { useEffect, useRef, useState, useCallback } from 'react';

interface UseScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollRevealOptions = {}
) {
  const { threshold = 0.1, rootMargin = '0px', triggerOnce = true } = options;
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, isVisible };
}

// Hook for staggered children reveal
export function useStaggerReveal(itemCount: number, baseDelay = 0.1) {
  const getDelay = useCallback(
    (index: number) => baseDelay * index,
    [baseDelay]
  );

  return { getDelay };
}

// CSS classes generator for scroll reveal animations
export function getScrollRevealClass(isVisible: boolean, variant: 'fade' | 'slide-up' | 'slide-left' | 'scale' = 'fade') {
  const baseClass = 'transition-all duration-700 ease-out';
  
  const variants = {
    fade: {
      hidden: 'opacity-0',
      visible: 'opacity-100'
    },
    'slide-up': {
      hidden: 'opacity-0 translate-y-8',
      visible: 'opacity-100 translate-y-0'
    },
    'slide-left': {
      hidden: 'opacity-0 translate-x-8',
      visible: 'opacity-100 translate-x-0'
    },
    scale: {
      hidden: 'opacity-0 scale-95',
      visible: 'opacity-100 scale-100'
    }
  };

  const variantClasses = variants[variant];
  return `${baseClass} ${isVisible ? variantClasses.visible : variantClasses.hidden}`;
}
