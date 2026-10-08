import { type Topic } from "../content";

export const blockKinds = ["header", "intro", "scene", "articles", "series", "quote", "about", "projects", "footer"] as const;
export type BlockKind = (typeof blockKinds)[number];
export type Accent = string;
export type Typography = "modern" | "editorial" | "mono";
export type Surface = "paper" | "night" | "warm";
export type PageWidth = "reading" | "wide";
export type Spacing = "airy" | "compact";
export type IntroLayout = "statement" | "centered" | "split";
export type QuoteDisplay = "band" | "card";
export type Starter = "scene" | "feed" | "magazine";
type Base<K extends BlockKind> = { id: string; kind: K };
export type PageBlock =
  | Base<"header">
  | (Base<"intro"> & { title: string; description: string; eyebrow: string; layout: IntroLayout })
  | (Base<"scene"> & { title: string; emphasis: string; description: string; featuredArticleSlug: string; showFeaturedArticle: boolean; featuredSeriesSlug: string; showFeaturedSeries: boolean })
  | (Base<"articles"> & { title: string; category: Topic; categoryId?: string | null; display: "rows" | "cards"; loading: "all" | "progressive" })
  | (Base<"series"> & { title: string; display: "cards" | "list" })
  | (Base<"quote"> & { text: string; attribution: string; display: QuoteDisplay })
  | (Base<"about"> & { title: string; text: string })
  | (Base<"projects"> & { title: string })
  | (Base<"footer"> & { text: string });
export type Theme = {
  name: string;
  siteName: string;
  accent: Accent;
  typography: Typography;
  surface: Surface;
  width: PageWidth;
  spacing: Spacing;
  blocks: PageBlock[];
};
export type Workspace = { version: 1; draft: Theme; applied: Theme };
const defaultAppearance = { typography: "modern", surface: "paper", width: "reading", spacing: "airy" } as const;
const legacyAccents: Record<string, string> = { mint: "#c8efbc", violet: "#d9c6f0", amber: "#efd19b" };
const starterKinds: Record<Starter, BlockKind[]> = {
  scene: ["scene"],
  feed: ["header", "intro", "articles", "quote", "about", "footer"],
  magazine: ["header", "intro", "quote", "articles", "projects", "footer"],
};
export const blockLabels: Record<BlockKind, string> = {
  header: "Üst menü", intro: "Giriş", scene: "Karakter sahnesi", articles: "Yazı akışı",
  series: "Seriler", quote: "Alıntı", about: "Hakkımda", projects: "Projeler", footer: "Footer",
};
export const blockDescriptions: Record<BlockKind, string> = {
  header: "Site adı ve içeriklere yönlendiren menü.", intro: "Güçlü bir başlık ve kısa bir giriş.",
  scene: "Karakter, hareket ve sahne içi gezinme.", articles: "Yazıları kategoriye göre listele.",
  series: "Sıralı yazı serilerini bir öğrenme yolculuğuna dönüştür.",
  quote: "Bir düşünceye nefes alacak yer aç.", about: "Ekranın arkasındaki insanı anlat.",
  projects: "Projelerin için bir bölüm ayır.", footer: "Sayfayı bir imzayla tamamla.",
};

