import { api } from "./client";
import type { Article } from "../content";
export type Stats = { views: number; claps: number; saves: number };
const stats = new Map<string, Stats>(); const ids = new Map<string, string>();
const pending = new Map<string, Promise<string>>(); const listeners = new Set<() => void>();
let engagementExpires=0;
let actorIdentity: string | undefined; let pagePath: string | undefined;
let revision = 0; let engagement: Promise<unknown> | undefined; let pageViewId: string | undefined;
export function seedReactions(articles: readonly Article[]) { for(const article of articles) if(article.serverId) { ids.set(article.slug,article.serverId);if(!stats.has(article.slug)&&article.serverStats)stats.set(article.slug,article.serverStats); } }
export function subscribe(listener: () => void) { listeners.add(listener);return () => { listeners.delete(listener); }; }
export function snapshot() { return revision; }
export function totals() { return Object.fromEntries(stats); }
export function current(slug: string): Stats { return stats.get(slug) ?? { views: 0, claps: 0, saves: 0 }; }
export function update(slug: string, patch: Partial<Stats>) { stats.set(slug,{ ...current(slug), ...patch });revision++;listeners.forEach(fn => fn()); }
export async function resolveArticle(slug: string) {
  const known = ids.get(slug);if(known)return known;
  if(!pending.has(slug)) pending.set(slug, api<{ id: string; stats: Stats }>(`/articles/by-slug/${encodeURIComponent(slug)}`).then(article => {ids.set(slug,article.id);update(slug,article.stats);return article.id;}).finally(() => pending.delete(slug)));
  return pending.get(slug)!;
}
export async function ensureEngagement() { if(Date.now()>=engagementExpires) engagement=undefined;engagement ??= api("/engagement/session", { method: "POST" }).catch(error => { engagement=undefined;throw error; });await engagement;engagementExpires=Date.now()+60_000; }
export function resetEngagement(identity: string) { if(identity !== actorIdentity) { actorIdentity=identity; engagement=undefined;engagementExpires=0; } }
export async function recordImpression(slug: string, source: "card" | "permalink") {
  const id=await resolveArticle(slug);await ensureEngagement();if(pagePath !== window.location.pathname) { pagePath=window.location.pathname;pageViewId=crypto.randomUUID(); }pageViewId ??= crypto.randomUUID();
  const data=await api<{ views: number }>("/impressions", { method: "POST", body: { eventId: crypto.randomUUID(), articleId: id, source, pageViewId, occurredAt: new Date().toISOString() } });update(slug,{ views: data.views });
}
