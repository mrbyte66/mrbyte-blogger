import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { isArticleSlug } from "../../../lib/articles/model";
import { ArticleRoute } from "../../../components/builder/ArticlePage";
import { articleFromPublic } from "../../../lib/api/mapping";
import { loadArticle, loadPublicContent, siteOrigin } from "../../../lib/api/server";
import { JsonLd } from "../../../components/JsonLd";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isArticleSlug(slug)) return {};
  const result = await loadArticle(slug);
  if (result.kind !== "found") return {};
  const article = result.value;
  const { site } = await loadPublicContent();
  const indexable = site.indexingEnabled && article.seo?.indexable !== false;
  const description = article.seo?.description ?? (article.abstract || undefined);
  const url = `${siteOrigin()}/yazilar/${article.slug}`;
  return {
    title: article.seo?.title ?? article.title,
    description,
    alternates: { canonical: url },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      type: "article", url, title: article.title, description,
      publishedTime: article.firstPublishedAt ?? undefined, modifiedTime: article.publicModifiedAt ?? undefined,
      ...(article.cover ? { images: [{ url: article.cover.url, width: article.cover.width, height: article.cover.height }] } : {}),
    },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  if (!isArticleSlug(slug)) notFound();
  const result = await loadArticle(slug);
  if (result.kind === "redirect") permanentRedirect(result.path);
  if (result.kind === "missing") notFound();
  const dto = result.value;
  const { site } = await loadPublicContent();
  const url = `${siteOrigin()}/yazilar/${dto.slug}`;
  return <>
    <JsonLd data={{
      "@context": "https://schema.org", "@type": "BlogPosting", headline: dto.title, description: dto.abstract || undefined,
      datePublished: dto.firstPublishedAt, dateModified: dto.publicModifiedAt ?? dto.firstPublishedAt, mainEntityOfPage: url, url,
      ...(dto.cover ? { image: `${siteOrigin()}${dto.cover.url}` } : {}),
      ...(site.authorPublicName ? { author: { "@type": "Person", name: site.authorPublicName } } : {}),
      ...(site.siteName ? { publisher: { "@type": "Organization", name: site.siteName } } : {}),
    }} />
    <ArticleRoute article={articleFromPublic(dto)} />
  </>;
}
