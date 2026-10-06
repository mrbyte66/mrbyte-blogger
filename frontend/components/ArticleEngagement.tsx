"use client";

import { useEffect, useRef, useState } from "react";
import { EngagementIcon } from "./EngagementIcon";
import { SaveArticleButton } from "./saved/SaveArticleButton";
import { ViewCount } from "./ViewCount";
import { useClap } from "../lib/reactions/use-claps";
import { useArticleStats } from "../lib/reactions/use-views";

export function ArticleEngagement({ slug, title, preview = false }: { slug: string; title: string; preview?: boolean }) {
  const clap = useClap(slug, !preview);
  const stats = useArticleStats([slug]);
  const [url, setUrl] = useState("");
  const [nativeShare, setNativeShare] = useState(false);
  const [message, setMessage] = useState("");
  const menu = useRef<HTMLDetailsElement>(null);
  const clapped = clap.clapped;
  useEffect(() => {
    setUrl(new URL(`/yazilar/${slug}`, window.location.origin).href);
    setNativeShare(typeof navigator.share === "function");
  }, [slug]);
  useEffect(() => {
    function dismiss(event: PointerEvent) { if (!menu.current?.contains(event.target as Node) && menu.current) menu.current.open = false; }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);
  async function copy() {
    try { await navigator.clipboard.writeText(url); setMessage("Bağlantı kopyalandı."); if (menu.current) menu.current.open = false; }
    catch { setMessage("Kopyalanamadı. Bağlantıyı aşağıdan seçip kopyalayabilirsin."); }
  }
  async function share() {
    try { await navigator.share({ title, url }); setMessage(""); if (menu.current) menu.current.open = false; }
    catch (cause) { if (!(cause instanceof Error && cause.name === "AbortError")) setMessage("Paylaşım açılamadı. Bağlantıyı kopyalayabilirsin."); }
  }
  return <section className="article-engagement" aria-label="Yazıya tepki ver ve paylaş">
    <div className="engagement-actions">
      <div className="engagement-views"><ViewCount slugs={[slug]} /><span>görüntülenme</span></div>
      <button type="button" className="clap-button" title="Hesapsız alkışlar bu tarayıcıya bağlıdır; giriş yaptığında hesabınla alkışlarsın." aria-pressed={clapped} aria-label={clapped ? "Alkışını geri al" : "Yazıyı alkışla"} disabled={preview || !clap.ready} onClick={clap.toggle}><EngagementIcon kind="clap" /><span>{clapped ? "Alkışladın" : "Alkışla"}</span><span className="clap-total" aria-live="polite">{stats ? stats.claps : "—"}</span></button>
      <SaveArticleButton slug={slug} title={title} preview={preview} />
      {preview ? <button type="button" className="share-preview" disabled>Paylaş <EngagementIcon kind="share" /></button> : <details ref={menu} className="article-share" onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); if (menu.current) { menu.current.open = false; menu.current.querySelector("summary")?.focus(); } } }}>
        <summary>Paylaş <EngagementIcon kind="share" /></summary>
        <div className="share-options">
          <button type="button" onClick={copy} disabled={!url}>Bağlantıyı kopyala</button>
          <a href={`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`} target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>
          <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>
          <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">X ↗</a>
          {nativeShare && <button type="button" onClick={share}>Diğer uygulamalar…</button>}
        </div>
      </details>}
    </div>
    {preview && <p className="engagement-note">Ziyaretçi tepkileri Studio’dan düzenlenemez.</p>}
    {clap.error && <p className="engagement-feedback" role="alert">{clap.error}</p>}
    {message && <p className="engagement-feedback" role="status">{message}{message.startsWith("Kopyalanamadı") && <input aria-label="Paylaşılacak bağlantı" readOnly value={url} onFocus={(event) => event.currentTarget.select()} />}</p>}
  </section>;
}
