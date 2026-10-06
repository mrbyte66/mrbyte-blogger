"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { avatarStyles, type AuthScreen, type DemoProfile, type DemoSession } from "../../lib/auth/model";
import { api, clearCsrf } from "../../lib/api/client";
import { AuthDialog } from "./AuthDialog";
export type ServerProfile = { id: string; name: string; email: string; verified: boolean; avatar: string | null; role: "member" | "owner"; version: number; preferences: { publicationEmail: boolean; timeZone: string } };
type AuthContext = {
  session: DemoSession | null; ready: boolean; error: string;
  openAuth: (screen?: AuthScreen) => void; closeAuth: () => void;
  login: (identifier: string, password: string) => Promise<boolean>; refresh: () => Promise<void>;
  updateProfile: (patch: Partial<Pick<DemoProfile, "name" | "avatar" | "publicationEmail">>) => Promise<boolean>;
  signOut: () => Promise<void>; deleteAccount: () => Promise<boolean>; notify: (message: string) => void;
};
const fallback: AuthContext = { session: null, ready: false, error: "", openAuth: () => {}, closeAuth: () => {}, login: async () => false, refresh: async () => {}, updateProfile: async () => false, signOut: async () => {}, deleteAccount: async () => false, notify: () => {} };
const Context = createContext<AuthContext>(fallback);
export function useAuth() { return useContext(Context); }
function profile(data: ServerProfile): DemoProfile {
  return { id: data.id, name: data.name, email: data.email, role: data.role, verified: data.verified, googleConnected: false, avatar: avatarStyles.find(a => a === data.avatar) ?? "initials", publicationEmail: data.preferences.publicationEmail, timeZone: data.preferences.timeZone, version: data.version };
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<DemoSession | null>(null); const [ready, setReady] = useState(false);
  const [error, setError] = useState(""); const [screen, setScreen] = useState<AuthScreen | null>(null); const [toast, setToast] = useState("");
  const generation = useRef(0); const channel = useRef<BroadcastChannel | null>(null);
  const load = useCallback(async (): Promise<boolean> => {
    const request = ++generation.current;
    try {
      const data = await api<{ authenticated: boolean; profile?: ServerProfile; expiresAt?: string }>("/auth/session");
      if (request !== generation.current) return false;
      setSession(data.authenticated && data.profile && data.expiresAt ? { version: 1, profile: profile(data.profile), startedAt: Date.now(), expiresAt: Date.parse(data.expiresAt) } : null); setError(""); return data.authenticated;
    } catch(error) { if(request !== generation.current) return false; setSession(null); setError(error instanceof Error ? error.message : "Oturum okunamadı."); return false; }
    finally { if(request === generation.current) setReady(true); }
  }, []);
  useEffect(() => {
    void load(); const visible = () => { if (document.visibilityState === "visible") void load(); };
    if (typeof BroadcastChannel !== "undefined") { channel.current = new BroadcastChannel("satir-session"); channel.current.onmessage = () => { clearCsrf(); void load(); }; }
    const expire=()=>{generation.current++;clearCsrf();setSession(null);setReady(true);setError("Oturumun sona erdi. Tekrar giriş yap.");};
    window.addEventListener("satir:session-expired",expire);
    window.addEventListener("focus", visible); document.addEventListener("visibilitychange", visible);
    return () => { generation.current++; channel.current?.close(); channel.current = null; window.removeEventListener("satir:session-expired",expire);window.removeEventListener("focus", visible); document.removeEventListener("visibilitychange", visible); };
  }, [load]);
  useEffect(() => { if (!session) return; const timer = setTimeout(() => void load(), Math.min(2147483647, Math.max(0, session.expiresAt - Date.now()))); return () => clearTimeout(timer); }, [session, load]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(""), 3500); return () => clearTimeout(timer); }, [toast]);
  function sync() { channel.current?.postMessage("changed"); }
  async function action(work: () => Promise<void>) {
    setError(""); try { await work(); return true; } catch(error) { setError(error instanceof Error ? error.message : "İşlem tamamlanamadı."); return false; }
  }
  async function login(identifier: string, password: string) { return action(async () => { await api("/auth/login", { method: "POST", body: { identifier, password } }); clearCsrf(); if (!(await load())) throw new Error("Oturum doğrulanamadı. Tekrar giriş yap."); sync(); }); }
  async function signOut() { await action(async () => { await api("/auth/logout", { method: "POST" }); clearCsrf(); generation.current++; setSession(null); setScreen(null); sync(); setToast("Çıkış yapıldı"); }); }
  async function updateProfile(patch: Partial<Pick<DemoProfile, "name" | "avatar" | "publicationEmail">>) {
    if(!session) return false;
    return action(async () => {
      let version = session.profile.version;
      if (patch.name !== undefined || patch.avatar !== undefined) {
        const next = await api<ServerProfile>("/me", { method: "PATCH", body: { name: patch.name, avatar: patch.avatar }, version }); version = next.version;
      }
      if (patch.publicationEmail !== undefined) await api("/me/preferences", { method: "PATCH", body: { publicationEmail: patch.publicationEmail }, version });
      await load(); sync();
    });
  }
  async function deleteAccount() { return action(async () => { await api("/me", { method: "DELETE", body: { confirmation: "DELETE" } }); clearCsrf(); generation.current++; setSession(null); sync(); setToast("Hesap silindi"); }); }
  return <Context.Provider value={{ session, ready, error, openAuth: (next = "login") => { setError(""); setScreen(next); }, closeAuth: () => setScreen(null), login, refresh: async () => { await load(); }, updateProfile, signOut, deleteAccount, notify: setToast }}>
    {children}<AuthDialog screen={screen} /><div className={`auth-toast ${toast ? "is-visible" : ""}`} role="status" aria-live="polite">{toast}</div>
  </Context.Provider>;
}
