"use client";

import { useEffect } from "react";
import { useEngagement } from "../../components/engagement/EngagementProvider";
import { useArticleRefs } from "./use-views";

/**
 * The visitor's own clap on one article (server state). A verified member claps as their account;
 * everyone else as a random anonymous browser identity. Anonymous claps are not merged on sign-in.
 */
export function useClap(slug: string, enabled = true) {
  const { claps, loadClap, toggleClap } = useEngagement();
  const [ref] = useArticleRefs([slug]);
  const id = ref?.id;
  useEffect(() => { if (id && enabled) loadClap(id); }, [id, enabled, loadClap]);
  const entry = id ? claps[id] : undefined;
  return {
    ready: !!id && entry?.clapped !== null && entry?.clapped !== undefined,
    clapped: entry?.clapped ?? false,
    pending: entry?.pending ?? false,
    error: entry?.error ?? "",
    toggle: () => { if (id && enabled) toggleClap(id); },
  };
}
