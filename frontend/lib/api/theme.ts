import { api } from "./client";
import type { Theme } from "../builder/model";
import type { Category } from "./studio";
type WireTheme = Omit<Theme,"blocks"> & {schemaVersion:1;blocks:Record<string,unknown>[]};
export type ThemeWorkspace = {version:number;draftRevisionId:string;appliedRevisionId:string;draft:WireTheme;applied:WireTheme};
export function themeToEditor(theme:WireTheme, articles:{id:string;slug:string}[],series:{id:string;slug:string}[],categories:Category[]):Theme {
 return {...theme,blocks:theme.blocks.map(b=>{
 if(b.kind==="scene") { const {featuredArticleId,featuredSeriesId,...rest}=b;return {...rest,featuredArticleSlug:articles.find(a=>a.id===featuredArticleId)?.slug ?? "",featuredSeriesSlug:series.find(s=>s.id===featuredSeriesId)?.slug ?? ""}; }
 if(b.kind==="articles") {const {categoryId,...rest}=b;return {...rest,category:categories.find(c=>c.id===categoryId)?.name ?? "Tümü"};}return b;
 })} as unknown as Theme;
}
async function catalog(path:string){const items:{id:string;slug:string}[]=[];for(let page=0;page<=1000;page++){const data=await api<{items:typeof items;totalPages:number}>(`${path}?page=${page}&size=50`);items.push(...data.items);if(page+1>=data.totalPages)return {items};}throw new Error("Tema bağları için içerik listesi sınırı aşıldı.");}
export async function themeToWire(theme:Theme):Promise<WireTheme> {
 const [articles,series,categories] = await Promise.all([catalog("/studio/articles"),catalog("/studio/series"),api<{items:Category[]}>("/studio/categories")]);
 return {...theme,schemaVersion:1,blocks:await Promise.all(theme.blocks.map(async b=>{
 if(b.kind==="scene") {
 const {featuredArticleSlug,featuredSeriesSlug,...rest}=b;
 const findArticle=async()=>{const known=articles.items.find(a=>a.slug===featuredArticleSlug);if(known)return known.id;if(!featuredArticleSlug)return null;const result=await api<{id:string}>(`/articles/by-slug/${encodeURIComponent(featuredArticleSlug)}`);return result.id;};
 const findSeries=async()=>{const known=series.items.find(s=>s.slug===featuredSeriesSlug);if(known)return known.id;if(!featuredSeriesSlug)return null;const result=await api<{id:string}>(`/series/by-slug/${encodeURIComponent(featuredSeriesSlug)}`);return result.id;};
 return {...rest,featuredArticleId:await findArticle(),featuredSeriesId:await findSeries()};}
 if(b.kind==="articles"){const {category,...rest}=b;const match=categories.items.find(c=>c.name===category);if(category!=="Tümü"&&!match)throw new Error("Kategori henüz oluşturulmamış. Önce yazının kategorisini kaydet.");return {...rest,categoryId:match?.id ?? null};}return {...b};
 }))};
}
export async function loadTheme() {
 const [workspace,articles,series,categories]=await Promise.all([api<ThemeWorkspace>("/studio/theme"),catalog("/studio/articles"),catalog("/studio/series"),api<{items:Category[]}>("/studio/categories")]);
 return {wire:workspace,editor:{version:1 as const,draft:themeToEditor(workspace.draft,articles.items,series.items,categories.items),applied:themeToEditor(workspace.applied,articles.items,series.items,categories.items)}};
}
