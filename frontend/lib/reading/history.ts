
import type { Input, Output } from "../api/contract";
"use client";
import { useEffect, useState } from "react";
import { useAuth } from "../../components/auth/AuthProvider";
import { api } from "../api/http";
import type { Article } from "../content";

/**
 * Records a verified member's real permalink opening in their private history (API contract §5).
 * A visit means "opened", never "finished"; guests, previews and Studio record nothing.
 */
export function useMemberVisit(article: Article) {
  const { session } = useAuth();
  const member = !!session?.profile.verified;
  const { id, revisionId } = article;
  useEffect(() => {
    if (!member || !id || !revisionId) return;
    void api("POST", "/me/visits", { body: ({ eventId: crypto.randomUUID(), articleId: id, revisionId, visitedAt: new Date().toISOString() } satisfies Input<"recordVisit">) }).catch(() => {});
  }, [member, id, revisionId]);
}

export type SeriesVisit = NonNullable<Output<"seriesHistory">["items"]>[number];

/** The member's visits to the public chapters of one series (empty for guests). */
export function useSeriesHistory(seriesId: string | undefined): SeriesVisit[] {
  const { session } = useAuth();
  const member = !!session?.profile.verified;
  const [visits, setVisits] = useState<SeriesVisit[]>([]);
  useEffect(() => {
    setVisits([]);
    if (!member || !seriesId) return;
    let cancelled = false;
    api<Output<"seriesHistory">>("GET", `/me/series/${seriesId}/history`)
      .then(({ data }) => { if (!cancelled) setVisits(data.items ?? []); }, () => {});
    return () => { cancelled = true; };
  }, [member, seriesId]);
  return visits;
}
