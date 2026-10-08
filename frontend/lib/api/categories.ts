/** Category identity comes from the API; names are editable display labels. */
export type Category = { id: string; slug: string; name: string };
export type StudioCategory = Category & { position: number; version: number };
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
