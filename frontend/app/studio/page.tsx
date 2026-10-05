import "./studio.css";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { StudioLogin } from "../../components/auth/StudioLogin";
import { SiteEditor } from "../../components/builder/SiteEditor";
import { StudioDataProvider } from "../../components/data/SiteData";
import { loadSession } from "../../lib/api/server";

export const metadata: Metadata = { title: "Studio", robots: { index: false, follow: false } };

/**
 * Server-side gate: the Spring session cookie is forwarded only to the fixed internal backend and
 * Studio renders only for the OWNER role. Every Studio API call is authorized again by the backend.
 */
export default async function Studio() {
  const session = await loadSession((await headers()).get("cookie"));
  if (!session.authenticated || session.profile?.role !== "owner") return <StudioLogin signedInAsMember={session.authenticated} />;
  return <StudioDataProvider><SiteEditor /></StudioDataProvider>;
}
