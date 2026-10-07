/**
 * In-memory stand-in for the library, reading and engagement endpoints (API contract §5–6), with the
 * same observable rules: one bookmark per article, an immutable default collection, target-state
 * claps, per-page-view impressions and opaque records for hidden articles.
 */
type Collection = { id: string; name: string; isDefault: boolean; version: number };
type Bookmark = { articleId: string; collectionId: string; savedAt: string; version: number };
type Mark = { id: string; articleId: string; kind: string; revisionId: string; fragments: unknown[]; note: string; createdAt: string; version: number };
type Respond = (status: number, body?: unknown) => Promise<Response>;
type Problem = (status: number, code: string, title: string) => Promise<Response>;

/** One account's private data; another account never sees it. */
export type Personal = {
  collections: Collection[];
  bookmarks: Bookmark[];
  marks: Mark[];
  imports: Map<string, unknown>;
  visits: { articleId: string; revisionId: string }[];
  seriesHistory: Map<string, { articleId: string; lastVisitedAt: string }[]>;
};
export type MemberApiState = {
  /** Public articles: id → slug and totals. Removing an entry "hides" the article. */
  publicArticles: Map<string, { slug: string; stats: { views: number; claps: number; saves: number } }>;
  claps: Set<string>;
  impressions: { articleId: string; source: string; pageViewId: string; eventId: string }[];
  personal: Map<string, Personal>;
};

export function memberApiState(): MemberApiState {
  return { publicArticles: new Map(), claps: new Set(), impressions: [], personal: new Map() };
}
export function personalOf(state: MemberApiState, userId: string): Personal {
  let found = state.personal.get(userId);
  if (!found) { found = { collections: [], bookmarks: [], marks: [], imports: new Map(), visits: [], seriesHistory: new Map() }; state.personal.set(userId, found); }
  return found;
}

let counter = 0;
const nextId = () => `aaaaaaaa-0000-4000-8000-${String(++counter).padStart(12, "0")}`;
const lower = (value: string) => value.trim().toLocaleLowerCase("tr");

