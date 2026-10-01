"use client";

import { useEffect, useId, useRef, type RefObject } from "react";
import { getScreenGaze } from "../lib/character-motion";

type Props = { motionEnabled: boolean; ready: boolean; figure: RefObject<HTMLDivElement | null> };

/** Live CRT display over a static portrait; the portrait itself does not deform. */
export function MonitorFace({ motionEnabled, ready, figure }: Props) {
  const screen = useRef<SVGSVGElement>(null);
  const id = useId().replace(/:/g, "");

  useEffect(() => {
    const element = screen.current;
    if (!element || !motionEnabled || !ready) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let blinkTimer: ReturnType<typeof setTimeout> | undefined;
    let reopenTimer: ReturnType<typeof setTimeout> | undefined;
    let cycle = 0;
    const enabled = () => !media.matches && !document.hidden;
    const resetGaze = () => {
      cancelAnimationFrame(frame);
      element.style.setProperty("--gaze-x", "0px");
      element.style.setProperty("--gaze-y", "0px");
      element.dataset.attention = "neutral";
    };
    const stopBlink = () => {
      clearTimeout(blinkTimer);
      clearTimeout(reopenTimer);
      element.dataset.blinking = "false";
    };
    const scheduleBlink = (delay: number) => {
      clearTimeout(blinkTimer);
      if (!enabled()) return;
      blinkTimer = setTimeout(() => {
        if (!enabled()) return;
        element.dataset.blinking = "true";
        reopenTimer = setTimeout(() => {
          element.dataset.blinking = "false";
          const intervals = [4600, 6200, 3700, 7100];
          scheduleBlink(intervals[cycle++ % intervals.length]);
        }, 150);
      }, delay);
    };
    const sync = () => {
      resetGaze();
      stopBlink();
      if (enabled()) scheduleBlink(2600);
    };
    const move = (event: PointerEvent) => {
      if (!enabled() || event.pointerType === "touch") return;
      const bounds = figure.current?.getBoundingClientRect();
      if (!bounds) return;
      const gaze = getScreenGaze(event.clientX, event.clientY, bounds);
      const attentive = event.target instanceof Element && event.target.closest(".destination, .latest-note, .index-button");
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        element.style.setProperty("--gaze-x", `${gaze.x}px`);
        element.style.setProperty("--gaze-y", `${gaze.y}px`);
        element.dataset.attention = attentive ? "curious" : "neutral";
      });
    };
    sync();
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", resetGaze);
    window.addEventListener("blur", resetGaze);
    document.addEventListener("visibilitychange", sync);
    media.addEventListener("change", sync);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", resetGaze);
      window.removeEventListener("blur", resetGaze);
      document.removeEventListener("visibilitychange", sync);
      media.removeEventListener("change", sync);
      stopBlink();
      resetGaze();
    };
  }, [motionEnabled, ready, figure]);

  return <svg ref={screen} className="monitor-face" data-ready={ready} data-blinking="false" data-attention="neutral" viewBox="0 0 1024 1536" aria-hidden="true" focusable="false">
    <defs>
      <filter id={`${id}-glow`} x="-100%" y="-60%" width="300%" height="220%"><feGaussianBlur stdDeviation="6" result="bloom" /><feMerge><feMergeNode in="bloom" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      <pattern id={`${id}-phosphor`} width="3" height="4" patternUnits="userSpaceOnUse"><rect width="3" height="4" fill="#e2ffff" /><path d="M0 3.5H3" stroke="#9ccfd0" strokeWidth=".7" /></pattern>
    </defs>
    <g className="crt-gaze">
      <ellipse className="crt-eye" cx="330" cy="595" rx="18" ry="36" fill={`url(#${id}-phosphor)`} filter={`url(#${id}-glow)`} />
      <ellipse className="crt-eye" cx="543" cy="589" rx="20" ry="37" fill={`url(#${id}-phosphor)`} filter={`url(#${id}-glow)`} />
    </g>
  </svg>;
}
