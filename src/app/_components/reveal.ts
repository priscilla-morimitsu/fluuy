"use client";

import { useEffect, useRef, useState } from "react";

// Ports the prototype's IntersectionObserver reveal pattern: fires once when the
// element scrolls into view, then disconnects.
export function useReveal<T extends Element>(threshold: number) {
  const ref = useRef<T | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setRevealed(true);
            obs.disconnect();
          }
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, revealed };
}
