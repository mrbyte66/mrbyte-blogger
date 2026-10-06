import { redirect } from "next/navigation";
import { hasStudioAccess } from "../../lib/api/server";
import { DraftPreview } from "../../components/builder/ThemeRenderer";
export default async function Preview({ searchParams }: { searchParams: Promise<{ embedded?: string }> }) {
  if (!(await hasStudioAccess())) redirect("/studio");
  const { embedded } = await searchParams;
  return <DraftPreview embedded={embedded === "1"} />;
}
