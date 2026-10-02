import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { articles, findArticle } from "../../../lib/content";
import { ArticlePage } from "../../../components/builder/ArticlePage";

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export function generateStaticParams() { return articles.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = findArticle((await params).slug);
  return article ? { title: `${article.title} — SATIR.`, description: article.excerpt } : { title: "Yazı bulunamadı" };
}
export default async function ArticleRoute({ params }: Props) {
  const article = findArticle((await params).slug);
  if (!article) notFound();
  return <ArticlePage article={article} />;
}
