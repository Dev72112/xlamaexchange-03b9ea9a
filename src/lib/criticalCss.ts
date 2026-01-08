/**
 * Critical CSS utilities for faster initial render
 * Helps identify and optimize render-blocking resources
 */

/**
 * Preload a stylesheet without blocking render
 */
export function preloadStylesheet(href: string): void {
  if (typeof document === 'undefined') return;
  
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'style';
  link.href = href;
  link.onload = function(this: HTMLLinkElement) {
    this.onload = null;
    this.rel = 'stylesheet';
  };
  document.head.appendChild(link);
}

/**
 * Defer loading of non-critical JavaScript
 */
export function deferScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

/**
 * Check if the page is above the fold (visible without scrolling)
 */
export function isAboveFold(element: HTMLElement): boolean {
  if (typeof window === 'undefined') return true;
  
  const rect = element.getBoundingClientRect();
  return rect.top < window.innerHeight;
}

/**
 * Lazy load images below the fold
 */
export function setupLazyImages(): void {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
  
  const images = document.querySelectorAll('img[data-src]');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        const src = img.dataset.src;
        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
        }
        observer.unobserve(img);
      }
    });
  }, {
    rootMargin: '50px 0px',
    threshold: 0.01,
  });
  
  images.forEach((img) => observer.observe(img));
}

/**
 * Preconnect to an origin for faster subsequent requests
 */
export function preconnect(origin: string, crossOrigin = true): void {
  if (typeof document === 'undefined') return;
  
  // Check if already preconnected
  const existing = document.querySelector(`link[rel="preconnect"][href="${origin}"]`);
  if (existing) return;
  
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = origin;
  if (crossOrigin) {
    link.crossOrigin = 'anonymous';
  }
  document.head.appendChild(link);
}

/**
 * DNS prefetch for an origin
 */
export function dnsPrefetch(origin: string): void {
  if (typeof document === 'undefined') return;
  
  const existing = document.querySelector(`link[rel="dns-prefetch"][href="${origin}"]`);
  if (existing) return;
  
  const link = document.createElement('link');
  link.rel = 'dns-prefetch';
  link.href = origin;
  document.head.appendChild(link);
}
