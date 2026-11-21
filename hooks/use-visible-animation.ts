"use client";

import { useEffect, useRef, useState } from "react";

export function useVisibleAnimation<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const update = () => setRunning(visible && !reducedMotion.matches && document.visibilityState === "visible");
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(element);
    reducedMotion.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return { ref, running };
}
