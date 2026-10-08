"use client";
import { useEffect, useId, useRef, useState } from "react";
import { ApiError, describe } from "../../lib/api/http";
import type { CoverCandidateDto, CoverJobDto } from "../../lib/api/mapping";
import { useContentWorkspace } from "../../lib/editorial/use-content-workspace";
import type { CoverResource } from "../data/SiteData";
import { ImageUpload } from "./ImageUpload";

type Search = { kind: "idle" } | { kind: "searching" } | { kind: "results"; job: CoverJobDto } | { kind: "error"; message: string };
type Credit = { photographer: string | null; photographerUrl?: string | null; sourceUrl: string; licenseUrl: string };

/** Only absolute HTTPS links are rendered as attribution links; anything else stays plain text. */
const safeLink = (url: string | null | undefined) => { try { return url && new URL(url).protocol === "https:" ? url : null; } catch { return null; } };
const MAX_QUERY = 100;

function searchError(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.code === "COVER_PROVIDER_UNAVAILABLE") return "Çevrimiçi kapak araması şu anda kullanılamıyor. Kendi görselini yükleyebilir veya kapağı boş bırakabilirsin.";
    if (cause.status === 429) return "Çok sık arama yapıldı. Biraz bekleyip yeniden dene.";
  }
  return `Kapak araması yapılamadı. ${describe(cause)}`;
}
function selectError(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.code === "COVER_DOWNLOAD_FAILED") return "Görsel indirilemedi. Yeniden dene veya başka bir sonuç seç.";
    if (cause.status === 404 || cause.status === 422) return "Bu sonuç artık geçerli değil. Aramayı yenileyip yeniden seç.";
  }
  return `Kapak seçilemedi. ${describe(cause)}`;
}

/** Photographer, source and license links. Kept outside the candidate's select button (no nested controls). */
function CoverCredit({ credit }: { credit: Credit }) {
  const photographer = credit.photographer?.trim() || "Bilinmeyen fotoğrafçı";
  const photographerUrl = safeLink(credit.photographerUrl);
  const sourceUrl = safeLink(credit.sourceUrl);
  const licenseUrl = safeLink(credit.licenseUrl);
  return <p className="cover-credit">
    Fotoğraf: {photographerUrl ? <a href={photographerUrl} target="_blank" rel="noopener noreferrer">{photographer}</a> : photographer}
    {sourceUrl && <> · <a href={sourceUrl} target="_blank" rel="noopener noreferrer">Kaynak</a></>}
    {licenseUrl && <> · <a href={licenseUrl} target="_blank" rel="noopener noreferrer">Lisans</a></>}
  </p>;
}

/**
 * Licensed online cover search for a saved article or series. Nothing is applied automatically:
 * a candidate becomes the cover only when the owner picks it, and late responses from an older
 * search or a selection overtaken by another cover change are ignored.
 */
