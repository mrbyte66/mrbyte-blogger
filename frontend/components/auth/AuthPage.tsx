"use client";
import { SitePageHeader } from "../SitePageHeader";
import { useRouter } from "next/navigation";
import type { AuthScreen } from "../../lib/auth/model";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { themeAppearance } from "../../lib/builder/appearance";
import { AuthCard } from "./AuthCard";
export function AuthPage({ initial = "login" }: { initial?: AuthScreen }) {
  const router = useRouter(); const { workspace } = useWorkspace(); const appearance = themeAppearance(workspace.applied);
  return <main className={`${appearance.className} auth-page`} style={appearance.style}><SitePageHeader theme={workspace.applied} account={false} /><AuthCard initial={initial} onComplete={() => router.push("/kaydedilenler")} /></main>;
}
