"use client";
import type { Article } from "../content";
import { saveArticleRecord } from "../editorial/store";
import { useContentWorkspace } from "../editorial/use-content-workspace";
export { articleStorageKey } from "../editorial/store";
export function useArticles() {
  const { articles, ready, error, mutate } = useContentWorkspace();
  function save(article: Article, creating = false, seriesId?: string | null) {
    return mutate((current) => saveArticleRecord(current, article, creating, seriesId));
  }
  return { articles, ready, error, save };
}
