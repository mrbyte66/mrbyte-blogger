"use client";

import { SlideLink } from "./SlideLink";
import { useState } from "react";
import type { Article } from "../lib/content";

function CodeBlock({ code }: { code: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setStatus("copied");
    } catch { setStatus("error"); }
  }
  return <div className="code-block" data-edit-field="code">
    <div className="code-toolbar"><span>JAVA</span><button onClick={copy}>{status === "copied" ? "Kopyalandı" : "Kodu kopyala"}</button></div>
    <pre><code>{code}</code></pre>
    <span className="copy-status" role="status">{status === "error" ? "Kopyalanamadı. Kodu seçerek kopyalayabilirsin." : ""}</span>
  </div>;
}

export function ArticleContent({ article, fullPage = false }: { article: Article; fullPage?: boolean }) {
  const Heading = fullPage ? "h1" : "h2";
  return <article className={`article-view article-heading-${article.presentation?.heading ?? "left"}`} data-edit-field="body">
    <p className="eyebrow" data-edit-field="meta">{article.eyebrow}</p>
    <Heading id="panel-title" data-edit-field="title">{article.title}</Heading>
    {article.presentation?.showMeta !== false && <div className="article-meta" data-edit-field="meta"><span>{article.category}</span><span>{article.minutes} dk okuma</span></div>}
    <p className="article-lead" data-edit-field="excerpt" data-reading-anchor="excerpt">{article.excerpt}</p>
    {article.paragraphs.map((paragraph, index) => <div key={index}>
      <p data-edit-field={`paragraph-${index}`} data-reading-anchor={`paragraph-${index}`}>{paragraph}</p>
      {index === 0 && article.figure && <figure data-edit-field="figure"><img src={article.figure.src} alt={article.figure.alt} width={article.figure.width} height={article.figure.height} loading="lazy" /><figcaption>{article.figure.caption}</figcaption></figure>}
      {index === Math.min(2, article.paragraphs.length - 1) && article.code && <CodeBlock code={article.code} />}
      {index === Math.min(2, article.paragraphs.length - 1) && article.table && <div className="article-table-scroll" data-edit-field="table" role="region" tabIndex={0} aria-label={`${article.table.caption}. Dar ekranda yatay kaydırılabilir.`}><table><caption>{article.table.caption}</caption><thead><tr>{article.table.columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead><tbody>{article.table.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>}
    </div>)}
    {!article.authored && <div className="article-end"><span aria-hidden="true">✳</span><p>Şimdilik bu kadar.<br />Bir sonraki satırda görüşürüz.</p></div>}
    {!fullPage && <SlideLink className="reading-permalink" href={`/yazilar/${article.slug}`}>Bu yazının kalıcı bağlantısını aç ↗</SlideLink>}
    {!article.authored && <p className="sample-note">Bu metin, okuma deneyimini göstermek için hazırlanmış bir örnektir.</p>}
  </article>;
}
