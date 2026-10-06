"use client";
import { useEffect, useId, useRef, useState } from "react";
import { passwordStrength, validEmail, type AuthScreen } from "../../lib/auth/model";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { AuthIcon, GoogleLogo } from "./AuthIcon";
import { useAuth } from "./AuthProvider";
import { api, clearCsrf } from "../../lib/api/client";

const headings: Record<AuthScreen, [string, string]> = {
  login: ["Tekrar hoş geldin", "Kendi kitaplığına, kaldığın satıra."],
  register: ["Hesap oluştur", "Sevdiğin yazıları kendi düzeninde sakla."],
  forgot: ["Şifreni mi unuttun?", "E-posta adresine bir sıfırlama bağlantısı gönderelim."],
  reset: ["Yeni bir şifre", "Hesabın için güçlü bir şifre seç."],
  verify: ["Son bir küçük adım", "E-posta adresini doğrulayarak hesabını etkinleştir."],
};
export function AuthCard({ initial = "login", onComplete }: { initial?: AuthScreen; onComplete?: () => void }) {
  const auth = useAuth();
  const { workspace } = useWorkspace();
  const [screen, setScreen] = useState(initial);
  const [email, setEmail] = useState(""); const [name, setName] = useState(""); const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState(""); const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [visible, setVisible] = useState(false); const [busy, setBusy] = useState(false); const [sent, setSent] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [purpose, setPurpose] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const id = useId();
  useEffect(() => { const fragment = new URLSearchParams(window.location.hash.slice(1)); setToken(fragment.get("token") ?? ""); setPurpose(fragment.get("purpose") ?? ""); if (fragment.has("token")) window.history.replaceState(null, "", window.location.pathname + window.location.search); }, []);
  const register = screen === "register";
  const hasPassword = screen === "login" || register || screen === "reset";
  const emailError = !validEmail(email.trim()) ? "Geçerli bir e-posta adresi yaz." : "";
  const nameError = !name.trim() ? "Sana nasıl hitap edelim?" : "";
  const passwordError = password.length < (screen === "login" ? 1 : 12) ? screen === "login" ? "Şifreni yaz." : "En az 12 karakter kullan." : "";
  const repeat = register || screen === "reset";
  const confirmationError = confirmation !== password || !confirmation ? "Şifreler aynı olmalı." : "";
  const valid = (!repeat || !confirmationError) && (!register || !nameError) && (screen === "reset" || !emailError) && (!hasPassword || !passwordError);
  const strength = passwordStrength(password);
  function change(next: AuthScreen) { setScreen(next); setPassword(""); setConfirmation(""); setConfirmationVisible(false); setVisible(false); setTouched({}); setSent(false); setError(""); heading.current?.focus(); }
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError("");
    try { await action(); } catch (error) { setError(error instanceof Error ? error.message : "İşlem tamamlanamadı."); }
    finally { setBusy(false); }
  }
  function finish() { setPassword(""); setConfirmation(""); auth.notify("Giriş yapıldı"); onComplete?.(); }
  function submit() {
    setTouched({ name: true, email: true, password: true, confirmation: true });
    if (!valid) return;
    void run(async () => {
      if (screen === "forgot") { await api("/auth/password/forgot", { method: "POST", body: { email } }); setSent(true); return; }
      if (screen === "reset") {
        if (!token) throw new Error("E-postandaki şifre sıfırlama bağlantısını aç.");
        await api("/auth/password/reset", { method: "POST", body: { token, password, passwordConfirmation: confirmation } });
        setToken(""); setPassword(""); setConfirmation(""); clearCsrf(); setSent(true); await auth.refresh(); return;
      }
      if (register) {
        await api("/auth/register", { method: "POST", body: { email, name, password, passwordConfirmation: confirmation } });
        setPassword(""); change("verify"); return;
      }
      if (await auth.login(email, password)) finish();
    });
  }
  function verify() {
    void run(async () => {
      if (!token) {
        const address = email || auth.session?.profile.email;
        if (!address) throw new Error("Doğrulama bağlantını e-postandan aç veya giriş yap.");
        await api("/auth/verification/resend", { method: "POST", body: { email: address } }); auth.notify("E-postanı kontrol et"); return;
      }
      await api(purpose === "EMAIL_CHANGE" ? "/auth/email-change/confirm" : "/auth/verification/confirm", { method: "POST", body: { token } });
      setToken(""); clearCsrf(); await auth.refresh(); auth.notify("E-posta doğrulandı"); onComplete?.(); if (!onComplete) change("login");
    });
  }
  const result = sent || screen === "verify";
  return <section className="auth-card" data-screen={screen} aria-labelledby={`${id}-title`} aria-busy={busy}>
    <span className="auth-wordmark">{workspace.applied.siteName}<span>.</span></span>
    <h1 id={`${id}-title`} tabIndex={-1} ref={heading}>{sent ? screen === "forgot" ? "E-postanı kontrol et" : "Şifren güncellendi" : headings[screen][0]}</h1>
    <p className="auth-subtitle">{sent ? screen === "forgot" ? "Hesap varsa sıfırlama bağlantısı e-posta adresine gönderilecek." : "Yeni şifrenle giriş yapabilirsin." : screen === "verify" ? "E-postandaki bağlantıyla doğrulamayı tamamla." : headings[screen][1]}</p>
    {result ? <div className="auth-message-actions">
      <button type="button" className="auth-primary" disabled={busy} onClick={() => {
        if (screen === "verify") verify(); else change("login");
      }}>{busy && <span className="auth-spinner" aria-hidden="true" />}{screen === "verify" ? token ? "E-postayı doğrula" : "Bağlantıyı yeniden gönder" : "Girişe dön"}</button>
    </div> : <>
      {(screen === "login" || register) && <>
        <div className="auth-tabs" role="tablist" aria-label="Hesap erişimi" onKeyDown={event => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key) || busy) return;
          event.preventDefault();
          const next = event.key === "Home" ? "login" : event.key === "End" ? "register" : register ? "login" : "register";
          change(next); event.currentTarget.querySelector<HTMLButtonElement>(`#${CSS.escape(id)}-${next}`)?.focus();
        }}><button type="button" role="tab" tabIndex={register ? -1 : 0} aria-selected={!register} aria-controls={`${id}-form`} id={`${id}-login`} disabled={busy} onClick={() => change("login")}>Giriş yap</button><button type="button" role="tab" tabIndex={register ? 0 : -1} aria-selected={register} aria-controls={`${id}-form`} id={`${id}-register`} disabled={busy} onClick={() => change("register")}>Üye ol</button></div>
        <button className="auth-google" type="button" disabled={busy} onClick={() => void run(async () => { const data = await api<{ authorizationUrl: string }>("/auth/google/start", { method: "POST", body: { returnTo: "/hesap", purpose: "login" } }); window.location.assign(data.authorizationUrl); })}><GoogleLogo />Google ile devam et</button>
        <div className="auth-divider"><span>veya</span></div>
      </>}
      <form id={`${id}-form`} role={screen === "login" || register ? "tabpanel" : undefined} aria-labelledby={screen === "login" || register ? `${id}-${register ? "register" : "login"}` : undefined} noValidate onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <div className="auth-form-fields">{register && <label className="auth-field" htmlFor={`${id}-name`}>Adın<input autoComplete="name" id={`${id}-name`} maxLength={80} value={name} disabled={busy} onBlur={() => setTouched(v => ({ ...v, name: true }))} onChange={e => setName(e.target.value)} aria-invalid={!!(touched.name && nameError)} aria-describedby={touched.name && nameError ? `${id}-name-error` : undefined} />{touched.name && nameError && <span id={`${id}-name-error`} className="auth-field-error">{nameError}</span>}</label>}
        {screen !== "reset" && <label className="auth-field" htmlFor={`${id}-email`}>E-posta<input autoComplete="email" inputMode="email" type="email" id={`${id}-email`} maxLength={254} value={email} disabled={busy} onBlur={() => setTouched(v => ({ ...v, email: true }))} onChange={e => setEmail(e.target.value)} aria-invalid={!!(touched.email && emailError)} aria-describedby={touched.email && emailError ? `${id}-email-error` : undefined} />{touched.email && emailError && <span id={`${id}-email-error`} className="auth-field-error">{emailError}</span>}</label>}
        {hasPassword && <div className="auth-field"><label htmlFor={`${id}-password`}>{screen === "reset" ? "Yeni şifre" : "Şifre"}</label><div className="auth-password"><input id={`${id}-password`} type={visible ? "text" : "password"} autoComplete={register || screen === "reset" ? "new-password" : "current-password"} maxLength={128} value={password} disabled={busy} onChange={e => setPassword(e.target.value)} onBlur={() => setTouched(v => ({ ...v, password: true }))} aria-invalid={!!(touched.password && passwordError)} aria-describedby={`${id}-password-hint`} /><button type="button" disabled={busy} aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"} aria-pressed={visible} onClick={() => setVisible(!visible)}><AuthIcon kind={visible ? "hidden" : "eye"} /></button></div>
          {(register || screen === "reset") && <div className="auth-strength" role="meter" aria-label="Şifre gücü" aria-valuemin={0} aria-valuemax={4} aria-valuenow={strength} aria-valuetext={["Henüz girilmedi", "Zayıf", "Orta", "İyi", "Güçlü"][strength]}><span style={{ width: `${strength * 25}%` }} /></div>}
          <span id={`${id}-password-hint`} className={touched.password && passwordError ? "auth-field-error" : "auth-field-hint"}>{touched.password && passwordError ? passwordError : register || screen === "reset" ? "En az 12 karakter; harf, sayı ve simgelerle güçlendir." : "Şifren sunucuda güvenli biçimde doğrulanır."}</span>
        </div>}
        {repeat && <div className="auth-field"><label htmlFor={`${id}-confirmation`}>Şifre tekrarı</label><div className="auth-password"><input id={`${id}-confirmation`} type={confirmationVisible ? "text" : "password"} autoComplete="new-password" maxLength={128} value={confirmation} disabled={busy} onChange={e => setConfirmation(e.target.value)} onBlur={() => setTouched(v => ({ ...v, confirmation: true }))} aria-invalid={!!(touched.confirmation && confirmationError)} aria-describedby={touched.confirmation && confirmationError ? `${id}-confirmation-error` : undefined} /><button type="button" disabled={busy} aria-label={confirmationVisible ? "Şifre tekrarını gizle" : "Şifre tekrarını göster"} aria-pressed={confirmationVisible} onClick={() => setConfirmationVisible(!confirmationVisible)}><AuthIcon kind={confirmationVisible ? "hidden" : "eye"} /></button></div>{touched.confirmation && confirmationError && <span id={`${id}-confirmation-error`} className="auth-field-error">{confirmationError}</span>}</div>}{screen === "login" && <button type="button" className="auth-text-button auth-forgot" disabled={busy} onClick={() => change("forgot")}>Şifremi unuttum</button>}
        </div><button className="auth-primary" type="submit" disabled={busy || !valid}>{busy && <span className="auth-spinner" aria-hidden="true" />}{busy ? "Bir an…" : register ? "Hesap oluştur" : screen === "forgot" ? "Devam et" : screen === "reset" ? "Şifreyi güncelle" : "Giriş yap"}</button>
      </form>
      {(screen === "forgot" || screen === "reset") && <button type="button" className="auth-text-button auth-back" onClick={() => change("login")} disabled={busy}>← Girişe dön</button>}
    </>}
    {(error || auth.error) && <p className="auth-field-error" role="alert">{error || auth.error}</p>}
    {(screen === "login" || register) && <p className="auth-benefit">Kitaplığın ve notların sana özel; hesabınla diğer cihazlarından da erişebilirsin. <a href="/uyelik">Üyeliği keşfet ↗</a></p>}
  </section>;
}
