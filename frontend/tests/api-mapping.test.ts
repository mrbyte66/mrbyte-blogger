import { describe, expect, it } from "vitest";
import { DEFAULT_SERIES_PRESENTATION, seriesFromPublic, type SeriesSummaryDto } from "../lib/api/mapping";

const base: SeriesSummaryDto = { id: "40000000-0000-4000-8000-000000000001", slug: "seri", title: "Seri", summary: "Özet", ongoing: true, chapterCount: 0 };

describe("public series mapping (#30)", () => {
  it("tolerates a summary without chapters or presentation", () => {
    const series = seriesFromPublic(base);
    expect(series.articleSlugs).toEqual([]);
    expect(series.presentation).toEqual(DEFAULT_SERIES_PRESENTATION);
  });

  it("keeps chapter order and the given presentation", () => {
    const series = seriesFromPublic({ ...base, presentation: { heading: "center", chapterStyle: "rows" },
      chapters: [{ id: "a", slug: "birinci", title: "1" }, { id: "b", slug: "ikinci", title: "2" }] });
    expect(series.articleSlugs).toEqual(["birinci", "ikinci"]);
    expect(series.presentation).toEqual({ heading: "center", chapterStyle: "rows" });
  });
});
