import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SceneFeatured } from "../components/SceneFeatured";
import { articles } from "../lib/content";
import { initialSeries } from "../lib/series/model";
import { createWorkspace, parseWorkspace } from "../lib/builder/model";

describe("curated scene recommendations", () => {
  it("opens the selected article and series through their distinct navigation callbacks", () => {
    const onArticle = vi.fn(); const onSeries = vi.fn();
    render(<SceneFeatured article={articles[0]} series={initialSeries[0]} onArticle={onArticle} onSeries={onSeries} />);
    fireEvent.click(screen.getByRole("button", { name: /DEFTERDEN BİR SAYFA/ }));
    fireEvent.click(screen.getByRole("button", { name: /BİR OKUMA YOLU/ }));
    expect(onArticle).toHaveBeenCalledWith(articles[0].slug);
    expect(onSeries).toHaveBeenCalledWith(initialSeries[0].slug);
    expect(screen.queryByText("[ ]")).toBeNull();
  });
  it("renders no empty recommendation affordances when both targets are absent", () => {
    const { container } = render(<SceneFeatured onArticle={vi.fn()} onSeries={vi.fn()} />);
    expect(container.children).toHaveLength(0);
  });
  it("migrates legacy scene choices while preserving deliberate hiding and rejecting invalid supplied values", () => {
    const workspace = createWorkspace();
    const legacy = JSON.parse(JSON.stringify(workspace));
    for (const theme of [legacy.draft, legacy.applied]) for (const key of ["featuredArticleSlug", "showFeaturedArticle", "featuredSeriesSlug", "showFeaturedSeries"]) delete theme.blocks[0][key];
    expect(parseWorkspace(JSON.stringify(legacy))?.draft.blocks[0]).toMatchObject({ featuredArticleSlug: "yapay-zeka-ile-dusunmek", showFeaturedArticle: true, featuredSeriesSlug: "yapay-zeka-ile-yazilim", showFeaturedSeries: true });
    const scene = workspace.draft.blocks[0];
    if (scene.kind !== "scene") throw new Error("scene expected");
    scene.showFeaturedArticle = false; scene.showFeaturedSeries = false;
    expect(parseWorkspace(JSON.stringify(workspace))?.draft.blocks[0]).toMatchObject({ showFeaturedArticle: false, showFeaturedSeries: false });
    expect(parseWorkspace(JSON.stringify({ ...workspace, draft: { ...workspace.draft, blocks: [{ ...scene, featuredArticleSlug: "../unsafe" }] } }))).toBeNull();
    expect(parseWorkspace(JSON.stringify({ ...workspace, draft: { ...workspace.draft, blocks: [{ ...scene, showFeaturedArticle: null }] } }))).toBeNull();
  });
});
