import type { BlogSeries } from "../../lib/series/model";
import { statusLabels } from "../../lib/editorial/store";

export function ArticleSeriesContext({ series, selectedId, creating, onSelect, onCreate }: { series: readonly BlogSeries[]; selectedId: string | null; creating: boolean; onSelect: (id: string | null) => void; onCreate: () => void }) {
  return <div className="article-series-context"><label><span>Yazının serisi</span><select aria-label="Yazının serisi" value={creating ? "new" : selectedId ?? "none"} onChange={(event) => { if (event.target.value === "new") onCreate(); else onSelect(event.target.value === "none" ? null : event.target.value); }}><option value="none">Bağımsız yazı</option><optgroup label="Mevcut seriler">{series.filter((s) => s.status !== "trashed").map((s) => <option key={s.id} value={s.id}>{s.title}{s.status === "published" ? "" : ` · ${statusLabels[s.status]}`}</option>)}</optgroup><option value="new">＋ Yeni seri oluştur</option></select></label><span>{creating ? "Seri bilgilerini tuvalin altında doldur." : selectedId ? "Bu yazı serinin bir bölümü olarak kaydedilir." : "Yazılar bölümünde tek başına yer alır."}</span></div>;
}
