"use client";
import { useEffect } from "react";
import { SitePageHeader } from "../SitePageHeader";
import { useRouter } from "next/navigation";
import type { AuthScreen } from "../../lib/auth/model";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { themeAppearance } from "../../lib/builder/appearance";
import { AuthCard } from "./AuthCard";
import { useAuth } from "./AuthProvider";

/** Where the sign-in and sign-up pages send a signed-in visitor: after a password login, a Google return or a revisit. */
export const AUTH_PAGE_DESTINATION = "/kaydedilenler";

export function AuthPage({ initial = "login" }: { initial?: AuthScreen }) {
  const router = useRouter(); const { workspace } = useWorkspace(); const appearance = themeAppearance(workspace.applied);
  const { session, ready } = useAuth();
  const signedIn = ready && session !== null;
  useEffect(() => { if (signedIn) router.replace(AUTH_PAGE_DESTINATION); }, [signedIn, router]);
  return <main className={`${appearance.className} auth-page`} style={appearance.style}><SitePageHeader theme={workspace.applied} account={false} />{signedIn ? null : <AuthCard initial={initial} onComplete={() => router.replace(AUTH_PAGE_DESTINATION)} />}</main>;
}
