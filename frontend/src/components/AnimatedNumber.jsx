import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useEffect } from 'react';

export function AnimatedNumber({ value, suffix = '', decimals = 0 }) {
  const motionValue = useMotionValue(value || 0);
  const rounded = useTransform(motionValue, (latest) => `${Number(latest).toFixed(decimals)}${suffix}`);

  useEffect(() => {
    const controls = animate(motionValue, value || 0, { duration: 0.6, ease: 'easeOut' });
    return controls.stop;
  }, [motionValue, value]);

  return <motion.span>{rounded}</motion.span>;
}

