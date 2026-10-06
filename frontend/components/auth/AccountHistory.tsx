"use client";
import { useCallback, useEffect, useState } from "react";
import { api, describe } from "../../lib/api/http";
import { SlideLink } from "../SlideLink";

type HistoryItem = { articleId: string; available: boolean; article?: { slug: string; title: string }; lastVisitedAt?: string };
const formatTime = (value: string) => new Date(value).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });

/**
 * The member's own automatic visit history (last opening, not completion). Only this account can
 * read or clear it; hidden writing appears without title or date.
 */
export function AccountHistory() {
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { setItems((await api<{ items: HistoryItem[] }>("GET", "/me/history?size=30")).data.items); setError(""); }
    catch (cause) { setError(describe(cause)); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function clear() {
    setBusy(true);
    try { await api("DELETE", "/me/history"); setItems([]); setError(""); }
    catch (cause) { setError(describe(cause)); }
    finally { setBusy(false); }
  }
  return <>
    <h2>Okuma geçmişi</h2>
    <p>Açtığın yazılar burada son açılış zamanıyla listelenir; bir yazıyı açmak onu bitirdiğin anlamına gelmez. Geçmişin yalnız sana görünür ve 180 gün sonra kendiliğinden silinir.</p>
    {error && <p role="alert" className="auth-field-error">{error}</p>}
    {!items ? <p role="status">Geçmiş yükleniyor…</p> : !items.length ? <p>Henüz açtığın bir yazı yok.</p> : <ol className="account-history">{items.map((item) => <li key={item.articleId}>
      {item.available && item.article ? <><SlideLink href={`/yazilar/${item.article.slug}`}>{item.article.title}</SlideLink>{item.lastVisitedAt && <small>{formatTime(item.lastVisitedAt)}</small>}</> : <span>Yazı şu anda erişilemiyor</span>}
    </li>)}</ol>}
    {!!items?.length && <button className="account-outline" type="button" disabled={busy} onClick={() => void clear()}>Okuma geçmişini temizle</button>}
  </>;
}
