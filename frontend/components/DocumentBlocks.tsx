"use client";
import type { Block } from "../lib/api/content";
export function DocumentBlocks({ blocks, editing=false }: { blocks: Block[];editing?:boolean }) {
  let paragraph=0;
  return <>{blocks.map(block => {
    const anchor = { "data-reading-anchor": block.id, "data-edit-field": editing ? (block.type==="paragraph"?`paragraph-${paragraph++}`:({image:"figure",code:"code",table:"table"}[block.type] ?? "body")) : `block-${block.id}` };
    switch(block.type) {
      case "paragraph": return <p key={block.id} {...anchor}>{block.text}</p>;
      case "heading": return block.level === 3 ? <h3 key={block.id} {...anchor}>{block.text}</h3> : <h2 key={block.id} {...anchor}>{block.text}</h2>;
      case "quote": return <figure key={block.id}><blockquote {...anchor}>{block.text}</blockquote>{block.attribution && <figcaption>{block.attribution}</figcaption>}</figure>;
      case "code": return <div className="code-block" key={block.id}><div className="code-toolbar"><span>{block.language?.toUpperCase()}</span><button type="button" onClick={() => void navigator.clipboard.writeText(block.text ?? "").catch(() => {})}>Kodu kopyala</button></div><pre><code {...anchor}>{block.text}</code></pre>{block.caption && <p>{block.caption}</p>}</div>;
      case "image": return <figure key={block.id}><img src={`/api/v1/media/${block.assetId}`} alt={block.alt ?? ""} loading="lazy" /><figcaption {...anchor}>{block.caption}</figcaption></figure>;
      case "table": return <div key={block.id} className="article-table-scroll" role="region" tabIndex={0} aria-label={block.caption || "Tablo"}><table><caption>{block.caption}</caption><thead><tr>{block.columns?.map((column,i) => <th scope="col" key={i}>{column}</th>)}</tr></thead><tbody {...anchor}>{block.rows?.map((row,i) => <tr key={i}>{row.map((cell,j) => <td key={j}>{cell}{j < row.length-1 && <span className="visually-hidden" aria-hidden="true">{"\t"}</span>}{j === row.length-1 && i < (block.rows?.length ?? 0)-1 && <span className="visually-hidden" aria-hidden="true">{"\n"}</span>}</td>)}</tr>)}</tbody></table></div>;
      default: return null;
    }
  })}</>;
}
