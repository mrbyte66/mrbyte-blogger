"use client";

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
      {index === 2 && article.code && <CodeBlock code={article.code} />}
    </div>)}
    <div className="article-end"><span aria-hidden="true">✳</span><p>Şimdilik bu kadar.<br />Bir sonraki satırda görüşürüz.</p></div>
    {!fullPage && <a className="reading-permalink" href={`/yazilar/${article.slug}`}>Bu yazının kalıcı bağlantısını aç ↗</a>}
    <p className="sample-note">Bu metin, okuma deneyimini göstermek için hazırlanmış bir örnektir.</p>
  </article>;
}
