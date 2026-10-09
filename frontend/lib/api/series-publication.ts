import type { Input } from "./contract";
import { api } from "./http";
import type { SeriesEditDto } from "./mapping";

/** Membership edits bump the series version; read it after saving the chapter. */
export async function articlePublishAction(seriesId: string | null): Promise<Input<"studioArticleAction">> {
  if (!seriesId) return { action: "publish" };
  const { data } = await api<SeriesEditDto>("GET", `/studio/series/${seriesId}`);
  return data.status === "draft"
    ? { action: "publish", publishSeries: true, seriesVersion: data.version }
    : { action: "publish" };
}
