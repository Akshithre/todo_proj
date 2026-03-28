import React, { useEffect, useState } from "react";

interface Props {
  value: number;
  duration?: number;
  suffix?: string;
}

const AnimatedCounter: React.FC<Props> = ({ value, duration = 800, suffix = "" }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * ease));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value, duration]);

  return <>{display}{suffix}</>;
};

export default AnimatedCounter;
