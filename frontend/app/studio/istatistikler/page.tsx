import "../studio.css";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { StudioLogin } from "../../../components/auth/StudioLogin";
import { StudioInsights } from "../../../components/builder/StudioInsights";
import { loadSession } from "../../../lib/api/server";

export const metadata: Metadata = { title: "İstatistikler · Studio", robots: { index: false, follow: false } };

/** Same server-side OWNER gate as /studio; the backend authorizes every call again. */
export default async function StudioInsightsPage() {
  const session = await loadSession((await headers()).get("cookie"));
  if (!session.authenticated || session.profile?.role !== "owner") return <StudioLogin signedInAsMember={session.authenticated} />;
  return <StudioInsights />;
}
