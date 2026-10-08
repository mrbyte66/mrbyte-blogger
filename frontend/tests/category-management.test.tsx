import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ArticleCategoryField } from "../components/builder/ArticleCategoryField";
import { SiteDataValues, type ContentState } from "../components/data/SiteData";
import { createWorkspace } from "../lib/builder/model";
import { articles, type Article } from "../lib/content";
import type { StudioCategory } from "../lib/api/categories";
import { ApiError } from "../lib/api/http";

const one: StudioCategory = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", name: "Bilim", slug: "bilim", version: 2, position: 0 };
const two: StudioCategory = { ...one, id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", name: "Tarih", slug: "tarih" };
const base: Article = { ...articles[0], category: one.name, categories: [one.name], categoryIds: [one.id] };
function mount(options: { items?: StudioCategory[]; failDelete?: boolean } = {}) {
  const remove = vi.fn(async () => { if (options.failDelete) throw new ApiError(409, "CATEGORY_IN_USE", "Kullanılıyor"); });
  const rename = vi.fn(async (category: StudioCategory, name: string) => ({ ...category, name, version: category.version + 1 }));
  function Harness() {
    const [registry, setRegistry] = useState(options.items ?? [one, two]);
    const [article, setArticle] = useState(base);
    const manager: NonNullable<ContentState["categoryManager"]> = {
      items: registry, refresh: async () => {},
      create: async (name) => { const next = { ...two, id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", name, slug: "yeni" }; setRegistry([...registry, next]); return next; },
      rename: async (category, name) => { const next = await rename(category, name); setRegistry(registry.map((c) => c.id === next.id ? next : c)); return next; },
      remove: async (category) => { await remove(); setRegistry(registry.filter((c) => c.id !== category.id)); },
    };
    return <SiteDataValues content={{ articles: [base], series: [], categories: registry, categoryManager: manager, ready: true, error: null }} workspace={{ workspace: createWorkspace(), save: () => false, ready: true, storageError: null }}>
      <ArticleCategoryField article={article} onChange={(patch) => setArticle({ ...article, ...patch })} /><output data-testid="selected">{JSON.stringify(article.categoryIds)}</output>
    </SiteDataValues>;
  }
  render(<Harness />); return { remove, rename };
}
async function click(name: string | RegExp) { await act(async () => { fireEvent.click(screen.getByRole("button", { name })); }); }

describe("Studio category management (#44)", () => {
  it("keeps one category and adds a newly created category without discarding the existing selection", async () => {
    mount(); expect((screen.getByRole("checkbox", { name: "Bilim" }) as HTMLInputElement).disabled).toBe(true);
    await click("+ Yeni kategori"); fireEvent.change(screen.getByLabelText("Yeni kategori adı"), { target: { value: "Astronomi" } });
    await click("Ekle ve seç");
    expect((screen.getByRole("checkbox", { name: "Astronomi" }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByTestId("selected").textContent).toContain(one.id);
  });
  it("renames by stable identity and preserves the article selection", async () => {
    const { rename } = mount(); await click("Yönet"); await click("Düzenle: Bilim");
    fireEvent.change(screen.getByLabelText("Kategori adı"), { target: { value: "Doğa bilimi" } }); await click("Kaydet");
    expect(rename).toHaveBeenCalledWith(one, "Doğa bilimi");
    expect(screen.getByTestId("selected").textContent).toBe(JSON.stringify([one.id]));
    expect((screen.getByRole("checkbox", { name: "Doğa bilimi" }) as HTMLInputElement).checked).toBe(true);
  });
  it("warns and blocks deletion of a category used by an article", async () => {
    const { remove } = mount(); await click("Yönet"); await click("Sil: Bilim");
    expect((screen.getByRole("button", { name: "Kategoriyi sil" }) as HTMLButtonElement).disabled).toBe(true);
    expect(remove).not.toHaveBeenCalled();
  });
  it("requires confirmation before removing an unused category", async () => {
    const { remove } = mount(); await click("Yönet"); await click("Sil: Tarih"); expect(remove).not.toHaveBeenCalled();
    await click("Kategoriyi sil"); expect(remove).toHaveBeenCalledOnce(); expect(screen.queryByRole("checkbox", { name: "Tarih" })).toBeNull();
  });
  it("keeps the category and current selection when the server reports a newly discovered usage", async () => {
    mount({ failDelete: true }); await click("Yönet"); await click("Sil: Tarih"); await click("Kategoriyi sil");
    expect(screen.getByRole("alert").textContent).toContain("yayındaki yazılarda");
    expect(screen.getByRole("checkbox", { name: "Tarih" })).toBeTruthy(); expect(screen.getByTestId("selected").textContent).toContain(one.id);
  });
});
