/**
 * Shared Animation Variants
 * 
 * Centralized animation configurations for consistent motion across the app.
 * Optimized for 60fps with GPU-accelerated properties.
 */

import type { Variants, Transition } from "framer-motion";

// ============= Spring Presets =============
export const springs = {
  // Snappy for buttons, tabs
  snappy: { type: "spring", stiffness: 400, damping: 25 } as const,
  // Gentle for modals, drawers
  gentle: { type: "spring", stiffness: 300, damping: 30 } as const,
  // Bouncy for celebratory animations
  bouncy: { type: "spring", stiffness: 500, damping: 15 } as const,
  // Smooth for page transitions
  smooth: { type: "spring", stiffness: 200, damping: 25 } as const,
} as const;

// ============= Page Transitions =============
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.25, ease: [0, 0, 0.2, 1] }
  },
  exit: { 
    opacity: 0, 
    y: -8,
    transition: { duration: 0.15 }
  },
};

// ============= Tab Content =============
export const tabContentVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.2, ease: [0, 0, 0.2, 1] } 
  },
  exit: { 
    opacity: 0, 
    y: -8, 
    transition: { duration: 0.15 } 
  },
};

// ============= Card Entrance =============
export const cardEntrance: Variants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
  },
};

// ============= Stagger Container =============
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.2, ease: [0, 0, 0.2, 1] }
  },
};

// ============= Mobile-Specific =============
export const mobileSlideUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: springs.gentle
  },
  exit: { 
    opacity: 0, 
    y: 20,
    transition: { duration: 0.15 }
  },
};

export const mobileScale: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: springs.snappy
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: 0.1 }
  },
};

// ============= Interactive States =============
export const tapScale = {
  whileTap: { scale: 0.97 },
  transition: springs.snappy,
};

export const hoverLift = {
  whileHover: { y: -2, scale: 1.02 },
  transition: springs.gentle,
};

export const pressable = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
  transition: springs.snappy,
};

// ============= Loading States =============
export const shimmer: Variants = {
  initial: { opacity: 0.5 },
  animate: { 
    opacity: [0.5, 0.8, 0.5],
    transition: { 
      duration: 1.5, 
      repeat: Infinity, 
      ease: "easeInOut" 
    }
  },
};

export const pulse: Variants = {
  initial: { scale: 1 },
  animate: { 
    scale: [1, 1.05, 1],
    transition: { 
      duration: 2, 
      repeat: Infinity, 
      ease: "easeInOut" 
    }
  },
};

// ============= Drawer/Modal =============
export const drawerVariants: Variants = {
  initial: { y: "100%" },
  animate: { 
    y: 0,
    transition: springs.gentle
  },
  exit: { 
    y: "100%",
    transition: { duration: 0.2 }
  },
};

export const modalVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: springs.gentle
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: 0.15 }
  },
};

export const overlayVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

// ============= Header/Badge Entrance =============
export const headerBadge: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] }
  },
};

export const headerTitle: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, delay: 0.1, ease: [0.4, 0, 0.2, 1] }
  },
};

export const headerSubtitle: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, delay: 0.2, ease: [0.4, 0, 0.2, 1] }
  },
};

// ============= List Animations =============
export const listContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.03,
    },
  },
};

export const listItem: Variants = {
  initial: { opacity: 0, x: -8 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.15 }
  },
};

// ============= Success/Error States =============
export const successPop: Variants = {
  initial: { scale: 0, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: springs.bouncy
  },
};

export const shake: Variants = {
  initial: { x: 0 },
  animate: { 
    x: [0, -8, 8, -4, 4, 0],
    transition: { duration: 0.4 }
  },
};
