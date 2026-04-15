import { useEffect, useRef, useState } from "react";

function easeOutCubic(progress) {
  return 1 - Math.pow(1 - progress, 3);
}

export default function AnimatedNumber({ value = 0, duration = 800, formatter = (next) => next }) {
  const [displayValue, setDisplayValue] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    const startValue = 0;
    const startTime = performance.now();

    const tick = (now) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = easeOutCubic(progress);
      const nextValue = Math.round(startValue + (value - startValue) * eased);
      setDisplayValue(nextValue);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [duration, value]);

  return <span>{formatter(displayValue)}</span>;
}
