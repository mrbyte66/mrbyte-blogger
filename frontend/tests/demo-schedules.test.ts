import { afterEach, expect, it, vi } from "vitest";
import { addDemoSchedules } from "../lib/editorial/demo-schedules";
import { initialContent, publicArticles, validateContent } from "../lib/editorial/store";
afterEach(() => vi.useRealTimers());
it("adds three editable future plans without changing public content or duplicating them", () => {
  vi.useFakeTimers(); const now = new Date("2026-10-05T12:00:00.000Z"); vi.setSystemTime(now);
  const next = addDemoSchedules(initialContent, now);
  expect(next.articles.length).toBe(initialContent.articles.length + 3);
  const planned = next.articles.filter(a => a.status === "scheduled");
  expect(planned.map(a => a.scheduledAt).sort()).toEqual(["2026-10-06T12:00:00.000Z", "2026-10-08T12:00:00.000Z", "2026-10-12T12:00:00.000Z"]);
  expect(validateContent(next)).not.toBeNull();
  expect(publicArticles(next.articles)).toEqual(publicArticles(initialContent.articles));
  const edited = {...next, articles:next.articles.map(a => a.slug === "demo-yayin-plani-1" ? {...a,title:"Benim düzenlemem",status:"draft" as const,scheduledAt:undefined} : a)};
  expect(addDemoSchedules(edited, now)).toEqual(edited);
  expect(initialContent.articles.some(a => a.slug.startsWith("demo-yayin-plani-"))).toBe(false);
});