export function accentColor(accent: Accent): string {
  return Object.hasOwn(legacyAccents, accent) ? legacyAccents[accent] : (/^#[0-9a-f]{6}$/i.test(accent) ? accent : legacyAccents.mint);
}

export function blockPlacementNote(kind: BlockKind): string {
  if (kind === "header") return "Üst menü her zaman sayfanın başında yer alır.";
  if (kind === "footer") return "Footer her zaman sayfanın sonunda yer alır.";
  if (kind === "intro" || kind === "scene") return "Sayfa tek bir giriş kullanır: giriş metni veya karakter sahnesi. Bu bölüm üst menünün hemen altında yer alır.";
  return "İçerik bölümlerini giriş ile footer arasında sıralayabilirsin.";
}

export function createBlock(kind: BlockKind, id: string): PageBlock {
  switch (kind) {
    case "header": return { kind, id };
    case "intro": return { kind, id, layout: "statement", eyebrow: "KOD, KELİME VE ARADAKİLER", title: "Merakın kaynak kodu.", description: "Yazılım, yapay zekâ ve satır aralarında kalan düşünceler. Bir geliştiricinin açık defteri." };
    case "scene": return { kind, id, title: "Kod yazarım.", emphasis: "Bazen de satır.", description: "Yazılım, edebiyat ve\nikisinin arasında bir insan.", featuredArticleSlug: "yapay-zeka-ile-dusunmek", showFeaturedArticle: true, featuredSeriesSlug: "yapay-zeka-ile-yazilim", showFeaturedSeries: true };
    case "articles": return { kind, id, title: "Açık defter", category: "Tümü", display: "rows", loading: "progressive" };
    case "series": return { kind, id, title: "Seriler", display: "cards" };
    case "quote": return { kind, id, display: "band", text: "Bir sorunun peşinden gitmek de bir başlangıçtır.", attribution: "Kişisel not" };
    case "about": return { kind, id, title: "Bir insan. Birçok merak.", text: "Kod yazıyorum. Yapay zekâ, kitaplar ve gündelik meraklar üzerine düşünüyorum. Bu defter, hepsinin yan yana durabildiği bir yer." };
    case "projects": return { kind, id, title: "Deney alanı" };
    case "footer": return { kind, id, text: "Her şey bir merakla başlar." };
  }
}

export function createTheme(starter: Starter): Theme {
  const blocks = starterKinds[starter].map((kind) => createBlock(kind, `block-${kind}`));
  if (starter === "magazine") {
    for (const block of blocks) {
      if (block.kind === "articles") block.display = "cards";
      if (block.kind === "intro") block.layout = "centered";
      if (block.kind === "quote") block.display = "card";
    }
  }
  return {
    ...defaultAppearance,
    name: { scene: "Karakterli evren", feed: "Açık defter", magazine: "Merak dergisi" }[starter],
    siteName: "SATIR",
    accent: starter === "magazine" ? "#af552f" : "mint",
    ...(starter === "magazine" ? { typography: "editorial" as const, surface: "warm" as const, width: "wide" as const } : {}),
    blocks,
  };
}

export function inferStarter(theme: Theme): Starter | null {
  for (const starter of ["scene", "feed", "magazine"] as const) {
    const kinds = starterKinds[starter];
    if (kinds.length !== theme.blocks.length || !theme.blocks.every((block, index) => block.kind === kinds[index])) continue;
    if (starter === "magazine" && (theme.typography !== "editorial" || !theme.blocks.some((block) => block.kind === "articles" && block.display === "cards"))) continue;
    return starter;
  }
  return null;
}

export function cloneTheme(theme: Theme): Theme {
  return { ...defaultAppearance, ...theme, blocks: theme.blocks.map((block) => ({ ...block })) };
}

export function createWorkspace(): Workspace {
  const theme = createTheme("scene");
  return { version: 1, draft: cloneTheme(theme), applied: cloneTheme(theme) };
}

function isLead(kind: BlockKind): boolean {
  return kind === "intro" || kind === "scene";
}

function placementValid(blocks: PageBlock[]): boolean {
  const leadStart = blocks[0]?.kind === "header" ? 1 : 0;
  const leadCount = blocks.filter((block) => isLead(block.kind)).length;
  return blocks.every((block, index) => {
    if (block.kind === "header") return index === 0;
    if (block.kind === "footer") return index === blocks.length - 1;
    if (isLead(block.kind)) return index >= leadStart && index < leadStart + leadCount;
    return true;
  });
}

export function addBlock(theme: Theme, kind: BlockKind, id: string): Theme {
  if (theme.blocks.some((block) => block.kind === kind || block.id === id)) return theme;
  if (isLead(kind) && theme.blocks.some((block) => isLead(block.kind))) return theme;
  const blocks = [...theme.blocks];
  const block = createBlock(kind, id);
  const footerIndex = blocks.findIndex((candidate) => candidate.kind === "footer");
  let index = footerIndex === -1 ? blocks.length : footerIndex;
  if (kind === "header") index = 0;
  else if (isLead(kind)) index = blocks[0]?.kind === "header" ? 1 : 0;
  else if (kind === "footer") index = blocks.length;
  blocks.splice(index, 0, block);
  return { ...theme, blocks };
}

export function canMoveBlock(theme: Theme, id: string, direction: -1 | 1): boolean {
  const index = theme.blocks.findIndex((block) => block.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= theme.blocks.length) return false;
  const blocks = [...theme.blocks];
  [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
  return placementValid(blocks);
}

export function moveBlock(theme: Theme, id: string, direction: -1 | 1): Theme {
  if (!canMoveBlock(theme, id, direction)) return theme;
  const index = theme.blocks.findIndex((block) => block.id === id);
  const blocks = [...theme.blocks];
  [blocks[index], blocks[index + direction]] = [blocks[index + direction], blocks[index]];
  return { ...theme, blocks };
}

export function removeBlock(theme: Theme, id: string): Theme {
  if (!theme.blocks.some((block) => block.id === id)) return theme;
  return { ...theme, blocks: theme.blocks.filter((block) => block.id !== id) };
}

export function replaceBlock(theme: Theme, updated: PageBlock): Theme {
  return { ...theme, blocks: theme.blocks.map((block) => block.id === updated.id && block.kind === updated.kind ? updated : block) };
}

export function applyDraft(workspace: Workspace): Workspace {
  if (themeErrors(workspace.draft).length) return workspace;
  return { ...workspace, applied: cloneTheme(workspace.draft) };
}

export function restoreApplied(workspace: Workspace): Workspace {
  return { ...workspace, draft: cloneTheme(workspace.applied) };
}

export function themeErrors(theme: Theme): string[] {
  const errors: string[] = [];
  if (!theme.name.trim()) errors.push("Temana bir ad ver.");
  if (!theme.siteName.trim()) errors.push("Site adını doldur.");
  if (!theme.blocks.some((block) => !["header", "footer"].includes(block.kind))) errors.push("Uygulamadan önce en az bir içerik bloğu ekle.");
  if (!placementValid(theme.blocks)) errors.push("Üst menü başta, giriş hemen altında, footer en sonda olmalı.");
  if (theme.blocks.filter((block) => isLead(block.kind)).length > 1) errors.push("Giriş metni ve karakter sahnesinden yalnızca birini seç.");
  return errors;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function text(value: unknown, max = 2000): value is string {
  return typeof value === "string" && value.length <= max;
}
function validFeaturedSlug(value: unknown): value is string {
  return typeof value === "string" && value.length <= 100 && (value === "" || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value));
}
function validBlock(value: unknown): value is PageBlock {
  if (!record(value) || !text(value.id, 80) || !/^[a-zA-Z0-9-]+$/.test(value.id)) return false;
  switch (value.kind) {
    case "header": return true;
    case "intro": return text(value.title, 160) && text(value.description) && text(value.eyebrow, 120) && typeof value.layout === "string" && ["statement", "centered", "split"].includes(value.layout);
    case "scene": return text(value.title, 160) && text(value.emphasis, 160) && text(value.description) && validFeaturedSlug(value.featuredArticleSlug) && validFeaturedSlug(value.featuredSeriesSlug) && typeof value.showFeaturedArticle === "boolean" && typeof value.showFeaturedSeries === "boolean";
    case "articles": return text(value.title, 160) && text(value.category, 80) && !!value.category.trim() && (value.categoryId === undefined || value.categoryId === null || (typeof value.categoryId === "string" && /^[0-9a-f-]{36}$/i.test(value.categoryId))) && typeof value.display === "string" && ["rows", "cards"].includes(value.display) && typeof value.loading === "string" && ["all", "progressive"].includes(value.loading);
    case "series": return text(value.title, 160) && typeof value.display === "string" && ["cards", "list"].includes(value.display);
    case "quote": return text(value.text) && text(value.attribution, 120) && typeof value.display === "string" && ["band", "card"].includes(value.display);
    case "about": return text(value.title, 160) && text(value.text);
    case "projects": return text(value.title, 160);
    case "footer": return text(value.text, 160);
    default: return false;
  }
}

function parseTheme(value: unknown): Theme | null {
  if (!record(value) || !text(value.name, 80) || !text(value.siteName, 40)) return null;
  if (typeof value.accent !== "string" || !(Object.hasOwn(legacyAccents, value.accent) || /^#[0-9a-f]{6}$/i.test(value.accent))) return null;
  if (!Array.isArray(value.blocks) || value.blocks.length > blockKinds.length) return null;
  // Version 1 records predate block variants. Default missing fields, but validate supplied values.
  const migratedBlocks = value.blocks.map((block: unknown) => {
    if (!record(block)) return block;
    if (block.kind === "scene") return { ...block, featuredArticleSlug: block.featuredArticleSlug === undefined ? "yapay-zeka-ile-dusunmek" : block.featuredArticleSlug, showFeaturedArticle: block.showFeaturedArticle === undefined ? true : block.showFeaturedArticle, featuredSeriesSlug: block.featuredSeriesSlug === undefined ? "yapay-zeka-ile-yazilim" : block.featuredSeriesSlug, showFeaturedSeries: block.showFeaturedSeries === undefined ? true : block.showFeaturedSeries };
    if (block.kind === "intro" && block.layout === undefined) return { ...block, layout: "statement" };
    if (block.kind === "quote" && block.display === undefined) return { ...block, display: "band" };
    return block;
  });
  if (!migratedBlocks.every(validBlock)) return null;
  if (new Set(migratedBlocks.map((block) => block.kind)).size !== migratedBlocks.length || new Set(migratedBlocks.map((block) => block.id)).size !== migratedBlocks.length) return null;
  const choices = {
    typography: ["modern", "editorial", "mono"], surface: ["paper", "night", "warm"],
    width: ["reading", "wide"], spacing: ["airy", "compact"],
  };
  for (const [key, allowed] of Object.entries(choices)) {
    if (value[key] !== undefined && (typeof value[key] !== "string" || !allowed.includes(value[key]))) return null;
  }
  const appearance = {
    typography: (value.typography ?? defaultAppearance.typography) as Typography,
    surface: (value.surface ?? defaultAppearance.surface) as Surface,
    width: (value.width ?? defaultAppearance.width) as PageWidth,
    spacing: (value.spacing ?? defaultAppearance.spacing) as Spacing,
  };
  // Old versions allowed arbitrary order. Keep all identities and text while restoring page roles.
  const rank = (block: PageBlock) => block.kind === "header" ? 0 : isLead(block.kind) ? 1 : block.kind === "footer" ? 3 : 2;
  const blocks = migratedBlocks.map((block) => ({ ...block })).sort((left, right) => rank(left) - rank(right));
  return { name: value.name, siteName: value.siteName, accent: value.accent, ...appearance, blocks };
}

export function parseWorkspace(serialized: string): Workspace | null {
  if (serialized.length > 100_000) return null;
  try {
    const value: unknown = JSON.parse(serialized);
    if (!record(value) || value.version !== 1) return null;
    const draft = parseTheme(value.draft);
    const applied = parseTheme(value.applied);
    // Preserve older applied themes containing both lead kinds until the owner resolves the conflict.
    if (!draft || !applied || !applied.name.trim() || !applied.siteName.trim() || !applied.blocks.some((block) => !["header", "footer"].includes(block.kind))) return null;
    return { version: 1, draft, applied };
  } catch {
    return null;
  }
}
