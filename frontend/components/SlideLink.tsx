"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { scrollBehavior } from "../lib/motion";

const Navigation = createContext<((href: string) => void) | null>(null);
export function RouteMotion({ children }: { children: ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const pending = useRef<(() => void) | null>(null);
  const current = useRef<HTMLDivElement>(null);
  const old = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState<{ html: string; path: string; scrollY: number; panelScroll: number; active: boolean } | null>(null);
  useEffect(() => { pending.current?.(); pending.current = null; }, [path]);
  useEffect(() => () => pending.current?.(), []);
  useLayoutEffect(() => {
    if (!fallback) return;
    const panel = old.current?.querySelector(".panel-scroll");
    if (panel) panel.scrollTop = fallback.panelScroll;
    if (!fallback.active && path !== fallback.path) setFallback({ ...fallback, active: true });
  }, [path, fallback]);
  useEffect(() => {
    if (!fallback) return;
    const timer = setTimeout(() => setFallback(null), fallback.active ? 460 : 4000);
    return () => clearTimeout(timer);
  }, [fallback]);
  function navigate(href: string) {
    if (pending.current) return;
    if (scrollBehavior() === "auto" || new URL(href, window.location.origin).pathname === path) { router.push(href); return; }
    if (!document.startViewTransition) {
      const clone = current.current?.cloneNode(true) as HTMLElement | undefined;
      clone?.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
      if (clone) setFallback({ html: clone.innerHTML, path, scrollY: window.scrollY, panelScroll: current.current?.querySelector(".panel-scroll")?.scrollTop ?? 0, active: false });
      router.push(href); return;
    }
    document.startViewTransition(async () => {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => { pending.current = null; resolve(); }, 1600);
        pending.current = () => { clearTimeout(timer); resolve(); };
        router.push(href);
      });
    });
  }
  return <Navigation.Provider value={navigate}>
    <div ref={current} className={fallback?.active ? "route-current route-sliding" : "route-current"}>{children}</div>
    {fallback && <div ref={old} className={`route-previous ${fallback.active ? "route-sliding" : ""}`} aria-hidden="true" inert><div style={{ transform: `translateY(${-fallback.scrollY}px)` }} dangerouslySetInnerHTML={{ __html: fallback.html }} /></div>}
  </Navigation.Provider>;
}
export function SlideLink(props: ComponentProps<typeof Link>) {
  const navigate = useContext(Navigation);
  return <Link {...props} onClick={(event) => {
    props.onClick?.(event);
    if (event.defaultPrevented || !navigate || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.target === "_blank" || typeof props.href !== "string" || !props.href.startsWith("/")) return;
    event.preventDefault(); navigate(props.href);
  }} />;
}
