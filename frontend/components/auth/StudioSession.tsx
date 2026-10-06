"use client";
import { type ReactNode } from "react";
import { StudioLogin } from "./StudioLogin";
import { useAuth } from "./AuthProvider";
/** Backend verifies the role again on every editor API request. */
export function StudioSession({ children }: { children: ReactNode }) {
  const auth = useAuth();
  if (!auth.ready) return <p className="theme-site" role="status">Studio oturumu yükleniyor…</p>;
  if (auth.session?.profile.role !== "owner" || !auth.session.profile.verified) return <StudioLogin />;
  return children;
}
