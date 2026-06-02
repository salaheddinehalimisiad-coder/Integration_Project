import { useEffect, useState, useRef } from 'react';

/**
 * AnimatedCounter — counts up from 0 to `value` smoothly on mount/change.
 *
 * Props:
 *   value: number (target value)
 *   duration: ms (default 900)
 *   format: (n) => string (optional formatter)
 *   suffix: string (e.g. '%', ' ms')
 */
export default function AnimatedCounter({ value, duration = 900, format, suffix = '' }) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(0);
  const rafRef = useRef();

  useEffect(() => {
    if (typeof value !== 'number' || isNaN(value)) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const from = startRef.current;
    const to = value;

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const current = from + (to - from) * eased;
      setDisplay(Number.isInteger(to) ? Math.round(current) : Number(current.toFixed(1)));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        startRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  const formatted = format ? format(display) : display;
  return <>{formatted}{suffix}</>;
}
