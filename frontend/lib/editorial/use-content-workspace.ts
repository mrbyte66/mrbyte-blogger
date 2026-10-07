"use client";
import { useContent } from "../../components/data/SiteData";

/** Content for the current surface: published (visitors) or all (Studio). Changes go through Studio operations. */
export function useContentWorkspace() {
  return useContent();
}
