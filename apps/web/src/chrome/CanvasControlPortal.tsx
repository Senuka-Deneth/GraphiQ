import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Keep canvas controls in the shared right rail, outside clipped viewports. */
export function CanvasControlPortal({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => { setHost(document.getElementById("graphiq-canvas-tools")); }, []);
  return host ? createPortal(children, host) : null;
}
