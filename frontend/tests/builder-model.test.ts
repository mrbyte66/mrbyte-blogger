import { describe, expect, it } from "vitest";
import { articles } from "../lib/content";
import { accentColor, addBlock, applyDraft, canMoveBlock, createBlock, createTheme, createWorkspace, inferStarter, moveBlock, parseWorkspace, removeBlock, restoreApplied, themeErrors } from "../lib/builder/model";

describe("theme composition and publication boundaries", () => {
  it("keeps draft changes isolated until apply and preserves the article collection", () => {
    const workspace = createWorkspace();
    const originalContent = JSON.stringify(articles);
    const edited = { ...workspace, draft: createTheme("feed") };
    expect(edited.applied.blocks.map((block) => block.kind)).toEqual(["scene"]);
    const applied = applyDraft(edited);
    expect(applied.applied).toEqual(edited.draft);
    expect(applied.applied).not.toBe(edited.draft);
    applied.draft.blocks[0].id = "later-edit";
    expect(applied.applied.blocks[0].id).not.toBe("later-edit");
    expect(JSON.stringify(articles)).toBe(originalContent);
    expect(JSON.stringify(applied.applied)).not.toContain(articles[0].slug);
  });
  it("restores the applied snapshot without sharing mutable block objects", () => {
    const workspace = { ...createWorkspace(), draft: createTheme("feed") };
    const restored = restoreApplied(workspace);
    expect(restored.draft).toEqual(workspace.applied);
    expect(restored.draft.blocks[0]).not.toBe(workspace.applied.blocks[0]);
  });
  it("keeps the lead first while allowing body blocks to change order without losing identities", () => {
    const original = createTheme("scene");
    const combined = addBlock(original, "articles", "new-feed");
    expect(moveBlock(combined, "new-feed", -1)).toBe(combined);
    expect(combined.blocks.map((block) => block.kind)).toEqual(["scene", "articles"]);
    const withQuote = addBlock(combined, "quote", "new-quote");
    const moved = moveBlock(withQuote, "new-quote", -1);
    expect(moved.blocks.map((block) => block.kind)).toEqual(["scene", "quote", "articles"]);
    expect(moved.blocks[1].id).toBe("new-quote");
    expect(moveBlock(moved, "new-quote", -1)).toBe(moved);
    expect(moveBlock(moved, "missing", 1)).toBe(moved);
  });
  it("rejects duplicate blocks and allows removing the final draft block", () => {
    const theme = createTheme("scene");
    expect(addBlock(theme, "scene", "second-scene")).toBe(theme);
    expect(addBlock(theme, "articles", theme.blocks[0].id)).toBe(theme);
    const empty = removeBlock(theme, theme.blocks[0].id);
    expect(empty.blocks).toEqual([]);
    const workspace = { ...createWorkspace(), draft: empty };
    expect(applyDraft(workspace)).toBe(workspace);
    expect(parseWorkspace(JSON.stringify(workspace))?.draft.blocks).toEqual([]);
    expect(removeBlock(theme, "missing")).toBe(theme);
  });
  it("inserts structural blocks into their page roles regardless of insertion order", () => {
    let theme = { ...createTheme("feed"), blocks: [createBlock("articles", "articles")] };
    theme = addBlock(theme, "footer", "footer");
    theme = addBlock(theme, "quote", "quote");
    theme = addBlock(theme, "intro", "intro");
    theme = addBlock(theme, "header", "header");
    expect(theme.blocks.map((block) => block.kind)).toEqual(["header", "intro", "articles", "quote", "footer"]);
    expect(themeErrors(theme)).toEqual([]);
  });
  it("prevents body sections from crossing structural boundaries in either direction", () => {
    const theme = createTheme("feed");
    expect(canMoveBlock(theme, "block-header", 1)).toBe(false);
    expect(canMoveBlock(theme, "block-intro", 1)).toBe(false);
    expect(canMoveBlock(theme, "block-articles", -1)).toBe(false);
    expect(canMoveBlock(theme, "block-footer", -1)).toBe(false);
    expect(canMoveBlock(theme, "block-about", 1)).toBe(false);
    expect(canMoveBlock(theme, "block-articles", 1)).toBe(true);
    expect(canMoveBlock(theme, "missing", 1)).toBe(false);
  });
  it("requires a single lead and refuses incompatible additions without deleting content", () => {
    const feed = createTheme("feed");
    expect(addBlock(feed, "scene", "scene")).toBe(feed);
    const scene = createTheme("scene");
    expect(addBlock(scene, "intro", "intro")).toBe(scene);
    const conflict = { ...scene, blocks: [...scene.blocks, createBlock("intro", "intro")] };
    expect(themeErrors(conflict)).toContain("Giriş metni ve karakter sahnesinden yalnızca birini seç.");
  });
  it("recognizes existing structure even after text edits and returns null for a custom composition", () => {
    expect(inferStarter({ ...createTheme("feed"), siteName: "My site", accent: "#112233" })).toBe("feed");
    expect(inferStarter(createTheme("scene"))).toBe("scene");
    expect(inferStarter(addBlock(createTheme("scene"), "articles", "articles"))).toBeNull();
    expect(inferStarter(createTheme("magazine"))).toBe("magazine");
    expect(inferStarter({ ...createTheme("magazine"), typography: "mono" })).toBeNull();
  });
  it("creates a distinct magazine starter and keeps article binding controls", () => {
    const magazine = createTheme("magazine");
    expect(magazine).toMatchObject({ typography: "editorial", surface: "warm", width: "wide" });
    expect(magazine.blocks.find((block) => block.kind === "articles")).toMatchObject({ display: "cards", category: "Tümü", loading: "progressive" });
    expect(magazine.blocks.find((block) => block.kind === "intro")).toMatchObject({ layout: "centered" });
    expect(magazine.blocks.find((block) => block.kind === "quote")).toMatchObject({ display: "card" });
    const feed = createTheme("feed");
    for (const kind of ["intro", "quote"] as const) {
      const magazineBlock = magazine.blocks.find((block) => block.kind === kind)!;
      const feedBlock = feed.blocks.find((block) => block.kind === kind)!;
      expect(magazineBlock).toEqual({ ...feedBlock, ...(kind === "intro" ? { layout: "centered" } : { display: "card" }) });
    }
    expect(themeErrors(magazine)).toEqual([]);
  });
  it("applies appearance as an isolated snapshot", () => {
    const workspace = createWorkspace();
    workspace.draft = { ...workspace.draft, typography: "mono", surface: "night", width: "wide", spacing: "compact", accent: "#112233" };
    const applied = applyDraft(workspace);
    expect(applied.applied).toEqual(workspace.draft);
    applied.draft.accent = "#ffffff";
    expect(applied.applied.accent).toBe("#112233");
    expect(accentColor("#aBcDeF")).toBe("#aBcDeF");
    expect(accentColor("violet")).toMatch(/^#[0-9a-f]{6}$/);
    expect(accentColor("constructor")).toBe(accentColor("mint"));
  });
  it("requires a named theme and an actual content block before application", () => {
    const theme = createTheme("feed");
    expect(themeErrors({ ...theme, name: " ", siteName: "", blocks: [theme.blocks[0]] })).toHaveLength(3);
  });
});

describe("persisted workspace validation", () => {
  it("migrates missing block variants without losing authored content in either snapshot", () => {
    const original = createTheme("feed");
    const intro = original.blocks.find((block) => block.kind === "intro")!;
    const quote = original.blocks.find((block) => block.kind === "quote")!;
    intro.title = "Benim girişim";
    quote.text = "Benim düşüncem";
    const legacy = { ...original, blocks: original.blocks.map((block) => {
      if (block.kind === "intro") { const { layout, ...rest } = block; void layout; return rest; }
      if (block.kind === "quote") { const { display, ...rest } = block; void display; return rest; }
      return block;
    }) };
    expect(parseWorkspace(JSON.stringify({ version: 1, draft: legacy, applied: legacy }))).toEqual({ version: 1, draft: original, applied: original });
    expect(intro.layout).toBe("statement");
    expect(quote.display).toBe("band");
  });
  it.each([
    ["intro", "layout", "stacked"], ["intro", "layout", null], ["intro", "layout", ["split"]],
    ["quote", "display", "cards"], ["quote", "display", null], ["quote", "display", 1],
  ])("rejects unsupported %s %s=%s in either snapshot", (kind, key, value) => {
    const theme = createTheme("feed");
    const invalid = { ...theme, blocks: theme.blocks.map((block) => block.kind === kind ? { ...block, [key]: value } : block) };
    for (const snapshot of ["draft", "applied"]) {
      expect(parseWorkspace(JSON.stringify({ version: 1, draft: theme, applied: theme, [snapshot]: invalid }))).toBeNull();
    }
  });
  it.each(["statement", "centered", "split"] as const)("preserves the %s intro layout and card quote across save and apply", (layout) => {
    const workspace = { ...createWorkspace(), draft: createTheme("feed") };
    const intro = workspace.draft.blocks.find((block) => block.kind === "intro")!;
    const quote = workspace.draft.blocks.find((block) => block.kind === "quote")!;
    intro.layout = layout;
    quote.display = "card";
    const applied = applyDraft(workspace);
    expect(parseWorkspace(JSON.stringify(applied))).toEqual(applied);
    expect(applied.applied.blocks.find((block) => block.kind === "intro")).toEqual(intro);
    expect(applied.applied.blocks.find((block) => block.kind === "quote")).toEqual(quote);
  });

  it("migrates old appearance and misplaced sections without replacing authored text or ids", () => {
    const original = createTheme("feed");
    const { typography, surface, width, spacing, ...legacy } = original;
    void typography; void surface; void width; void spacing;
    legacy.blocks = [original.blocks[5], original.blocks[2], original.blocks[1], original.blocks[0], original.blocks[3], original.blocks[4]];
    const workspace = parseWorkspace(JSON.stringify({ version: 1, draft: legacy, applied: legacy }));
    expect(workspace?.draft).toEqual(original);
    expect(workspace?.applied).toEqual(original);
    expect(workspace?.draft.blocks[1]).not.toBe(original.blocks[1]);
  });
  it("preserves an old intro and scene conflict for the owner to resolve", () => {
    const theme = createTheme("feed");
    const scene = { ...createBlock("scene", "legacy-scene"), description: "An authored memory" };
    theme.blocks.push(scene);
    const workspace = parseWorkspace(JSON.stringify({ version: 1, draft: theme, applied: theme }));
    expect(workspace).not.toBeNull();
    expect(workspace?.draft.blocks.map((block) => block.kind)).toEqual(["header", "intro", "scene", "articles", "quote", "about", "footer"]);
    expect(workspace?.draft.blocks.find((block) => block.id === "legacy-scene")).toEqual(scene);
    expect(themeErrors(workspace!.draft)).toEqual(["Giriş metni ve karakter sahnesinden yalnızca birini seç."]);
    expect(applyDraft(workspace!)).toBe(workspace);
  });
  it.each([
    ["typography", "comic"], ["surface", "glass"], ["width", "pixel"], ["spacing", "zero"],
    ["accent", "red"], ["accent", "#123"], ["accent", "constructor"], ["surface", null],
  ])("rejects unsupported appearance %s=%s", (key, value) => {
    const workspace = createWorkspace();
    expect(parseWorkspace(JSON.stringify({ ...workspace, draft: { ...workspace.draft, [key]: value } }))).toBeNull();
  });
  it("roundtrips a scene, feed draft and incomplete draft text", () => {
    const workspace = { ...createWorkspace(), draft: { ...createTheme("feed"), name: "" } };
    expect(parseWorkspace(JSON.stringify(workspace))).toEqual(workspace);
  });
  it.each(["not-json", "null", "{}", JSON.stringify({ ...createWorkspace(), version: 2 })])("rejects malformed or unsupported storage", (raw) => {
    expect(parseWorkspace(raw)).toBeNull();
  });
  it("rejects unknown blocks, duplicate ids/kinds and invalid enum values", () => {
    const workspace = createWorkspace();
    for (const blocks of [
      [{ id: "unknown", kind: "executable" }],
      [{ id: "articles", kind: "articles", title: "List", category: "Tümü", display: ["rows"], loading: "all" }],
      [workspace.draft.blocks[0], workspace.draft.blocks[0]],
      [{ id: "articles", kind: "articles", title: "List", category: "Unknown", display: "rows", loading: "all" }],
    ]) expect(parseWorkspace(JSON.stringify({ ...workspace, draft: { ...workspace.draft, blocks } }))).toBeNull();
  });
  it("rejects oversized text and an invalid applied snapshot", () => {
    const workspace = createWorkspace();
    expect(parseWorkspace(JSON.stringify({ ...workspace, draft: { ...workspace.draft, siteName: "x".repeat(41) } }))).toBeNull();
    expect(parseWorkspace(JSON.stringify({ ...workspace, applied: { ...workspace.applied, name: "" } }))).toBeNull();
  });
});
