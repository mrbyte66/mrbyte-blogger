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
  return <div className="code-block">
    <div className="code-toolbar"><span>JAVA</span><button onClick={copy}>{status === "copied" ? "Kopyalandı" : "Kodu kopyala"}</button></div>
    <pre><code>{code}</code></pre>
    <span className="copy-status" role="status">{status === "error" ? "Kopyalanamadı. Kodu seçerek kopyalayabilirsin." : ""}</span>
  </div>;
}

export function ArticleContent({ article, fullPage = false }: { article: Article; fullPage?: boolean }) {
  const Heading = fullPage ? "h1" : "h2";
  return <article className="article-view">
    <p className="eyebrow">{article.eyebrow}</p>
    <Heading id="panel-title">{article.title}</Heading>
    <div className="article-meta"><span>Örnek yazı</span><span>{article.minutes} dk okuma</span></div>
    <p className="article-lead" data-reading-anchor="excerpt">{article.excerpt}</p>
    {article.paragraphs.map((paragraph, index) => <div key={paragraph}>
      <p data-reading-anchor={`paragraph-${index}`}>{paragraph}</p>
      {index === 0 && article.figure && <figure><img src={article.figure.src} alt={article.figure.alt} width={article.figure.width} height={article.figure.height} loading="lazy" /><figcaption>{article.figure.caption}</figcaption></figure>}
      {index === 2 && article.code && <CodeBlock code={article.code} />}
      {index === 2 && article.table && <div className="article-table-scroll" role="region" tabIndex={0} aria-label={`${article.table.caption}. Dar ekranda yatay kaydırılabilir.`}><table><caption>{article.table.caption}</caption><thead><tr>{article.table.columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead><tbody>{article.table.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>}
    </div>)}
    <div className="article-end"><span aria-hidden="true">✳</span><p>Şimdilik bu kadar.<br />Bir sonraki satırda görüşürüz.</p></div>
    {!fullPage && <SlideLink className="reading-permalink" href={`/yazilar/${article.slug}`}>Bu yazının kalıcı bağlantısını aç ↗</SlideLink>}
    <p className="sample-note">Bu metin, okuma deneyimini göstermek için hazırlanmış bir örnektir.</p>
  </article>;
}
