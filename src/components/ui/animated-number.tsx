import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
}

export function AnimatedNumber({ value, suffix = "", prefix = "", duration = 0.8, className }: AnimatedNumberProps) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => {
    if (value >= 100) return Math.round(v).toString();
    if (value >= 1) return v.toFixed(1);
    return v.toFixed(2);
  });
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) {
      // Subsequent updates: quick transition
      const controls = animate(motionValue, value, { duration: 0.3, ease: "easeOut" });
      return controls.stop;
    }
    // First mount: spring animation
    const controls = animate(motionValue, value, {
      duration,
      ease: [0.25, 0.46, 0.45, 0.94],
    });
    hasAnimated.current = true;
    return controls.stop;
  }, [value, duration, motionValue]);

  return (
    <span className={className}>
      {prefix}
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}