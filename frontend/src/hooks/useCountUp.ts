import { useEffect, useRef, useState } from 'react';

const DURATION_MS = 700;

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function useCountUp(target: number, active: boolean): number {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    // Respect reduced-motion preference — jump to final value immediately
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !active) {
      setValue(target);
      return;
    }

    startRef.current = null;

    const animate = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / DURATION_MS, 1);
      setValue(target * easeOut(progress));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setValue(target);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, active]);

  return value;
}
