"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
/** The server only renders this bridge after verifying its HttpOnly Studio cookie. */
export function StudioSession({ children }: { children: ReactNode }) {
  const auth = useAuth(); const router = useRouter(); const established = useRef(false);
  useEffect(() => {
    if (!auth.ready) return;
    if (!established.current) { established.current = true; if (auth.session?.profile.role !== "owner") auth.enterOwnerDemo(); }
    else if (auth.session?.profile.role !== "owner") router.refresh();
  }, [auth.ready, auth.session?.profile.role, auth.enterOwnerDemo, router]);
  if (auth.ready && established.current && auth.session?.profile.role !== "owner") return <p className="theme-site" role="status">Studio oturumu güncelleniyor…</p>;
  return children;
}
