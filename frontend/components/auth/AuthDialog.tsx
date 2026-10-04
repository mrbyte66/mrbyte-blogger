"use client";
import { useEffect, useRef } from "react";
import type { AuthScreen } from "../../lib/auth/model";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { themeAppearance } from "../../lib/builder/appearance";
import { AuthCard } from "./AuthCard";
import { AuthIcon } from "./AuthIcon";
import { useAuth } from "./AuthProvider";
export function AuthDialog({ screen }: { screen: AuthScreen | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { closeAuth } = useAuth();
  const { workspace } = useWorkspace();
  const appearance = themeAppearance(workspace.applied);
  useEffect(() => {
    const element = dialog.current;
    if (screen && !element?.open) element?.showModal();
    if (!screen && element?.open) element.close();
  }, [screen]);
  return <dialog ref={dialog} className={`${appearance.className} auth-dialog`} style={appearance.style} aria-label="Hesap erişimi" onCancel={closeAuth} onClose={closeAuth} onClick={event => { if (event.target === event.currentTarget) closeAuth(); }}>
    <button className="auth-dialog-close" type="button" aria-label="Giriş penceresini kapat" onClick={closeAuth}><AuthIcon kind="close" /></button>
    {screen && <AuthCard key={screen} initial={screen} onComplete={closeAuth} />}
  </dialog>;
}