export function memberApi(shared: MemberApiState, method: string, path: string, body: Record<string, unknown> | undefined,
  headers: Record<string, string>, verifiedUserId: string | null, json: Respond, problem: Problem): Promise<Response> | null {
  const own = verifiedUserId ? personalOf(shared, verifiedUserId) : null;
  const state = { ...shared, ...(own ?? { collections: [] as Collection[], bookmarks: [] as Bookmark[], marks: [] as Mark[], imports: new Map<string, unknown>(), visits: [], seriesHistory: new Map<string, { articleId: string; lastVisitedAt: string }[]>() }) };
  const notFound = () => problem(404, "NOT_FOUND", "Bulunamadı");
  const ensureDefault = () => { if (own && !own.collections.some((c) => c.isDefault)) own.collections.unshift({ id: nextId(), name: "Genel", isDefault: true, version: 0 }); };
  const article = (id: string) => state.publicArticles.get(id);
  const summary = (id: string) => { const a = article(id); return a ? { id, slug: a.slug, title: a.slug, stats: a.stats } : undefined; };
  let match: RegExpExecArray | null;

  // ---- engagement (anonymous or member)
  if ((match = /^\/articles\/([^/]+)\/my-clap$/.exec(path)) && method === "GET") {
    return article(match[1]) ? json(200, { clapped: state.claps.has(match[1]) }) : notFound();
  }
  if ((match = /^\/articles\/([^/]+)\/clap$/.exec(path)) && method === "PUT") {
    const a = article(match[1]);
    if (!a) return notFound();
    const had = state.claps.has(match[1]);
    if (body?.clapped && !had) { state.claps.add(match[1]); a.stats.claps++; }
    if (!body?.clapped && had) { state.claps.delete(match[1]); a.stats.claps--; }
    return json(200, { clapped: !!body?.clapped, claps: a.stats.claps });
  }
  if ((match = /^\/articles\/([^/]+)\/stats$/.exec(path)) && method === "GET") {
    const a = article(match[1]);
    return a ? json(200, a.stats) : notFound();
  }
  if (path === "/impressions" && method === "POST") {
    const a = article(String(body?.articleId));
    if (!a) return notFound();
    const counted = !state.impressions.some((i) => i.articleId === body?.articleId && i.source === body?.source && i.pageViewId === body?.pageViewId);
    state.impressions.push({ articleId: String(body?.articleId), source: String(body?.source), pageViewId: String(body?.pageViewId), eventId: String(body?.eventId) });
    if (counted) a.stats.views++;
    return json(200, { accepted: true, counted, views: a.stats.views });
  }

  if (!path.startsWith("/me/")) return null;
  if (!own) return problem(401, "UNAUTHENTICATED", "Giriş yapman gerekiyor");

  // ---- library
  if (path === "/me/collections" && method === "GET") {
    ensureDefault();
    return json(200, { items: state.collections.map((c) => ({ ...c, count: state.bookmarks.filter((b) => b.collectionId === c.id).length })) });
  }
  if (path === "/me/collections" && method === "POST") {
    if (!headers["Idempotency-Key"]) return problem(428, "IDEMPOTENCY_KEY_REQUIRED", "İstek anahtarı gerekli");
    ensureDefault();
    const name = String(body?.name ?? "").trim();
    if (state.collections.some((c) => lower(c.name) === lower(name))) return problem(409, "DUPLICATE_COLLECTION", "Bu isimde bir koleksiyon zaten var");
    const created = { id: nextId(), name, isDefault: false, version: 0 };
    own.collections.push(created);
    return json(201, { ...created, count: 0 });
  }
  if ((match = /^\/me\/collections\/([^/]+)$/.exec(path))) {
    const found = state.collections.find((c) => c.id === match![1]);
    if (!found) return notFound();
    if (found.isDefault) return problem(409, "DEFAULT_COLLECTION", "Genel koleksiyonu değiştirilemez");
    if (headers["If-Match"] !== `"${found.version}"`) return problem(412, "STALE_VERSION", "Bu kayıt başka bir yerde değişti; yeniden yükle");
    if (method === "PATCH") { found.name = String(body?.name ?? "").trim(); found.version++; return json(200, { ...found, count: 0 }); }
    if (method === "DELETE") {
      const fallback = state.collections.find((c) => c.isDefault)!;
      state.bookmarks.forEach((b) => { if (b.collectionId === found.id) b.collectionId = fallback.id; });
      own.collections = own.collections.filter((c) => c !== found);
      return json(204);
    }
  }
  if (path === "/me/bookmarks" && method === "GET") {
    return json(200, { items: state.bookmarks.map((b) => ({ ...b, available: !!article(b.articleId), ...(article(b.articleId) ? { article: summary(b.articleId) } : {}) })), page: 0, size: 50, totalElements: state.bookmarks.length, totalPages: 1, sort: "saved_asc" });
  }
  if ((match = /^\/me\/bookmarks\/([^/]+)$/.exec(path))) {
    const articleId = match[1];
    const existing = state.bookmarks.find((b) => b.articleId === articleId);
    if (method === "DELETE") {
      if (existing && article(articleId)) article(articleId)!.stats.saves--;
      own.bookmarks = own.bookmarks.filter((b) => b.articleId !== articleId);
      return json(204);
    }
    if (method === "PUT") {
      ensureDefault();
      const collectionId = body?.collectionId as string | undefined;
      if (collectionId && !state.collections.some((c) => c.id === collectionId)) return notFound();
      if (!existing) {
        if (!article(articleId)) return notFound();
        const created = { articleId, collectionId: collectionId ?? state.collections.find((c) => c.isDefault)!.id, savedAt: new Date(Date.now() + state.bookmarks.length).toISOString(), version: 0 };
        own.bookmarks.push(created); article(articleId)!.stats.saves++;
        return json(200, created);
      }
      if (collectionId) { existing.collectionId = collectionId; existing.version++; }
      return json(200, existing);
    }
  }

  // ---- reading
  if ((match = /^\/me\/articles\/([^/]+)\/annotations$/.exec(path)) && method === "GET") {
    const own = state.marks.filter((m) => m.articleId === match![1]);
    if (!article(match[1])) return json(200, { articleId: match[1], available: false, items: own.map((m) => ({ id: m.id, available: false })) });
    return json(200, { articleId: match[1], revisionId: "rev-1", items: own });
  }
  if ((match = /^\/me\/articles\/([^/]+)\/annotations\/([^/]+)$/.exec(path))) {
    const [, articleId, markId] = match;
    const existing = state.marks.find((m) => m.id === markId);
    if (method === "DELETE") { if (!existing) return notFound(); own.marks = own.marks.filter((m) => m !== existing); return json(204); }
    if (method === "PUT") {
      if (!article(articleId)) return notFound();
      if (headers["If-None-Match"] === "*") {
        if (existing) return problem(412, "ALREADY_EXISTS", "Bu işaret zaten kayıtlı");
        const created = { id: markId, articleId, kind: String(body?.kind), revisionId: String(body?.revisionId), fragments: body?.fragments as unknown[], note: String(body?.note ?? ""), createdAt: new Date().toISOString(), version: 0 };
        own.marks.push(created);
        return json(201, created);
      }
      return problem(428, "VERSION_REQUIRED", "Sürüm bilgisi gerekli");
    }
  }
  if (path === "/me/imports/annotations" && method === "POST") {
    const key = String(body?.clientImportId);
    if (state.imports.has(key)) return json(200, state.imports.get(key));
    const items = (body?.items ?? []) as { articleId: string; kind: string; revisionId: string; fragments: unknown[]; note: string }[];
    const accepted: { index: number; id: string; articleId: string }[] = []; const rejected: { index: number; code: string }[] = [];
    items.forEach((item, index) => {
      if (!article(item.articleId)) { rejected.push({ index, code: "NOT_AVAILABLE" }); return; }
      const id = nextId();
      own.marks.push({ id, articleId: item.articleId, kind: item.kind, revisionId: item.revisionId, fragments: item.fragments, note: item.note, createdAt: new Date().toISOString(), version: 0 });
      accepted.push({ index, id, articleId: item.articleId });
    });
    const report = { clientImportId: key, accepted, rejected };
    own.imports.set(key, report);
    return json(200, report);
  }
  if (path === "/me/visits" && method === "POST") {
    if (!article(String(body?.articleId))) return notFound();
    own.visits.push({ articleId: String(body?.articleId), revisionId: String(body?.revisionId) });
    return json(204);
  }
  if ((match = /^\/me\/series\/([^/]+)\/history$/.exec(path)) && method === "GET") {
    return json(200, { items: state.seriesHistory.get(match[1]) ?? [] });
  }
  return null;
}
