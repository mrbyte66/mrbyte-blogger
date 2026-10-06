"use client";
import { SitePageHeader } from "../SitePageHeader";
import { useAuth } from "../auth/AuthProvider";
import { useState } from "react";
import { useArticles } from "../../lib/articles/use-articles";
import { publicArticles } from "../../lib/editorial/store";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { themeAppearance } from "../../lib/builder/appearance";
import { ArticleCard } from "../ArticleCard";
import { SlideLink } from "../SlideLink";
import { useSavedLibrary } from "./SavedProvider";

export function SavedLibraryPage() {
  const { library, defaultId, member, ready, error, create, rename, deleteCategory, remove } = useSavedLibrary();
  const auth = useAuth();
  const { articles } = useArticles();
  const { workspace } = useWorkspace();
  const appearance = themeAppearance(workspace.applied);
  const [selected, setSelected] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("saved");
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const category = library.collections.find((item) => item.id === selected);
  const custom = category && !category.isDefault ? category : undefined;
  const available = publicArticles(articles);
  const articleMap = new Map(available.filter((article) => article.id).map((article) => [article.id!, article]));
  const search = query.trim().toLocaleLowerCase("tr");
  // Hidden (unavailable) records keep no metadata and never match a search.
  const items = library.entries.filter((entry) => {
    const article = entry.available ? articleMap.get(entry.articleId) : undefined;
    return (selected === "all" || entry.collectionId === selected) && (!search || (!!article && [article.title, article.excerpt, ...(article.categories ?? [article.category]), library.collections.find((c) => c.id === entry.collectionId)?.name].join(" ").toLocaleLowerCase("tr").includes(search)));
  }).sort((a, b) => {
    const left = articleMap.get(a.articleId); const right = articleMap.get(b.articleId);
    if (sort === "title") return (left?.title ?? "￿").localeCompare(right?.title ?? "￿", "tr");
    if (sort === "date") return (right?.publishedAt ?? "").localeCompare(left?.publishedAt ?? "");
    return a.savedAt.localeCompare(b.savedAt);
  });
  const count = (id: string) => library.entries.filter((entry) => entry.collectionId === id).length;
  async function act(task: () => Promise<boolean>, after: () => void) {
    setBusy(true);
    if (await task()) after();
    setBusy(false);
  }
  return <main className={`${appearance.className} saved-page`} style={appearance.style}>
    <SitePageHeader theme={workspace.applied} />
    <div className="saved-layout">
      <div className="saved-page-heading"><div><p className="eyebrow">KİŞİSEL KİTAPLIK</p><h1>Kitaplığım</h1><p>Tekrar dönmek istediğin satırlar, kendi düzeninde.</p></div><span className="member-preview-badge">Kişisel alan</span></div>
      {member && <details className="member-preview-info"><summary>Kitaplık hakkında</summary><p>Kitaplığın hesabında saklanır; giriş yaptığın her cihazda aynıdır. Kayıtların ve koleksiyon adların yalnız sana görünür. Yazılardaki kaydetme sayısı yalnız toplamı gösterir.</p></details>}
      {error && <p role="alert" className="saved-error">{error}</p>}
      {!member ? <section className="saved-empty"><h2>Kendine bir kitaplık kur.</h2><p>{auth.session ? "Kitaplığı kullanmak için e-posta adresini doğrula." : "Yazıları kaydet, kendi koleksiyonlarında düzenle. Kaydedilen yazılar ve koleksiyonlar kişisel kalacak."}</p>{!auth.session && <button type="button" onClick={() => auth.openAuth()}>Giriş yap</button>}</section> : !ready ? <p role="status">Kitaplık yükleniyor…</p> : <>
        <div className="saved-category-bar"><div className="saved-category-tabs" role="group" aria-label="Kaydedilen koleksiyonları"><button type="button" aria-pressed={selected === "all"} onClick={() => { setSelected("all"); setEditing(false); }}>Tümü <span>{library.entries.length}</span></button>{library.collections.map((item) => <button key={item.id} type="button" aria-pressed={selected === item.id} onClick={() => { setSelected(item.id); setEditing(false); }}>{item.name} <span>{count(item.id)}</span></button>)}</div><button type="button" className="saved-manage" aria-expanded={editing} onClick={() => { setName(custom?.name ?? ""); setEditing(!editing); }}>{custom ? "Koleksiyonu düzenle" : "+ Koleksiyon"}</button></div>
        <div className="library-tools"><label className="library-search"><span className="visually-hidden">Kitaplıkta ara</span><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input type="search" placeholder="Kitaplığında ara" value={query} onChange={event => setQuery(event.target.value)} /></label><label className="library-sort"><span className="visually-hidden">Sıralama</span><select value={sort} onChange={event => setSort(event.target.value)}><option value="saved">Kaydetme sırası</option><option value="date">Yayın tarihi · en yeni</option><option value="title">Başlık · A–Z</option></select></label><span className="library-result" role="status">{items.length} yazı</span></div>
        {editing && <form className="saved-category-form" onSubmit={(event) => { event.preventDefault(); void act(() => custom ? rename(custom.id, name) : create(name), () => { setName(""); setEditing(false); }); }}><label>Koleksiyon adı<input value={name} maxLength={60} placeholder="Örn. Kişisel gelişim" onChange={(event) => setName(event.target.value)} /></label><button type="submit" disabled={busy || !name.trim()}>Kaydet</button><button type="button" onClick={() => setEditing(false)}>Vazgeç</button>{custom && <button type="button" className="saved-remove" disabled={busy} onClick={() => void act(() => deleteCategory(custom.id), () => { setSelected(defaultId || "all"); setEditing(false); })}>Koleksiyonu kaldır</button>}<p>Koleksiyon kaldırıldığında yazılar varsayılan Genel’e taşınır.</p></form>}
        {!items.length ? <section className="saved-empty"><h2>{search ? "Aradığın satır henüz burada değil." : library.entries.length ? "Bu koleksiyon henüz boş." : "İlk satırını sakla."}</h2><p>{search ? "Başka bir kelime dene veya tüm koleksiyonlarına göz at." : "İlgini çeken yazıları biriktir, sonra kendi koleksiyonlarında kolayca bul."}</p>{search ? <button type="button" onClick={() => { setQuery(""); setSelected("all"); }}>Aramayı temizle</button> : <><ol className="library-empty-steps"><li><strong>Keşfet</strong><span>Okumaya değer bir yazı bul.</span></li><li><strong>Sakla</strong><span>Yer imi simgesine dokun.</span></li><li><strong>Düzenle</strong><span>İstersen bir koleksiyon seç.</span></li></ol><SlideLink href="/" direction="back">Yazıları keşfet ↗</SlideLink></>}</section> : <div className="saved-articles">{items.map((entry) => {
          const article = entry.available ? articleMap.get(entry.articleId) : undefined;
          return <div className="saved-item" key={entry.articleId}>{article ? <ArticleCard article={article} /> : <div className="saved-unavailable"><h2>Yazı şu anda erişilemiyor</h2><p>Yazı yayından kaldırılmış olabilir. Kaydını saklayabilir veya kaldırabilirsin.</p><button type="button" disabled={busy} onClick={() => void act(() => remove(entry.articleId), () => {})}>Kaydı kaldır</button></div>}</div>;
        })}</div>}
      </>}
    </div>
  </main>;
}
