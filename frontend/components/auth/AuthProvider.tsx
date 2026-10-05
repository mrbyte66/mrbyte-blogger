"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { logoutStudio } from "../../app/studio/access";
import { validProfile, parseSession, profilesKey, readProfiles, sessionDuration, sessionKey, validEmail, type AuthScreen, type DemoProfile, type DemoSession } from "../../lib/auth/model";
import { AuthDialog } from "./AuthDialog";

type AuthContext = {
  session: DemoSession | null; ready: boolean; error: string;
  openAuth: (screen?: AuthScreen) => void; closeAuth: () => void;
  enterDemo: (email: string, name?: string, google?: boolean) => boolean;
  updateProfile: (patch: Partial<Pick<DemoProfile, "name" | "avatar" | "publicationEmail" | "verified" | "googleConnected">>) => boolean;
  enterOwnerDemo: () => boolean; signOut: () => void; deleteAccount: () => boolean; notify: (message: string) => void;
};
const fallback: AuthContext = { session: null, ready: false, error: "", openAuth: () => {}, closeAuth: () => {}, enterDemo: () => false, updateProfile: () => false, enterOwnerDemo: () => false, signOut: () => {}, deleteAccount: () => false, notify: () => {} };
const ownerPreferencesKey = "mrbyte:studio-preferences:v1";
const Context = createContext<AuthContext>(fallback);
export function useAuth() { return useContext(Context); }
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<DemoSession | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [screen, setScreen] = useState<AuthScreen | null>(null);
  const [toast, setToast] = useState("");
  const load = useCallback(() => {
    try { setSession(parseSession(localStorage.getItem(sessionKey))); setError(""); }
    catch { setSession(null); setError("Oturum bu tarayıcıda okunamadı."); }
    setReady(true);
  }, []);
  useEffect(() => {
    load();
    const sync = (event: StorageEvent) => { if (event.key === sessionKey || event.key === null) load(); };
    const visible = () => { if (document.visibilityState === "visible") load(); };
    window.addEventListener("storage", sync); window.addEventListener("focus", load); document.addEventListener("visibilitychange", visible);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("focus", load); document.removeEventListener("visibilitychange", visible); };
  }, [load]);
  useEffect(() => { if (!session) return; const timer = setTimeout(load, Math.max(0, session.expiresAt - Date.now())); return () => clearTimeout(timer); }, [session, load]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(""), 3500); return () => clearTimeout(timer); }, [toast]);
  function persist(next: DemoSession) {
    let previousProfiles: string | null = null;
    let wroteProfiles = false;
    let previousOwnerPreferences: string | null = null;
    let wroteOwnerPreferences = false;
    try {
      if (next.profile.role === "owner") {
        previousOwnerPreferences = localStorage.getItem(ownerPreferencesKey);
        localStorage.setItem(ownerPreferencesKey, JSON.stringify({ publicationEmail: next.profile.publicationEmail ?? true }));
        wroteOwnerPreferences = true;
      } else {
        previousProfiles = localStorage.getItem(profilesKey);
        const profiles = readProfiles(previousProfiles);
        localStorage.setItem(profilesKey, JSON.stringify([...profiles.filter(p => p.id !== next.profile.id), next.profile]));
        wroteProfiles = true;
      }
      localStorage.setItem(sessionKey, JSON.stringify(next)); setSession(next); setError(""); return true;
    } catch {
      if (wroteOwnerPreferences) {
        try { if (previousOwnerPreferences === null) localStorage.removeItem(ownerPreferencesKey); else localStorage.setItem(ownerPreferencesKey, previousOwnerPreferences); } catch { /* Report failed persistence. */ }
      }
      if (wroteProfiles) {
        try { if (previousProfiles === null) localStorage.removeItem(profilesKey); else localStorage.setItem(profilesKey, previousProfiles); } catch { /* Report failure; never claim a successful session. */ }
      }
      setError("Değişiklik saklanamadı. Tarayıcı depolamasını kontrol et."); return false;
    }
  }
  function enterDemo(email: string, name?: string, google = false) {
    const normalized = email.trim().toLowerCase();
    if (!validEmail(normalized) || (name !== undefined && (!name.trim() || name.trim().length > 80))) return false;
    try {
      const existing = readProfiles(localStorage.getItem(profilesKey)).find(p => p.email === normalized);
      if (name && existing) { setError("Bu e-posta için bir demo hesap var. Giriş sekmesini kullan."); return false; }
      const profile: DemoProfile = existing ?? { id: crypto.randomUUID(), email: normalized, name: name?.trim() || normalized.split("@")[0], verified: google, googleConnected: google, role: "member" };
      const startedAt = Date.now();
      return persist({ version: 1, profile: google ? { ...profile, googleConnected: true } : profile, startedAt, expiresAt: startedAt + sessionDuration });
    } catch { setError("Demo hesap bilgisi okunamadı. Mevcut kayıtlar değiştirilmedi."); return false; }
  }
  function enterOwnerDemo() {
    const startedAt = Date.now();
    let publicationEmail = true;
    try { const preferences = JSON.parse(localStorage.getItem(ownerPreferencesKey) ?? "null"); if (typeof preferences?.publicationEmail === "boolean") publicationEmail = preferences.publicationEmail; } catch { /* Use the compatible default for an invalid preference. */ }
    return persist({ version: 1, profile: { publicationEmail, id: "site-owner-demo", name: "Site sahibi", email: "owner-demo@example.com", verified: true, googleConnected: false, role: "owner" }, startedAt, expiresAt: startedAt + 8 * 60 * 60 * 1000 });
  }
  async function signOut() {
    try { if (session?.profile.role === "owner") await logoutStudio(); localStorage.removeItem(sessionKey); setSession(null); setScreen(null); setError(""); setToast("Çıkış yapıldı"); }
    catch { setError("Çıkış tüm sekmelere uygulanamadı. Tekrar dene."); }
  }
  function updateProfile(patch: Partial<Pick<DemoProfile, "name" | "avatar" | "publicationEmail" | "verified" | "googleConnected">>) {
    let current: DemoSession | null;
    try { current = parseSession(localStorage.getItem(sessionKey)); } catch { setError("Oturum okunamadı."); return false; }
    if (!current || current.profile.id !== session?.profile.id || (patch.name !== undefined && (!patch.name.trim() || patch.name.trim().length > 80))) return false;
    const nextProfile = { ...current.profile, ...patch, ...(patch.name ? { name: patch.name.trim() } : {}) };
    if (!validProfile(nextProfile)) return false;
    return persist({ ...current, profile: nextProfile });
  }
  function deleteAccount() {
    if (!session || session.profile.role === "owner") return false;
    try {
      const id = session.profile.id;
      localStorage.setItem(profilesKey, JSON.stringify(readProfiles(localStorage.getItem(profilesKey)).filter(p => p.id !== id)));
      localStorage.removeItem(`mrbyte:member-library:v1:${id}`);
      const readingKeys = Object.keys(localStorage).filter(key => key.startsWith(`mrbyte:reading:member:v1:${id}:`));
      for (const key of readingKeys) localStorage.removeItem(key);
      localStorage.removeItem(sessionKey); setSession(null); setToast("Demo hesap silindi"); return true;
    } catch { setError("Demo hesap silinemedi. Tekrar dene."); return false; }
  }
  return <Context.Provider value={{ session, ready, error, openAuth: (next = "login") => { setError(""); setScreen(next); }, closeAuth: () => setScreen(null), enterDemo, enterOwnerDemo, updateProfile, signOut, deleteAccount, notify: setToast }}>
    {children}<AuthDialog screen={screen} />
    <div className={`auth-toast ${toast ? "is-visible" : ""}`} role="status" aria-live="polite">{toast}</div>
  </Context.Provider>;
}
