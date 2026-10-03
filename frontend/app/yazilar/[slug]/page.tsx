import type { Metadata } from "next";
import { isArticleSlug } from "../../../lib/articles/model";
import { notFound } from "next/navigation";
import { articles, findArticle } from "../../../lib/content";
import { ArticlePage } from "../../../components/builder/ArticlePage";

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = true;
export function generateStaticParams() { return articles.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = findArticle((await params).slug);
  return article ? { title: `${article.title} — SATIR.`, description: article.excerpt } : { title: "Yazı — SATIR." };
}
export default async function ArticleRoute({ params }: Props) {
  const article = findArticle((await params).slug);
  const slug = (await params).slug;
  if (!isArticleSlug(slug)) notFound();
  return <ArticlePage article={article} slug={slug} />;
}
