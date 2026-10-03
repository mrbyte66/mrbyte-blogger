"use client";
import { useContentWorkspace } from "../editorial/use-content-workspace";
import { seriesValidationError, type BlogSeries } from "./model";
export { seriesKey } from "../editorial/store";
export function useSeriesWorkspace() {
  const { series, ready, error, mutate } = useContentWorkspace();
  function save(next: readonly BlogSeries[]) {
    return mutate((current) => {
      const invalid = seriesValidationError(next, current.articles.map((a) => a.slug));
      if (invalid) throw new Error(invalid);
      return { ...current, series: next };
    });
  }
  return { series, ready, error, save };
}
