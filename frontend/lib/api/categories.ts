/** Category identity comes from the API; names are editable display labels. */
import type { Schema } from "./contract";
export type Category = Schema<"Category">;
export type StudioCategory = Schema<"StudioCategory">;
export function categoryNames(ids: readonly string[], categories: readonly Category[]): string[] {
  return ids.map((id) => categories.find((c) => c.id === id)?.name ?? "Kategori bulunamadı");
}
export function categoryIds(names: readonly string[], categories: readonly Category[]): string[] {
  return names.map((name) => {
    const category = categories.find((c) => c.name === name);
    if (!category) throw new Error(`Kategori bulunamadı: ${name}. Kategorileri yeniden seç.`);
    return category.id;
  });
}