export function CoverSearch({ resource, privateContent = false, suggestedQuery, current, onSelected }: {
  resource: CoverResource | null; privateContent?: boolean; suggestedQuery: string; current?: string; onSelected: (url: string) => void;
}) {
  const { studio } = useContentWorkspace();
  const [query, setQuery] = useState(() => privateContent ? "" : suggestedQuery.slice(0, MAX_QUERY));
  const [search, setSearch] = useState<Search>({ kind: "idle" });
  const [selecting, setSelecting] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [chosen, setChosen] = useState<{ url: string; credit: Credit } | null>(null);
  // Responses carry the generation they started in; anything older than the current one is dropped.
  // A new search supersedes both searches and selections; an outside cover change only pending selections.
  const generation = useRef({ search: 0, select: 0 });
  const expected = useRef(current);
  // A selection resolves later; apply it through the newest callback so concurrent field edits are kept.
  const apply = useRef(onSelected);
  useEffect(() => { apply.current = onSelected; });
  const inputId = useId();
  useEffect(() => {
    if (current !== expected.current) { generation.current.select++; expected.current = current; setSelecting(null); }
  }, [current]);
  useEffect(() => { const counters = generation.current; return () => { counters.search++; counters.select++; }; }, []);
  if (!studio) return null;
  if (!resource) return <p className="property-note">Çevrimiçi kapak aramak için önce sayfayı kaydet.</p>;

  const term = query.trim();
  async function run() {
    if (!studio || !resource || !term || term.length > MAX_QUERY) return;
    const mine = ++generation.current.search; generation.current.select++;
    setSearch({ kind: "searching" }); setSelecting(null); setNotice("");
    try {
      const job = await studio.searchCovers(resource, term);
      if (mine !== generation.current.search) return;
      setSearch(job.state === "failed"
        ? { kind: "error", message: "Kapak sağlayıcısı şu anda yanıt vermedi veya arama kotası doldu. Biraz sonra yeniden dene; mevcut kapağın değişmedi." }
        : { kind: "results", job });
    } catch (cause) {
      if (mine === generation.current.search) setSearch({ kind: "error", message: searchError(cause) });
    }
  }
  async function pick(job: CoverJobDto, candidate: CoverCandidateDto) {
    if (!studio || selecting) return;
    const mine = generation.current.select;
    setSelecting(candidate.candidateId); setNotice("");
    try {
      const stored = await studio.selectCover(job.id, candidate.candidateId);
      if (mine !== generation.current.select) return;
      expected.current = stored.url;
      setChosen({ url: stored.url, credit: candidate });
      setNotice("Kapak seçildi. Yayına yansıması için sayfayı kaydet.");
      apply.current(stored.url);
    } catch (cause) {
      if (mine === generation.current.select) setNotice(selectError(cause));
    } finally {
      if (mine === generation.current.select) setSelecting(null);
    }
  }

  const tooLong = term.length > MAX_QUERY;
  return <section className="cover-search" aria-label="Çevrimiçi kapak ara">
    <form className="cover-search-form" role="search" onSubmit={(event) => { event.preventDefault(); void run(); }}>
      <label className="cover-search-label" htmlFor={inputId}>Çevrimiçi kapak ara</label>
      <div className="cover-search-row">
        <input id={inputId} type="search" value={query} maxLength={MAX_QUERY + 20} placeholder="örn. sessiz kütüphane" onChange={(event) => setQuery(event.target.value)} aria-invalid={tooLong || undefined} />
        <button type="submit" className="studio-secondary" disabled={!term || tooLong || search.kind === "searching"}>{search.kind === "searching" ? "Aranıyor…" : "Ara"}</button>
      </div>
      {tooLong && <p className="studio-error">Arama en fazla {MAX_QUERY} karakter olabilir.</p>}
    </form>
    <p className="cover-search-hint">{privateContent ? "Özel yazının başlığı sağlayıcıya gönderilmez; yalnız buraya yazdığın kelimeler aranır." : "Yalnız buraya yazdığın kelimeler sağlayıcıya gönderilir."} Sonuçlar kullanım lisansı belli fotoğraflardır; seçtiğinde kaynağı ve atfı kapakla birlikte saklanır.</p>
    {chosen && chosen.url === current && <div className="cover-chosen"><strong>Seçilen kapağın kaynağı</strong><CoverCredit credit={chosen.credit} /></div>}
    <p role="status" className="cover-search-status">{search.kind === "searching" ? "Kapaklar aranıyor…" : notice}</p>
    {search.kind === "error" && <div className="cover-search-error" role="alert"><p>{search.message}</p><button type="button" className="studio-secondary" onClick={() => void run()} disabled={!term || tooLong}>Yeniden dene</button></div>}
    {search.kind === "results" && (search.job.candidates.length === 0
      ? <p className="cover-search-empty">Bu arama için uygun görsel bulunamadı. Farklı kelimeler dene; alakasız bir fotoğraf otomatik seçilmez.</p>
      : <>
        <p className="cover-provider">Fotoğraflar <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer">Pexels</a> tarafından sağlanır.</p>
        <ul className="cover-candidates" aria-label="Kapak sonuçları">
          {search.job.candidates.map((candidate) => {
            const busy = selecting === candidate.candidateId;
            const description = candidate.alt?.trim() || `${candidate.photographer?.trim() || "Bilinmeyen fotoğrafçı"} fotoğrafı`;
            return <li key={candidate.candidateId} className="cover-candidate">
              <button type="button" className="cover-candidate-pick" aria-label={`Kapak olarak seç: ${description}`} aria-busy={busy || undefined} disabled={!!selecting} onClick={() => void pick(search.job, candidate)}>
                <img src={candidate.thumbnailUrl} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                <span aria-hidden="true">{busy ? "Seçiliyor…" : "Seç"}</span>
              </button>
              <CoverCredit credit={candidate} />
            </li>;
          })}
        </ul>
      </>)}
  </section>;
}

/** Shared cover controls: preview, own upload, remove (falls back to the sample cover) and online search. */
export function CoverField({ cover, resource, privateContent, suggestedQuery, previewAlt, onChange }: {
  cover?: string; resource: CoverResource | null; privateContent?: boolean; suggestedQuery: string; previewAlt: string; onChange: (url: string | undefined) => void;
}) {
  return <>
    {cover && <figure className="inline-series-cover"><img src={cover} alt={previewAlt} /></figure>}
    <ImageUpload label={cover ? "Kapağı değiştir" : "Kapak görseli yükle"} onUploaded={onChange} />
    {cover && <button type="button" className="studio-remove" onClick={() => onChange(undefined)}>Kapağı kaldır</button>}
    <p className="property-note">JPEG veya PNG, en fazla 10 MiB. Kapak seçilmezse içeriğe uygun örnek kapak gösterilir; kapak hiçbir zaman sen seçmeden değişmez.</p>
    <CoverSearch key={resource?.id ?? "unsaved"} resource={resource} privateContent={privateContent} suggestedQuery={suggestedQuery} current={cover} onSelected={onChange} />
  </>;
}
