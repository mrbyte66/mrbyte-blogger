"use client";
import { useState } from "react";
import { useArticles } from "../../lib/articles/use-articles";
import { publicArticles } from "../../lib/editorial/store";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { themeAppearance } from "../../lib/builder/appearance";
import { defaultCollectionId } from "../../lib/saved/model";
import { ArticleCard } from "../ArticleCard";
import { SlideLink } from "../SlideLink";
import { ThemeToggle } from "../SitePreferences";
import { useSavedLibrary } from "./SavedProvider";

export function SavedLibraryPage() {
  const { library, member, ready, error, setMember, create, rename, deleteCategory, remove } = useSavedLibrary();
  const { articles } = useArticles();
  const { workspace } = useWorkspace();
  const appearance = themeAppearance(workspace.applied);
  const [selected, setSelected] = useState("all");
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(false);
  const category = library.collections.find((item) => item.id === selected);
  const items = library.entries.filter((entry) => selected === "all" || entry.collectionId === selected);
  const available = publicArticles(articles);
  const count = (id: string) => library.entries.filter((entry) => entry.collectionId === id).length;
  return <main className={`${appearance.className} saved-page`} style={appearance.style}>
    <header className="saved-header"><SlideLink href="/" direction="back">{workspace.applied.siteName}.</SlideLink><div><ThemeToggle defaultDark={workspace.applied.surface === "night"} /><SlideLink href="/" direction="back">← Siteye dön</SlideLink></div></header>
    <div className="saved-layout">
      <div className="saved-page-heading"><div><p className="eyebrow">KİŞİSEL KİTAPLIK</p><h1>Kaydedilenler</h1><p>Tekrar dönmek istediğin satırlar, kendi düzeninde.</p></div><span className="member-preview-badge">Üye önizlemesi</span></div>
      <details className="member-preview-info"><summary>Önizleme hakkında</summary><p>Bu ekran gerçek giriş yerine üye görünümünü gösterir. Kayıtlar yalnız bu tarayıcıda tutulur. Hesaba özel saklama, cihazlar arası eşitleme ve tüm üyelerin kaydetme toplamı sunucu bağlantısıyla gelecek.</p><label><input type="checkbox" checked={member} onChange={(event) => setMember(event.target.checked)} />Üye görünümünü göster</label></details>
      {error && <p role="alert" className="saved-error">{error}</p>}
      {!member ? <section className="saved-empty"><h2>Kendine bir kitaplık kur.</h2><p>Üyeler yazıları kaydedip kendi kategorilerinde düzenleyebilecek. Kaydedilen yazılar ve kategoriler kişisel kalacak.</p><button type="button" onClick={() => setMember(true)}>Üye görünümünü incele</button></section> : !ready ? <p role="status">Kitaplık yükleniyor…</p> : <>
        <div className="saved-category-bar"><div className="saved-category-tabs" role="group" aria-label="Kaydedilen kategorileri"><button type="button" aria-pressed={selected === "all"} onClick={() => { setSelected("all"); setEditing(false); }}>Tümü <span>{library.entries.length}</span></button>{library.collections.map((item) => <button key={item.id} type="button" aria-pressed={selected === item.id} onClick={() => { setSelected(item.id); setEditing(false); }}>{item.name} <span>{count(item.id)}</span></button>)}</div><button type="button" className="saved-manage" aria-expanded={editing} onClick={() => { setName(category?.id !== defaultCollectionId ? category?.name ?? "" : ""); setEditing(!editing); }}>{category && category.id !== defaultCollectionId ? "Kategoriyi düzenle" : "+ Kategori"}</button></div>
        {editing && <form className="saved-category-form" onSubmit={(event) => { event.preventDefault(); const success = category && category.id !== defaultCollectionId ? rename(category.id, name) : create(name); if (success) { setName(""); setEditing(false); } }}><label>Kategori adı<input value={name} maxLength={60} placeholder="Örn. Kişisel gelişim" onChange={(event) => setName(event.target.value)} /></label><button type="submit" disabled={!name.trim()}>Kaydet</button><button type="button" onClick={() => setEditing(false)}>Vazgeç</button>{category && category.id !== defaultCollectionId && <button type="button" className="saved-remove" onClick={() => { if (deleteCategory(category.id)) { setSelected(defaultCollectionId); setEditing(false); } }}>Kategoriyi kaldır</button>}<p>Kategori kaldırıldığında yazılar varsayılan Kaydedilenler’e taşınır.</p></form>}
        {!items.length ? <section className="saved-empty"><h2>{library.entries.length ? "Bu kategori henüz boş." : "İlk satırını sakla."}</h2><p>Yazı kartındaki yer imi simgesine dokun. Kategori seçmezsen yazı Kaydedilenler’e eklenir.</p><SlideLink href="/" direction="back">Yazıları keşfet ↗</SlideLink></section> : <div className="saved-articles">{items.map((entry) => {
          const article = available.find((item) => item.slug === entry.slug);
          return <div className="saved-item" key={entry.slug}>{article ? <ArticleCard article={article} /> : <div className="saved-unavailable"><h2>Yazı şu anda erişilemiyor</h2><p>Yazı yayından kaldırılmış olabilir. Kaydını saklayabilir veya kaldırabilirsin.</p><button type="button" onClick={() => remove(entry.slug)}>Kaydı kaldır</button></div>}</div>;
        })}</div>}
      </>}
    </div>
  </main>;
}
