import type { Metadata } from "next";
import { getArticle, getPublicSite, canonical } from "../../../lib/api/public-server";
import { articleFromApi, themeFromApi } from "../../../lib/api/content";
import { ArticlePageView } from "../../../components/builder/ArticlePage";
type Props = { params: Promise<{ slug: string }> };
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [article, site] = await Promise.all([getArticle((await params).slug), getPublicSite()]);
  const title = article.seo?.title || article.title; const description = article.seo?.description || article.abstract;
  const url = canonical(site, `/yazilar/${article.slug}`); const index = site.indexingEnabled && article.seo?.indexable === true;
  return { title: `${title} — ${site.siteName}`, description, alternates: { canonical: url }, robots: { index, follow: index }, openGraph: { type: "article", title, description, url, ...(article.firstPublishedAt ? { publishedTime: article.firstPublishedAt } : {}), ...(article.publicModifiedAt ? { modifiedTime: article.publicModifiedAt } : {}) } };
}
export default async function ArticleRoute({ params }: Props) {
  const [article, site] = await Promise.all([getArticle((await params).slug), getPublicSite()]);
  const schema = { "@context": "https://schema.org", "@type": "BlogPosting", headline: article.title, description: article.abstract, url: canonical(site, `/yazilar/${article.slug}`), datePublished: article.firstPublishedAt, dateModified: article.publicModifiedAt, ...(site.authorPublicName ? { author: { "@type": "Person", name: site.authorPublicName } } : {}) };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} /><ArticlePageView article={articleFromApi(article)} theme={themeFromApi(site)} /></>;
}
