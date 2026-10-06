"use client";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const channelName = "satir-content";
const localEvent = "satir:content-changed";
// One channel per tab: a channel never receives its own messages, so this tab is notified only once
// (through the local event) while other tabs get the broadcast.
let shared: BroadcastChannel | null | undefined;
function channel(): BroadcastChannel | null {
  if (shared === undefined) { try { shared = new BroadcastChannel(channelName); } catch { shared = null; } }
  return shared;
}

/**
 * Published content is loaded on the server in the root layout, which Next does not re-fetch on
 * client-side navigation. Re-render the server tree when Studio changes content (this tab or another
 * tab) and when a visitor tab regains focus, so newly published writing appears without a reload.
 */
export function PublicContentRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  const last = useRef(0);
  const studio = pathname?.startsWith("/studio") ?? false;
  useEffect(() => {
    const refresh = (force: boolean) => {
      const now = Date.now();
      if (!force && now - last.current < 15_000) return;
      last.current = now;
      router.refresh();
    };
    const changed = () => refresh(true);
    const visible = () => { if (!studio && document.visibilityState === "visible") refresh(false); };
    const tabs = channel();
    tabs?.addEventListener("message", changed);
    window.addEventListener(localEvent, changed);
    window.addEventListener("focus", visible);
    document.addEventListener("visibilitychange", visible);
    return () => {
      tabs?.removeEventListener("message", changed);
      window.removeEventListener(localEvent, changed);
      window.removeEventListener("focus", visible);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [router, studio]);
  return null;
}

/** Called by Studio after a successful save, publish or lifecycle change. */
export function announceContentChange() {
  window.dispatchEvent(new Event(localEvent));
  try { channel()?.postMessage("changed"); } catch { /* single tab */ }
}
