import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DraftPreview } from "../../components/builder/ThemeRenderer";
import { StudioDataProvider } from "../../components/data/SiteData";
import { loadSession } from "../../lib/api/server";

export const metadata: Metadata = { title: "Taslak önizleme", robots: { index: false, follow: false } };

export default async function Preview({ searchParams }: { searchParams: Promise<{ embedded?: string }> }) {
  const session = await loadSession((await headers()).get("cookie"));
  if (!session.authenticated || session.profile?.role !== "owner") redirect("/studio");
  const { embedded } = await searchParams;
  return <StudioDataProvider><DraftPreview embedded={embedded === "1"} /></StudioDataProvider>;
}
