"use client";

import { useEffect, type RefObject } from "react";
import { scrollBehavior } from "./motion";

/** Small edge feedback, without replacing native wheel or touch scrolling. */
export function useEdgeElasticity(area: RefObject<HTMLDivElement | null>, viewKey: string) {
  useEffect(() => {
    const element = area.current;
    const content = element?.querySelector<HTMLElement>(".elastic-content");
    if (!element || !content) return;
    let frame = 0;
    let release: ReturnType<typeof setTimeout>;
    let touchY = 0;
    function pull(delta: number) {
      if (scrollBehavior() === "auto") return;
      const atTop = element!.scrollTop <= 0;
      const atBottom = element!.scrollTop + element!.clientHeight >= element!.scrollHeight - 1;
      if (!(atTop && delta < 0) && !(atBottom && delta > 0)) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => content!.style.setProperty("--edge-shift", `${-14 * Math.tanh(delta / 120)}px`));
      clearTimeout(release);
      release = setTimeout(() => content!.style.setProperty("--edge-shift", "0px"), 120);
    }
    const wheel = (event: WheelEvent) => { if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) pull(event.deltaY); };
    const start = (event: TouchEvent) => { touchY = event.touches[0]?.clientY ?? 0; };
    const move = (event: TouchEvent) => { if (event.touches.length === 1) pull(touchY - event.touches[0].clientY); };
    const end = () => content.style.setProperty("--edge-shift", "0px");
    element.addEventListener("wheel", wheel, { passive: true });
    element.addEventListener("touchstart", start, { passive: true });
    element.addEventListener("touchmove", move, { passive: true });
    element.addEventListener("touchend", end);
    element.addEventListener("touchcancel", end);
    return () => { cancelAnimationFrame(frame); clearTimeout(release); element.removeEventListener("wheel", wheel); element.removeEventListener("touchstart", start); element.removeEventListener("touchmove", move); element.removeEventListener("touchend", end); element.removeEventListener("touchcancel", end); end(); };
  }, [area, viewKey]);
}
