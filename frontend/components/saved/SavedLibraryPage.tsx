"use client";
import { SitePageHeader } from "../SitePageHeader";
import { useAuth } from "../auth/AuthProvider";
import { useState } from "react";
import { useArticles } from "../../lib/articles/use-articles";
import { publicArticles } from "../../lib/editorial/store";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { themeAppearance } from "../../lib/builder/appearance";
import { defaultCollectionId } from "../../lib/saved/model";
import { ArticleCard } from "../ArticleCard";
import { SlideLink } from "../SlideLink";
import { useSavedLibrary } from "./SavedProvider";

export function SavedLibraryPage() {
  const { session } = useAuth();
  return <SavedLibraryView key={session ? `member:${session.profile.id}` : "guest"} />;
}

function SavedLibraryView() {
  const { library, member, ready, error, importLegacy, create, rename, deleteCategory, remove } = useSavedLibrary();
  const auth = useAuth();
  const { articles } = useArticles();
  const { workspace } = useWorkspace();
  const appearance = themeAppearance(workspace.applied);
  const [selected, setSelected] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("saved");
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(false);
  const category = library.collections.find((item) => item.id === selected);
  const available = publicArticles(articles);
  const articleMap = new Map(available.map(article => [article.slug, article]));
  const search = query.trim().toLocaleLowerCase("tr");
  const items = library.entries.filter(entry => {
    const article = articleMap.get(entry.slug);
    return (selected === "all" || entry.collectionId === selected) && (!search || [article?.title, article?.excerpt, ...(article?.categories ?? [article?.category]), library.collections.find(c => c.id === entry.collectionId)?.name].join(" ").toLocaleLowerCase("tr").includes(search));
  }).sort((a, b) => sort === "title" ? (articleMap.get(a.slug)?.title ?? a.slug).localeCompare(articleMap.get(b.slug)?.title ?? b.slug, "tr") : sort === "date" ? (articleMap.get(b.slug)?.publishedAt ?? "").localeCompare(articleMap.get(a.slug)?.publishedAt ?? "") : 0);
  const count = (id: string) => library.entries.filter((entry) => entry.collectionId === id).length;
  return <main className={`${appearance.className} saved-page`} style={appearance.style}>
    <SitePageHeader theme={workspace.applied} />
    <div className="saved-layout">
      <div className="saved-page-heading"><div><p className="eyebrow">KİŞİSEL KİTAPLIK</p><h1>Kitaplığım</h1><p>Tekrar dönmek istediğin satırlar, kendi düzeninde.</p></div><span className="member-preview-badge">{member ? "Demo kitaplık" : "Kişisel alan"}</span></div>
      {member && <details className="member-preview-info"><summary>Kitaplık hakkında</summary><p>Bu demo hesabın kitaplığı yalnız bu tarayıcıda tutulur. Hesap eşitlemesi ve ortak kaydetme toplamı backend bağlantısıyla gelecek.</p>{!library.entries.length && library.collections.length === 1 && <button type="button" onClick={() => { if (importLegacy()) auth.notify("Önizleme kayıtları içe aktarıldı"); }}>Eski önizleme kayıtlarını içe aktar</button>}</details>}
      {error && <p role="alert" className="saved-error">{error}</p>}
      {!member ? <section className="saved-empty"><h2>Kendine bir kitaplık kur.</h2><p>Yazıları kaydet, kendi koleksiyonlarında düzenle. Kaydedilen yazılar ve koleksiyonlar kişisel kalacak.</p><button type="button" onClick={() => auth.openAuth()}>Giriş yap</button></section> : !ready ? <p role="status">Kitaplık yükleniyor…</p> : <>
        <div className="saved-category-bar"><div className="saved-category-tabs" role="group" aria-label="Kaydedilen koleksiyonlari"><button type="button" aria-pressed={selected === "all"} onClick={() => { setSelected("all"); setEditing(false); }}>Tümü <span>{library.entries.length}</span></button>{library.collections.map((item) => <button key={item.id} type="button" aria-pressed={selected === item.id} onClick={() => { setSelected(item.id); setEditing(false); }}>{item.name} <span>{count(item.id)}</span></button>)}</div><button type="button" className="saved-manage" aria-expanded={editing} onClick={() => { setName(category?.id !== defaultCollectionId ? category?.name ?? "" : ""); setEditing(!editing); }}>{category && category.id !== defaultCollectionId ? "Koleksiyonu düzenle" : "+ Koleksiyon"}</button></div>
        <div className="library-tools"><label className="library-search"><span className="visually-hidden">Kitaplıkta ara</span><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input type="search" placeholder="Kitaplığında ara" value={query} onChange={event => setQuery(event.target.value)} /></label><label className="library-sort"><span className="visually-hidden">Sıralama</span><select value={sort} onChange={event => setSort(event.target.value)}><option value="saved">Kaydetme sırası</option><option value="date">Yayın tarihi · en yeni</option><option value="title">Başlık · A–Z</option></select></label><span className="library-result" role="status">{items.length} yazı</span></div>
        {editing && <form className="saved-category-form" onSubmit={(event) => { event.preventDefault(); const success = category && category.id !== defaultCollectionId ? rename(category.id, name) : create(name); if (success) { setName(""); setEditing(false); } }}><label>Koleksiyon adı<input value={name} maxLength={60} placeholder="Örn. Kişisel gelişim" onChange={(event) => setName(event.target.value)} /></label><button type="submit" disabled={!name.trim()}>Kaydet</button><button type="button" onClick={() => setEditing(false)}>Vazgeç</button>{category && category.id !== defaultCollectionId && <button type="button" className="saved-remove" onClick={() => { if (deleteCategory(category.id)) { setSelected(defaultCollectionId); setEditing(false); } }}>Koleksiyonu kaldır</button>}<p>Koleksiyon kaldırıldığında yazılar varsayılan Genel’e taşınır.</p></form>}
        {!items.length ? <section className="saved-empty"><h2>{search ? "Aradığın satır henüz burada değil." : library.entries.length ? "Bu koleksiyon henüz boş." : "İlk satırını sakla."}</h2><p>{search ? "Başka bir kelime dene veya tüm koleksiyonlarına göz at." : "İlgini çeken yazıları biriktir, sonra kendi koleksiyonlarında kolayca bul."}</p>{search ? <button type="button" onClick={() => { setQuery(""); setSelected("all"); }}>Aramayı temizle</button> : <><ol className="library-empty-steps"><li><strong>Keşfet</strong><span>Okumaya değer bir yazı bul.</span></li><li><strong>Sakla</strong><span>Yer imi simgesine dokun.</span></li><li><strong>Düzenle</strong><span>İstersen bir koleksiyon seç.</span></li></ol><SlideLink href="/" direction="back">Yazıları keşfet ↗</SlideLink></>}</section> : <div className="saved-articles">{items.map((entry) => {
          const article = articleMap.get(entry.slug);
          return <div className="saved-item" key={entry.slug}>{article ? <ArticleCard article={article} /> : <div className="saved-unavailable"><h2>Yazı şu anda erişilemiyor</h2><p>Yazı yayından kaldırılmış olabilir. Kaydını saklayabilir veya kaldırabilirsin.</p><button type="button" onClick={() => remove(entry.slug)}>Kaydı kaldır</button></div>}</div>;
        })}</div>}
      </>}
    </div>
  </main>;
}
