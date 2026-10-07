"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AuthIcon } from "./AuthIcon";
import { SitePageHeader } from "../SitePageHeader";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { themeAppearance } from "../../lib/builder/appearance";
import { useAuth } from "./AuthProvider";

/** Studio sign-in uses the same server session as members; only the OWNER role opens Studio. */
export function StudioLogin({ signedInAsMember = false }: { signedInAsMember?: boolean }) {
  const { workspace } = useWorkspace(); const appearance = themeAppearance(workspace.applied); const auth = useAuth();
  const router = useRouter(); const [identifier, setIdentifier] = useState(""); const [password, setPassword] = useState(""); const [visible, setVisible] = useState(false); const [pending, startTransition] = useTransition();
  const member = signedInAsMember || (auth.session !== null && auth.session.profile.role !== "owner");
  return <main className={`${appearance.className} auth-page`} style={appearance.style}><SitePageHeader theme={workspace.applied} account={false} /><section className="auth-card"><span className="auth-wordmark">Studio.</span><h1>Studio’ya giriş</h1>
    {member ? <><p className="auth-subtitle">Bu hesap okur hesabı; Studio yalnız site sahibine açık.</p><button type="button" className="auth-primary" onClick={() => startTransition(async () => { await auth.signOut(); router.refresh(); })}>Çıkış yap ve sahip olarak gir</button></> : <>
    <p className="auth-subtitle">Sitenin tasarımını ve yazılarını yönet.</p><form onSubmit={e => { e.preventDefault(); startTransition(async () => { if (await auth.login(identifier, password)) { setPassword(""); router.refresh(); } }); }}><label className="auth-field" htmlFor="studio-username">Kullanıcı adı veya e-posta<input id="studio-username" autoComplete="username" maxLength={254} value={identifier} disabled={pending} onChange={e => setIdentifier(e.target.value)} /></label><div className="auth-field"><label htmlFor="studio-password">Şifre</label><div className="auth-password"><input id="studio-password" autoComplete="current-password" type={visible ? "text" : "password"} maxLength={128} value={password} disabled={pending} onChange={e => setPassword(e.target.value)} /><button type="button" aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"} onClick={() => setVisible(!visible)}><AuthIcon kind={visible ? "hidden" : "eye"} /></button></div></div>{auth.error && <p role="alert" className="auth-field-error">{auth.error}</p>}<button type="submit" className="auth-primary" disabled={pending || !identifier || !password}>{pending && <span className="auth-spinner" aria-hidden="true" />}{pending ? "Giriş yapılıyor…" : "Studio’yu aç"}</button></form></>}
  </section></main>;
}
