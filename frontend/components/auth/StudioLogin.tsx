"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { AuthIcon } from "./AuthIcon";
import { SitePageHeader } from "../SitePageHeader";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { themeAppearance } from "../../lib/builder/appearance";
export function StudioLogin() {
  const auth = useAuth();
  const { workspace } = useWorkspace(); const appearance = themeAppearance(workspace.applied);
  const router = useRouter(); const [username, setUsername] = useState(""); const [password, setPassword] = useState(""); const [visible, setVisible] = useState(false); const [error, setError] = useState(""); const [pending, startTransition] = useTransition();
  return <main className={`${appearance.className} auth-page`} style={appearance.style}><SitePageHeader theme={workspace.applied} account={false} /><section className="auth-card"><span className="auth-wordmark">Studio.</span><h1>Studio’ya giriş</h1><p className="auth-subtitle">Sitenin tasarımını ve yazılarını yönet.</p><form onSubmit={e => { e.preventDefault(); setError(""); startTransition(async () => { try { const result = await auth.login(username, password); if (result) { setPassword(""); router.refresh(); } else setError("Giriş tamamlanamadı. Bilgilerini kontrol et."); } catch { setError("Giriş tamamlanamadı. Tekrar dene."); } }); }}><label className="auth-field" htmlFor="studio-username">Kullanıcı adı<input id="studio-username" autoComplete="username" maxLength={80} value={username} disabled={pending} onChange={e => setUsername(e.target.value)} /></label><div className="auth-field"><label htmlFor="studio-password">Şifre</label><div className="auth-password"><input id="studio-password" autoComplete="current-password" type={visible ? "text" : "password"} maxLength={128} value={password} disabled={pending} onChange={e => setPassword(e.target.value)} /><button type="button" aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"} onClick={() => setVisible(!visible)}><AuthIcon kind={visible ? "hidden" : "eye"} /></button></div></div>{error && <p role="alert" className="auth-field-error">{error}</p>}<button type="submit" className="auth-primary" disabled={pending || !username || !password}>{pending && <span className="auth-spinner" aria-hidden="true" />}{pending ? "Giriş yapılıyor…" : "Studio’yu aç"}</button></form></section></main>;
}
