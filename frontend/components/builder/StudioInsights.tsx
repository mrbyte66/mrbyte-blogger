"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, describe } from "../../lib/api/http";
import { StudioHeader } from "./StudioHeader";

type Page<T> = { items: T[]; page: number; totalPages: number; totalElements: number };
type ArticleStatsRow = { articleId: string; title: string; views: number; claps: number; saves: number };
type MemberRow = { id: string; name: string | null; email: string; status: string; createdAt: string };
const statusLabels: Record<string, string> = { active: "Etkin", pending: "Doğrulama bekliyor" };
const formatDate = (value: string) => new Date(value).toLocaleDateString("tr-TR", { dateStyle: "medium" });

function usePage<T>(path: (page: number) => string) {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page<T> | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try { setData((await api<Page<T>>("GET", path(page))).data); setError(""); }
    catch (cause) { setError(describe(cause)); }
  }, [path, page]);
  useEffect(() => { void load(); }, [load]);
  return { page, setPage, data, error };
}

function Pager({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return <div className="insights-pager"><button type="button" className="studio-secondary" disabled={page === 0} onClick={() => onChange(page - 1)}>← Önceki</button><span>{page + 1} / {totalPages}</span><button type="button" className="studio-secondary" disabled={page + 1 >= totalPages} onClick={() => onChange(page + 1)}>Sonraki →</button></div>;
}

/**
 * Owner's read-only totals per article and the limited member list (API contract §8). No reading
 * time, device breakdown, per-reader history, libraries or notes are collected or shown.
 */
export function StudioInsights() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const statsPath = useCallback((page: number) => `/studio/article-stats?page=${page}&size=20`, []);
  const membersPath = useCallback((page: number) => `/studio/members?page=${page}&size=20${search ? `&q=${encodeURIComponent(search)}` : ""}`, [search]);
  const stats = usePage<ArticleStatsRow>(statsPath);
  const members = usePage<MemberRow>(membersPath);
  return <div className="studio insights-studio">
    <StudioHeader navigation={<Link className="studio-text-link" href="/studio">← Studio’ya dön</Link>} actions={null} status={<span className="studio-state">İstatistikler</span>} />
    <main className="insights-layout">
      <section aria-labelledby="insights-articles">
        <h1 id="insights-articles">Yazı istatistikleri</h1>
        <p className="insights-note">Görüntülenme: görünür kart ve kalıcı sayfa açılışları (tekil okur değil). Alkış ve kaydetme: etkin toplamlar.</p>
        {stats.error && <p role="alert">{stats.error}</p>}
        {!stats.data ? <p role="status">Yükleniyor…</p> : !stats.data.items.length ? <p>Henüz yazı yok.</p> : <div className="insights-table" role="region" tabIndex={0} aria-label="Yazı istatistikleri tablosu"><table><thead><tr><th scope="col">Yazı</th><th scope="col">Görüntülenme</th><th scope="col">Alkış</th><th scope="col">Kaydetme</th></tr></thead><tbody>{stats.data.items.map((row) => <tr key={row.articleId}><th scope="row">{row.title || "Adsız yazı"}</th><td>{row.views}</td><td>{row.claps}</td><td>{row.saves}</td></tr>)}</tbody></table></div>}
        {stats.data && <Pager page={stats.page} totalPages={stats.data.totalPages} onChange={stats.setPage} />}
      </section>
      <section aria-labelledby="insights-members">
        <h2 id="insights-members">Üyeler</h2>
        <p className="insights-note">Yalnız hesap bilgileri listelenir. Üyelerin kitaplıkları, notları ve okuma geçmişleri burada görünmez.</p>
        <form className="insights-search" onSubmit={(event) => { event.preventDefault(); members.setPage(0); setSearch(query.trim()); }}><label>Üye ara<input type="search" maxLength={100} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ad veya e-posta" /></label><button type="submit" className="studio-secondary">Ara</button></form>
        {members.error && <p role="alert">{members.error}</p>}
        {!members.data ? <p role="status">Yükleniyor…</p> : !members.data.items.length ? <p>{search ? "Eşleşen üye yok." : "Henüz üye yok."}</p> : <div className="insights-table" role="region" tabIndex={0} aria-label="Üye listesi"><table><thead><tr><th scope="col">Ad</th><th scope="col">E-posta</th><th scope="col">Durum</th><th scope="col">Katılım</th></tr></thead><tbody>{members.data.items.map((row) => <tr key={row.id}><th scope="row">{row.name ?? "—"}</th><td>{row.email}</td><td>{statusLabels[row.status] ?? row.status}</td><td>{formatDate(row.createdAt)}</td></tr>)}</tbody></table></div>}
        {members.data && <Pager page={members.page} totalPages={members.data.totalPages} onChange={members.setPage} />}
      </section>
    </main>
  </div>;
}
