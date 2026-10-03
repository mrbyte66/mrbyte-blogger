import { isArticleSlug } from "../articles/model";

export const savedKey = "mrbyte:member-library:v1";
export const defaultCollectionId = "saved";
export type Collection = { id: string; name: string };
export type SavedLibrary = { version: 1; collections: Collection[]; entries: { slug: string; collectionId: string }[] };
export function emptyLibrary(): SavedLibrary { return { version: 1, collections: [{ id: defaultCollectionId, name: "Kaydedilenler" }], entries: [] }; }
export function parseLibrary(raw: string | null): SavedLibrary {
  if (raw === null) return emptyLibrary();
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== "object") throw new Error("Invalid library");
  const value = data as SavedLibrary;
  if (value.version !== 1 || !Array.isArray(value.collections) || !Array.isArray(value.entries) || value.collections.length < 1 || value.collections.length > 100 || value.entries.length > 1000) throw new Error("Invalid library");
  const ids = new Set<string>(); const names = new Set<string>(); const slugs = new Set<string>();
  for (const category of value.collections) {
    if (!category || typeof category.id !== "string" || !/^[a-zA-Z0-9-]{1,64}$/.test(category.id) || typeof category.name !== "string" || !category.name.trim() || category.name.length > 60 || ids.has(category.id) || names.has(category.name.trim().toLocaleLowerCase("tr"))) throw new Error("Invalid collection");
    ids.add(category.id); names.add(category.name.trim().toLocaleLowerCase("tr"));
  }
  if (value.collections[0].id !== defaultCollectionId || value.collections[0].name !== "Kaydedilenler") throw new Error("Missing default collection");
  for (const entry of value.entries) {
    if (!entry || !isArticleSlug(entry.slug) || !ids.has(entry.collectionId) || slugs.has(entry.slug)) throw new Error("Invalid saved article");
    slugs.add(entry.slug);
  }
  return { version: 1, collections: value.collections.map(({ id, name }) => ({ id, name })), entries: value.entries.map(({ slug, collectionId }) => ({ slug, collectionId })) };
}
export function saveArticle(library: SavedLibrary, slug: string, collectionId = defaultCollectionId): SavedLibrary {
  if (!isArticleSlug(slug) || !library.collections.some((collection) => collection.id === collectionId)) throw new Error("Geçersiz yazı veya kategori.");
  const existing = library.entries.some((entry) => entry.slug === slug);
  return { ...library, entries: existing ? library.entries.map((entry) => entry.slug === slug ? { ...entry, collectionId } : entry) : [...library.entries, { slug, collectionId }] };
}
export function createCollection(library: SavedLibrary, name: string, id: string): SavedLibrary {
  const clean = name.trim();
  if (!clean || clean.length > 60) throw new Error("Kategori adı 1–60 karakter olmalı.");
  if (library.collections.some((collection) => collection.name.toLocaleLowerCase("tr") === clean.toLocaleLowerCase("tr"))) throw new Error("Bu isimde bir kategori zaten var.");
  const next = { ...library, collections: [...library.collections, { id, name: clean }] };
  return parseLibrary(JSON.stringify(next));
}
export function deleteCollection(library: SavedLibrary, id: string): SavedLibrary {
  if (id === defaultCollectionId) throw new Error("Varsayılan kategori kaldırılamaz.");
  return { ...library, collections: library.collections.filter((collection) => collection.id !== id), entries: library.entries.map((entry) => entry.collectionId === id ? { ...entry, collectionId: defaultCollectionId } : entry) };
}
