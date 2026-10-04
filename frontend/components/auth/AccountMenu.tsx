"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { AuthIcon } from "./AuthIcon";
import { ProfileAvatar } from "./ProfileAvatar";
import { useAuth } from "./AuthProvider";
export function AccountMenu() {
  const { session, ready, openAuth, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null); const trigger = useRef<HTMLButtonElement>(null); const id = useId();
  useEffect(() => {
    const outside = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside); return () => document.removeEventListener("pointerdown", outside);
  }, []);
  useEffect(() => { if (!session) setOpen(false); }, [session]);
  if (!session) return <div className="account-entry"><button type="button" className="account-access" aria-label="Giriş yap" title="Giriş yap veya üye ol" disabled={!ready} onClick={() => openAuth()}><AuthIcon kind="user" /><span>Giriş yap</span></button></div>;
  return <div className="account-menu" ref={ref} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }} onKeyDown={e => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); trigger.current?.focus(); } }}>
    <button type="button" ref={trigger} className="account-avatar" aria-label={`${session.profile.name} · Hesap menüsü`} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}><ProfileAvatar name={session.profile.name} avatar={session.profile.avatar} /></button>
    {open && <nav className="account-dropdown" id={id} aria-label="Hesap"><strong>{session.profile.name}</strong><span>Demo oturum</span><Link href="/kaydedilenler" onClick={() => setOpen(false)}>Kitaplığım</Link>{session.profile.role === "owner" && <Link href="/studio" onClick={() => setOpen(false)}>Studio</Link>}<Link href="/hesap" onClick={() => setOpen(false)}>Hesap</Link><button type="button" onClick={signOut}>Çıkış yap</button></nav>}
  </div>;
}
