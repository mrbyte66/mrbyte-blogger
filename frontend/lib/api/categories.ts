import type { Topic } from "../content";

/**
 * The three initial topics are seeded by the backend migration with fixed IDs (V4__editorial.sql).
 * The current editor offers exactly these topics, so the mapping is static.
 */
export const topicIds: Record<Exclude<Topic, "Tümü">, string> = {
  "Yazılım": "7f1c2a6e-1b6f-4f0e-9a51-0c3e8d2b1a01",
  "Edebiyat": "7f1c2a6e-1b6f-4f0e-9a51-0c3e8d2b1a02",
  "Kültür": "7f1c2a6e-1b6f-4f0e-9a51-0c3e8d2b1a03",
};
export function topicOfId(id: string | null | undefined): Exclude<Topic, "Tümü"> | null {
  const entry = Object.entries(topicIds).find(([, value]) => value === id);
  return entry ? entry[0] as Exclude<Topic, "Tümü"> : null;
}
