"use client";
import { useContent } from "../../components/data/SiteData";
export function useArticles() {
  const { articles, ready, error } = useContent();
  return { articles, ready, error };
}
