import { DraftPreview } from "../../components/builder/ThemeRenderer";
export default async function Preview({ searchParams }: { searchParams: Promise<{ embedded?: string }> }) {
  const { embedded } = await searchParams;
  return <DraftPreview embedded={embedded === "1"} />;
}
