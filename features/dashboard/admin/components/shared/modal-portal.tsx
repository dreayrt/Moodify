"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ModalPortalProps {
  children: ReactNode;
}

/**
 * ModalPortal teleports modal overlays directly to document.body.
 * This guarantees that `fixed inset-0` attaches to the true browser viewport,
 * immune to any parent `transform`, `filter`, `perspective`, or scroll container.
 */
export function ModalPortal({ children }: ModalPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(children, document.body);
}
