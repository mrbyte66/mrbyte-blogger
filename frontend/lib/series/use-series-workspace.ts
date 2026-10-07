"use client";
import { useContent } from "../../components/data/SiteData";
export function useSeriesWorkspace() {
  const { series, ready, error } = useContent();
  return { series, ready, error };
}
