import type { Metadata } from "next";
import Link from "next/link";
import { getPublicSite,canonical } from "../../lib/api/public-server";
import { serverApi } from "../../lib/api/server";
import { articleFromApi,themeFromApi,type PublicArticle } from "../../lib/api/content";
import { SitePageHeader } from "../../components/SitePageHeader";
import { ArticleCard } from "../../components/ArticleCard";
import { themeAppearance } from "../../lib/builder/appearance";
export const dynamic="force-dynamic";
type Props={searchParams:Promise<{page?:string;q?:string;sort?:string;categoryId?:string}>};
export async function generateMetadata({searchParams}:Props):Promise<Metadata>{const [site,query]=await Promise.all([getPublicSite(),searchParams]);return {title:`Yazılar — ${site.siteName}`,alternates:{canonical:canonical(site,"/yazilar"+(query.page?`?page=${query.page}`:""))},robots:{index:site.indexingEnabled&&!query.q&&!query.categoryId&&!query.sort,follow:site.indexingEnabled}};}
export default async function Page({searchParams}:Props) {
 const [site,query]=await Promise.all([getPublicSite(),searchParams]);const page=Math.min(1000,Math.max(0,Math.floor(Number(query.page)||0)));const params=new URLSearchParams({page:String(page),size:"20",sort:["date_desc","date_asc","title_asc"].includes(query.sort ?? "")?query.sort!:"date_desc"});if(query.q)params.set("q",query.q.trim().slice(0,100));if(query.categoryId&&/^[0-9a-f-]{36}$/.test(query.categoryId))params.set("categoryId",query.categoryId);
 const response=await serverApi(`/articles?${params}`);if(!response.ok)throw new Error("Yazılar yüklenemedi.");const result=await response.json() as {items:PublicArticle[];totalPages:number};const theme=themeFromApi(site),appearance=themeAppearance(theme);
 const link=(p:number)=>{const next=new URLSearchParams(params);next.delete("size");next.set("page",String(p));return `/yazilar?${next}`;};
 return <main className={`${appearance.className} reading-page`} style={appearance.style}><SitePageHeader theme={theme}/><section className="reading-content"><h1>Yazılar</h1><form method="get"><label className="studio-field">Yazılarda ara<input type="search" name="q" defaultValue={query.q}/></label><label className="studio-field">Sıralama<select name="sort" defaultValue={params.get("sort")!}><option value="date_desc">En yeni</option><option value="date_asc">En eski</option><option value="title_asc">Başlık</option></select></label><button type="submit" className="studio-secondary">Uygula</button></form><div className="article-list">{result.items.map(article=><ArticleCard key={article.id} article={articleFromApi(article)}/>)}</div>{!result.items.length&&<p>Henüz yayınlanmış yazı yok.</p>}<nav aria-label="Yazı sayfaları">{page>0&&<Link href={link(page-1)}>← Önceki sayfa</Link>}{page+1<result.totalPages&&<Link href={link(page+1)}>Sonraki sayfa →</Link>}</nav></section></main>;
}
