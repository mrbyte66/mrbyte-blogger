"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { api, describe } from "../../lib/api/http";
import type { ArticleStats } from "../../lib/content";
import { useAuth } from "../auth/AuthProvider";

/**
 * Shared server totals and the visitor's own claps (API contract §6). Counts come from the server;
 * this context only keeps fresher values returned by the visitor's own actions. Views are sent as
 * events: a card when 20% of it is visible, a permalink when it opens — once per page view.
 * The side-panel reader, Studio and previews never send events.
 */
type ClapEntry = { clapped: boolean | null; pending: boolean; error: string };
type EngagementContext = {
  overrides: Readonly<Record<string, Partial<ArticleStats>>>;
  claps: Readonly<Record<string, ClapEntry>>;
  loadClap: (articleId: string) => void;
  toggleClap: (articleId: string) => void;
  recordView: (articleId: string, source: "card" | "permalink") => void;
  refreshStats: (articleId: string) => void;
};
const noop = () => {};
const Context = createContext<EngagementContext>({ overrides: {}, claps: {}, loadClap: noop, toggleClap: noop, recordView: noop, refreshStats: noop });
export const useEngagement = () => useContext(Context);

export function EngagementProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { session } = useAuth();
  const userId = session?.profile.id ?? null;
  const [overrides, setOverrides] = useState<Record<string, Partial<ArticleStats>>>({});
  const [claps, setClaps] = useState<Record<string, ClapEntry>>({});
  // A new route is a new page view: the same card seen again on another page counts again.
  const pageViewId = useMemo(() => crypto.randomUUID(), [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  const sent = useRef(new Set<string>());
  const queues = useRef(new Map<string, Promise<unknown>>());
  const latest = useRef(claps);
  latest.current = claps;

  // Private state belongs to one account: clear it when the signed-in account changes.
  useEffect(() => { setClaps({}); queues.current.clear(); }, [userId]);

  const merge = useCallback((articleId: string, patch: Partial<ArticleStats>) => {
    setOverrides((current) => ({ ...current, [articleId]: { ...current[articleId], ...patch } }));
  }, []);
  const setClap = useCallback((articleId: string, patch: Partial<ClapEntry>) => {
    setClaps((current) => ({ ...current, [articleId]: { ...(current[articleId] ?? { clapped: null, pending: false, error: "" }), ...patch } }));
  }, []);
  /** Mutations per article run one after another, so an older response never overwrites a newer choice. */
  const enqueue = useCallback((articleId: string, task: () => Promise<void>) => {
    const next = (queues.current.get(articleId) ?? Promise.resolve()).then(task, task);
    queues.current.set(articleId, next);
  }, []);

  const loadClap = useCallback((articleId: string) => {
    if (latest.current[articleId]) return;
    setClap(articleId, {});
    enqueue(articleId, async () => {
      try { setClap(articleId, { clapped: (await api<{ clapped: boolean }>("GET", `/articles/${articleId}/my-clap`)).data.clapped }); }
      catch { setClap(articleId, { clapped: false }); }
    });
  }, [enqueue, setClap]);

  const toggleClap = useCallback((articleId: string) => {
    const target = !(latest.current[articleId]?.clapped ?? false);
    setClap(articleId, { clapped: target, pending: true, error: "" });
    enqueue(articleId, async () => {
      try {
        const { data } = await api<{ clapped: boolean; claps: number }>("PUT", `/articles/${articleId}/clap`, { body: { clapped: target } });
        setClap(articleId, { clapped: data.clapped, pending: false });
        merge(articleId, { claps: data.claps });
      } catch (cause) {
        setClap(articleId, { clapped: !target, pending: false, error: describe(cause) });
      }
    });
  }, [enqueue, merge, setClap]);

  const refreshStats = useCallback((articleId: string) => {
    void api<ArticleStats>("GET", `/articles/${articleId}/stats`).then(({ data }) => merge(articleId, data), noop);
  }, [merge]);

  const recordView = useCallback((articleId: string, source: "card" | "permalink") => {
    const key = `${pageViewId}:${source}:${articleId}`;
    if (sent.current.has(key)) return;
    sent.current.add(key);
    const body = { eventId: crypto.randomUUID(), articleId, source, pageViewId, occurredAt: new Date().toISOString() };
    const send = (attempt: number): Promise<void> => api<{ views: number }>("POST", "/impressions", { body })
      .then(({ data }) => merge(articleId, { views: data.views }))
      // A network failure is retried once with the same event ID; the server never counts it twice.
      .catch((error: { status?: number }) => { if (attempt === 0 && error?.status === 0) return send(1); });
    void send(0);
  }, [pageViewId, merge]);

  const value = useMemo(() => ({ overrides, claps, loadClap, toggleClap, recordView, refreshStats }), [overrides, claps, loadClap, toggleClap, recordView, refreshStats]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
