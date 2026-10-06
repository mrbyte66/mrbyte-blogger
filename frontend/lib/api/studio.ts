import type { DocumentDraft } from "../builder/document-protocol";
export class PartialStudioSaveError extends Error {
 constructor(public draft:DocumentDraft, cause:unknown) { super(`İçerik kaydedildi, ancak sonraki işlem tamamlanamadı. ${cause instanceof Error ? cause.message : "Tekrar dene."}`); }
}
import { api } from "./client";
import type { Article } from "../content";
import type { BlogSeries } from "../series/model";
import type { ContentWorkspace } from "../editorial/store";
import type { Block } from "./content";

export type Category = { id: string; name: string; slug: string; version: number };
export type ArticleRecord = {
 id: string; version: number; slug: string; title: string; eyebrow: string; abstract: string;
 displayDate: string; createdAt: string; status: NonNullable<Article["status"]>; visibility: "public" | "private";
 scheduledAt: string | null; scheduleZone: string | null; revisionId: string;
 categoryIds: string[]; document: { schemaVersion: 1; blocks: Block[] }; presentation: NonNullable<Article["presentation"]>;
 seo: { title: string | null; description: string | null; indexable: boolean }; cover: { mode: "auto" | "manual" | "none"; assetId: string | null };
 seriesPlacement: { seriesId: string } | null;
};
export type SeriesRecord = {
 id: string; version: number; slug: string; title: string; summary: string; ongoing: boolean;
 status: BlogSeries["status"]; cover: ArticleRecord["cover"]; presentation: NonNullable<BlogSeries["presentation"]>;
 seo: ArticleRecord["seo"]; chapterIds: string[];
};
export function ownerArticle(value: ArticleRecord, categories: Category[]): Article {
 const names = value.categoryIds.map(id => categories.find(c => c.id === id)?.name).filter((n): n is string => !!n);
 const paragraphs = value.document.blocks.filter(b => b.type === "paragraph").map(b => b.text ?? "");
 const code = value.document.blocks.find(b => b.type === "code");
 const table = value.document.blocks.find(b => b.type === "table");
 const figure = value.document.blocks.find(b => b.type === "image");
 return { serverId:value.id, serverVersion:value.version, serverRecord:value, serverDocument:value.document, serverRevisionId:value.revisionId,
 slug:value.slug, title:value.title, eyebrow:value.eyebrow, excerpt:value.abstract, createdAt:value.createdAt, publishedAt:value.displayDate,
 status:value.status, visibility:value.visibility, scheduledAt:value.scheduledAt ? new Date(value.scheduledAt).toISOString():undefined,
 category:(names[0] ?? "Yazılım") as Article["category"], categories:names as Article["categories"], authored:true, minutes:Math.max(1,Math.ceil(value.document.blocks.filter(b=>["paragraph","heading","quote"].includes(b.type)).map(b=>b.text ?? "").join(" ").trim().split(/\s+/).length/200)),
 paragraphs:paragraphs.length ? paragraphs:[""], paragraphIds:value.document.blocks.filter(b=>b.type==="paragraph").map(b=>b.id),cover:value.cover,seo:value.seo,presentation:value.presentation,
 ...(code ? {code:code.text ?? ""}:{}), ...(table ? {table:{caption:table.caption ?? "",columns:table.columns ?? [],rows:table.rows ?? []}}:{}),
 ...(figure ? {figure:{src:`/api/v1/media/${figure.assetId}`,alt:figure.alt ?? "",caption:figure.caption ?? "",width:1200,height:800}}:{}) };
}
export function ownerSeries(value: SeriesRecord, articles: readonly Article[]): BlogSeries {
 return { id:value.id, serverVersion:value.version, serverRecord:value, slug:value.slug, title:value.title, summary:value.summary,
 status:value.status, ongoing:value.ongoing, presentation:value.presentation,
 cover:value.cover,seo:value.seo,coverImage:value.cover.assetId ? `/api/v1/media/${value.cover.assetId}`:undefined,
 articleSlugs:value.chapterIds.map(id => articles.find(a => a.serverId===id)?.slug).filter((s): s is string => !!s) };
}
async function pages<T>(path: string): Promise<T[]> {
 const items:T[]=[];for(let page=0;page<=1000;page++) { const result=await api<{items:T[];totalPages:number}>(`${path}?page=${page}&size=50`);items.push(...result.items);if(page+1>=result.totalPages)return items; }
 throw new Error("Liste çok büyük; filtreleyerek tekrar dene.");
}
export async function loadStudio():Promise<ContentWorkspace> {
 const [catalog,series,categories] = await Promise.all([pages<{id:string}>("/studio/articles"),pages<SeriesRecord>("/studio/series"),api<{items:Category[]}>("/studio/categories")]);
 // Bounded batches avoid exhausting server connection pools on a large catalog.
 const records:ArticleRecord[]=[];for(let i=0;i<catalog.length;i+=5)records.push(...await Promise.all(catalog.slice(i,i+5).map(item=>api<ArticleRecord>(`/studio/articles/${item.id}`))));
 const articles=records.map(record=>ownerArticle(record,categories.items));return {articles,series:series.map(record=>ownerSeries(record,articles))};
}
function asset(src: string | undefined) { if(!src)return null;const match=/^\/api\/v1\/media\/([0-9a-f-]{36})$/.exec(src);if(!match)throw new Error("Görseli önce Studio medya yükleme alanından yükle.");return match[1]; }
export function documentFor(article: Article) {
 const original=article.serverRecord?.document.blocks ?? [];
 const paragraphBlocks=original.filter(b=>b.type==="paragraph");
 const paragraphs=article.paragraphs.map((text,i)=>({id:article.paragraphIds?.[i] ?? paragraphBlocks[i]?.id ?? crypto.randomUUID(),type:"paragraph",text}));
 const code=original.find(b=>b.type==="code"),table=original.find(b=>b.type==="table"),image=original.find(b=>b.type==="image");
 const edited:Block[]=[...paragraphs];
 if(article.code!==undefined)edited.push({id:code?.id ?? crypto.randomUUID(),type:"code",text:article.code,language:code?.language ?? "plain",caption:code?.caption ?? ""});
 if(article.figure)edited.push({id:image?.id ?? crypto.randomUUID(),type:"image",assetId:asset(article.figure.src)!,alt:article.figure.alt,caption:article.figure.caption});
 if(article.table)edited.push({id:table?.id ?? crypto.randomUUID(),type:"table",caption:article.table.caption,columns:[...article.table.columns],rows:article.table.rows.map(r=>[...r])});
 // Keep unsupported editor block types and original order without silently discarding content.
 if(original.length) {let paragraph=0;const seen=new Set<string>();const result:Block[]=[];for(const b of original){if(b.type==="paragraph"){if(paragraph<paragraphs.length)result.push(paragraphs[paragraph]);paragraph++;}else if(["code","image","table"].includes(b.type)){const next=edited.find(e=>e.type===b.type);if(!seen.has(b.type)){if(next)result.push(next);seen.add(b.type);}else result.push(b);}else result.push(b);}
 result.push(...paragraphs.slice(paragraph));for(const b of edited.filter(b=>b.type!=="paragraph"))if(!original.some(o=>o.type===b.type))result.push(b);return {schemaVersion:1 as const,blocks:result}; }
 return {schemaVersion:1 as const,blocks:edited};
}
async function categoriesFor(article: Article) {
 const all=await api<{items:Category[]}>("/studio/categories");const selected:Category[]=[];
 for(const name of article.categories ?? [article.category]) {let category=all.items.find(c=>c.name===name);if(!category){category=await api<Category>("/studio/categories",{method:"POST",idempotencyKey:crypto.randomUUID(),body:{name,slug:name.toLocaleLowerCase("tr-TR").replaceAll("ı","i").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}});all.items.push(category);}selected.push(category);}
 return {all:all.items,ids:selected.map(c=>c.id)};
}
const actions:Record<string,string>={draft:"save-draft",published:"publish",scheduled:"schedule",archived:"archive",trashed:"trash"};
export async function saveStudioArticle(article: Article,current:ContentWorkspace,seriesId:string|null) {
 const categories=await categoriesFor(article);const old=article.serverRecord;
 const previous=old?.seriesPlacement?.seriesId;const versions=previous===seriesId || !previous&&!seriesId ? [] : [...new Set([previous,seriesId].filter((id):id is string=>!!id))].map(id=>{const s=current.series.find(s=>s.id===id);if(s?.serverVersion===undefined)throw new Error("Serinin güncel sürümü yüklenemedi.");return {id,version:s.serverVersion};});
 const body={title:article.title,slug:article.slug,eyebrow:article.eyebrow,abstract:article.excerpt,displayDate:article.publishedAt,categoryIds:categories.ids,
 document:documentFor(article),presentation:article.presentation ?? {width:"comfortable",heading:"left",showMeta:true},seo:article.seo ?? old?.seo ?? {title:null,description:null,indexable:true},cover:article.cover ?? old?.cover ?? {mode:"auto",assetId:null},
 seriesPlacement:seriesId?{seriesId}:null,seriesVersions:versions,visibility:old ? null : article.visibility ?? "public"};
 // Revoke public access before saving edits intended to be private.
 let base=old;
 if(old?.visibility==="public" && article.visibility==="private") base=await api<ArticleRecord>(`/studio/articles/${old.id}/actions`,{method:"POST",version:old.version,idempotencyKey:crypto.randomUUID(),body:{action:"make-private"}});
 let result:ArticleRecord;
 try {result=base ? await api<ArticleRecord>(`/studio/articles/${base.id}`,{method:"PUT",version:base.version,body}) : await api<ArticleRecord>("/studio/articles",{method:"POST",idempotencyKey:crypto.randomUUID(),body});}
 catch(cause){if(base && base!==old)throw new PartialStudioSaveError({kind:"article",article:ownerArticle(base,categories.all)},cause);throw cause;}
 const action=async(name:string,extra:object={})=>{result=await api<ArticleRecord>(`/studio/articles/${result.id}/actions`,{method:"POST",version:result.version,idempotencyKey:crypto.randomUUID(),body:{action:name,...extra}});};
 try {
 if(article.visibility && article.visibility!==result.visibility)await action(article.visibility==="private"?"make-private":"prepare-public");
 const target=article.status ?? "draft";
 if(["archived","trashed"].includes(result.status)&&target!==result.status)await action("restore");
 if(target!==result.status || target==="scheduled"&&article.scheduledAt!==result.scheduledAt)await action(actions[target],target==="scheduled"?{scheduledAt:article.scheduledAt,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone}:{});
 return ownerArticle(result,categories.all);
 } catch(cause) { throw new PartialStudioSaveError({kind:"article",article:ownerArticle(result,categories.all)},cause); }
}
export async function saveStudioSeries(series:BlogSeries,current:ContentWorkspace) {
 const chapterArticles=series.articleSlugs.map(slug=>{const article=current.articles.find(a=>a.slug===slug);if(!article?.serverId||article.serverVersion===undefined)throw new Error("Bölümün güncel sürümü yüklenemedi.");return article;});
 const old=series.serverRecord;const assetId=asset(series.coverImage);
 const body={title:series.title,slug:series.slug,summary:series.summary,ongoing:series.ongoing,cover:series.cover ?? (assetId?{mode:"manual",assetId}:old?.cover?.mode==="manual"?{mode:"none",assetId:null}:old?.cover ?? {mode:"auto",assetId:null}),presentation:series.presentation ?? {heading:"left",chapterStyle:"cards"},seo:series.seo ?? old?.seo ?? {title:null,description:null,indexable:true},chapterIds:chapterArticles.map(a=>a.serverId),articleVersions:[...new Set([...(old?.chapterIds ?? []),...chapterArticles.map(a=>a.serverId!)])].filter(id=>(old?.chapterIds.includes(id) ?? false)!==chapterArticles.some(a=>a.serverId===id)).map(id=>{const a=current.articles.find(a=>a.serverId===id);if(a?.serverVersion===undefined)throw new Error("Bölümün güncel sürümü yüklenemedi.");return {id,version:a.serverVersion};})};
 let result=old?await api<SeriesRecord>(`/studio/series/${series.id}`,{method:"PUT",version:old.version,body}):await api<SeriesRecord>("/studio/series",{method:"POST",idempotencyKey:crypto.randomUUID(),body});
 const action=async(name:string)=>{result=await api<SeriesRecord>(`/studio/series/${result.id}/actions`,{method:"POST",version:result.version,idempotencyKey:crypto.randomUUID(),body:{action:name}});};
 try {
 if(["archived","trashed"].includes(result.status)&&series.status!==result.status)await action("restore");
 if(series.status!==result.status)await action(actions[series.status]);return ownerSeries(result,current.articles);
 } catch(cause) { throw new PartialStudioSaveError({kind:"series",series:ownerSeries(result,current.articles)},cause); }
}
