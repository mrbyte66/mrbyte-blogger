import { createArticle } from "../articles/model";
import { localCalendarDate } from "../articles/metadata";
import { saveArticleRecord, type ContentWorkspace } from "./store";
/** Explicit, repeat-safe demo data: never replaces an author's existing writing. */
export function addDemoSchedules(current: ContentWorkspace, now = new Date()): ContentWorkspace {
  const titles = ["Demo · Yarın için bir satır", "Demo · Düşünmeye zaman ayırmak", "Demo · Gelecek haftanın notları"];
  return titles.reduce((workspace, title, index) => {
    const slug = `demo-yayin-plani-${index + 1}`;
    if (workspace.articles.some(article => article.slug === slug)) return workspace;
    const date = new Date(now.getTime() + [1, 3, 7][index] * 86400000);
    return saveArticleRecord(workspace, {
      ...createArticle(now), slug, title, status: "scheduled", scheduledAt: date.toISOString(), publishedAt: localCalendarDate(date),
      eyebrow: "DEMO YAYIN PLANI", excerpt: "Yayın planını denemek için hazırlanmış örnek yazı.",
      paragraphs: ["Bu örnek yazı yayın planını denemek için hazırlandı. Studio’dan metnini ve yayın zamanını değiştirebilir, planı iptal edebilir veya yazıyı çöp kutusuna taşıyabilirsin."]
    }, true);
  }, current);
}
