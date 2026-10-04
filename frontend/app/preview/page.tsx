import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { studioCookie, validStudioSession } from "../../lib/auth/studio-session";
import { DraftPreview } from "../../components/builder/ThemeRenderer";
export default async function Preview({ searchParams }: { searchParams: Promise<{ embedded?: string }> }) {
  if (!validStudioSession((await cookies()).get(studioCookie)?.value)) redirect("/studio");
  const { embedded } = await searchParams;
  return <DraftPreview embedded={embedded === "1"} />;
}
