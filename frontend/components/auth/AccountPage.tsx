"use client";
import { SitePageHeader } from "../SitePageHeader";
import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { themeAppearance } from "../../lib/builder/appearance";
import { useAuth } from "./AuthProvider";
import { AuthIcon } from "./AuthIcon";
import { SlideLink } from "../SlideLink";
import { avatars, ProfileAvatar } from "./ProfileAvatar";
import type { AvatarStyle } from "../../lib/auth/model";
const sections = [{ id: "profile", label: "Profil" }, { id: "security", label: "Güvenlik" }, { id: "connected", label: "Bağlı Hesaplar" }, { id: "sessions", label: "Oturumlar" }, { id: "delete", label: "Hesabı Sil" }] as const;
type Section = typeof sections[number]["id"];
export function AccountPage() {
  const auth = useAuth(); const { workspace } = useWorkspace(); const appearance = themeAppearance(workspace.applied);
  const [avatar, setAvatar] = useState<AvatarStyle>("initials");
  const [active, setActive] = useState<Section>("profile"); const [name, setName] = useState(""); const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false); const dialog = useRef<HTMLDialogElement>(null); const deletion = useRef<HTMLElement>(null);
  useEffect(() => { setName(auth.session?.profile.name ?? ""); setAvatar(auth.session?.profile.avatar ?? "initials"); }, [auth.session?.profile.name, auth.session?.profile.avatar, auth.session?.profile.id]);
  useEffect(() => { if (deleting && !dialog.current?.open) dialog.current?.showModal(); else if (!deleting && dialog.current?.open) dialog.current.close(); }, [deleting]);
  useEffect(() => { if (!auth.session) setDeleting(false); }, [auth.session]);
  useEffect(() => { setActive("profile"); setConfirmation(""); }, [auth.session?.profile.id]);
  const profile = auth.session?.profile;
  return <main className={`${appearance.className} account-page`} style={appearance.style}>
    <SitePageHeader theme={workspace.applied} />
    <div className="account-layout"><div className="account-heading"><p className="eyebrow">KENDİ ALANIN</p><h1>Hesap</h1><p>Profilin, tercihlerin ve oturumun bir arada.</p></div>
      {!auth.ready ? <p role="status">Oturum yükleniyor…</p> : !profile ? <section className="account-empty"><AuthIcon kind="user" /><h2>Hesabına giriş yap.</h2><p>Kitaplığını ve kişisel ayarlarını burada yönetebilirsin.</p><button className="auth-primary" onClick={() => auth.openAuth()}>Giriş yap</button></section> : <div className="account-columns">
        <nav className="account-sidebar" aria-label="Hesap bölümleri">{sections.filter(section => profile.role !== "owner" || section.id !== "delete").map(section => <button type="button" key={section.id} aria-current={active === section.id ? "page" : undefined} onClick={() => { setActive(section.id); if (section.id === "delete") deletion.current?.scrollIntoView({ behavior: document.documentElement.dataset.motion === "off" ? "auto" : "smooth", block: "center" }); }}>{section.label}</button>)}</nav>
        <div className="account-content"><p className="account-demo-note">Demo hesap · Veriler bu tarayıcıda saklanır. Gerçek kimlik doğrulama ve cihazlar arası eşitleme henüz bağlı değil.</p>
          <section aria-label={sections.find(s => s.id === active)?.label} className="account-section">
            {active === "profile" && <><h2>Profil</h2><p>Sana nasıl hitap edelim?</p><form onSubmit={e => { e.preventDefault(); if (auth.updateProfile({ name, avatar })) auth.notify("Profil güncellendi"); }}><fieldset className="avatar-picker"><legend>Profil avatarın</legend><div className="avatar-preview"><ProfileAvatar name={name || profile.name} avatar={avatar} /><span>Seni kitaplığında ve hesap menüsünde temsil eder.</span></div><div className="avatar-options">{avatars.map(option => <label key={option.id} title={option.label}><input type="radio" name="avatar" value={option.id} checked={avatar === option.id} onChange={() => setAvatar(option.id)} aria-label={option.label} /><ProfileAvatar name={name || profile.name} avatar={option.id} /></label>)}</div></fieldset><label className="auth-field">Adın<input autoComplete="name" maxLength={80} value={name} onChange={e => setName(e.target.value)} /></label><label className="auth-field">E-posta<input type="email" value={profile.email} readOnly /><span className="auth-field-hint">E-posta değişikliği backend aşamasında eklenecek.</span></label><button className="auth-primary" type="submit" disabled={!name.trim() || (name.trim() === profile.name && avatar === (profile.avatar ?? "initials"))}>Değişiklikleri kaydet</button></form>{!profile.verified && <div className="account-inline"><span>E-posta doğrulama önizlemesi tamamlanmadı.</span><button type="button" onClick={() => auth.openAuth("verify")}>Doğrulamayı incele</button></div>}</>}
            {active === "security" && <><h2>Güvenlik</h2><p>Şifren tarayıcıda saklanmaz. Gerçek şifre değişimi sunucu bağlantısıyla gelecek.</p><SlideLink className="account-outline" href="/sifre-sifirla">Şifre sıfırlama ekranı ↗</SlideLink><div className="account-inline"><span>E-posta</span><span>{profile.verified ? "Doğrulama önizlemesi tamamlandı" : "Doğrulama bekleniyor"}</span></div></>}
            {active === "connected" && <><h2>Bağlı Hesaplar</h2><p>Google bağlantısının arayüzünü incele. Bu işlem Google hesabına erişmez.</p><div className="account-inline"><span>Google <small>{profile.googleConnected ? "Demo bağlantı açık" : "Bağlı değil"}</small></span><button type="button" onClick={() => { if (auth.updateProfile({ googleConnected: !profile.googleConnected })) auth.notify(profile.googleConnected ? "Demo bağlantı kaldırıldı" : "Demo bağlantı eklendi"); }}>{profile.googleConnected ? "Bağlantıyı kaldır" : "Bağlantıyı önizle"}</button></div></>}
            {active === "sessions" && <><h2>Oturumlar</h2><p>Bu tarayıcıdaki bütün site sekmeleri aynı demo oturumu paylaşır.</p><div className="account-session"><strong>Bu tarayıcı <span>Geçerli oturum</span></strong><p>Açılış: {new Date(auth.session!.startedAt).toLocaleString("tr-TR")}</p><p>Bitiş: {new Date(auth.session!.expiresAt).toLocaleString("tr-TR")}</p></div><button className="account-outline" type="button" onClick={auth.signOut}>Bu tarayıcıdaki tüm sekmelerden çıkış yap</button><p className="auth-field-hint">Diğer cihazlardaki oturumlar backend bağlandığında listelenecek.</p></>}
            {active === "delete" && <><h2>Hesabı Sil</h2><p>Aşağıdaki alandan demo hesabını kaldırabilirsin.</p></>}
          </section>
          {auth.error && <p role="alert" className="auth-field-error">{auth.error}</p>}
          {profile.role !== "owner" && <section className="account-delete" ref={deletion}><h2>Hesabı sil</h2><p>Demo profilin, kitaplığın ve bu hesaba ait yerel notların kaldırılır. Yazılar ve misafir olarak tuttuğun notlar korunur.</p><button className="account-danger" type="button" onClick={() => { setConfirmation(""); setDeleting(true); }}>Demo hesabı sil</button></section>}
        </div>
      </div>}
    </div>
    <dialog ref={dialog} className={`${appearance.className} account-confirm`} style={appearance.style} aria-labelledby="delete-account-title" onCancel={() => setDeleting(false)} onClose={() => setDeleting(false)}><h2 id="delete-account-title">Demo hesabını silmek istiyor musun?</h2><p>Bu hesaba ait kitaplık, koleksiyonlar ve notlar kaldırılır. Onaylamak için e-posta adresini yaz.</p><label className="auth-field">E-posta adresin<input autoComplete="off" value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label><div><button type="button" className="account-outline" autoFocus onClick={() => setDeleting(false)}>Vazgeç</button><button type="button" className="account-danger" disabled={!profile || confirmation.trim().toLowerCase() !== profile.email} onClick={() => { if (auth.deleteAccount()) setDeleting(false); }}>Hesabı sil</button></div>{auth.error && <p role="alert" className="auth-field-error">{auth.error}</p>}</dialog>
  </main>;
}
