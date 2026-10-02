"use client";

import { useEffect, useState, type ComponentProps } from "react";

/** Local click feedback; never animates the surrounding content. */
export function RippleButton({ children, className = "", onPointerDown, onClick, ...props }: ComponentProps<"button">) {
  const [ripple, setRipple] = useState<{ x: number; y: number; size: number; id: number } | null>(null);
  useEffect(() => { if (!ripple) return; const timer = setTimeout(() => setRipple(null), 360); return () => clearTimeout(timer); }, [ripple]);
  function feedback(button: HTMLButtonElement, x?: number, y?: number) {
    const rect = button.getBoundingClientRect();
    setRipple((previous) => ({ x: x ?? rect.width / 2, y: y ?? rect.height / 2, size: Math.hypot(rect.width, rect.height) * 2, id: (previous?.id ?? 0) + 1 }));
  }
  return <button {...props} className={`ripple-button ${className}`} onPointerDown={(event) => {
    onPointerDown?.(event);
    if (event.button === 0 && !event.defaultPrevented) { const rect = event.currentTarget.getBoundingClientRect(); feedback(event.currentTarget, event.clientX - rect.left, event.clientY - rect.top); }
  }} onClick={(event) => { if (event.detail === 0) feedback(event.currentTarget); onClick?.(event); }}>
    {children}{ripple && <span key={ripple.id} aria-hidden="true" className="click-ripple" style={{ left: ripple.x, top: ripple.y, width: ripple.size, height: ripple.size }} />}
  </button>;
}
