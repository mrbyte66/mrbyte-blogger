import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { SeriesStudio } from "../components/series/SeriesStudio";
import { articles } from "../lib/content";
import { addBlock, applyDraft, createWorkspace, parseWorkspace } from "../lib/builder/model";
import { initialSeries, validateSeries } from "../lib/series/model";
import { seriesKey } from "../lib/series/use-series-workspace";

beforeEach(() => localStorage.clear());
function storedSeries() { return validateSeries(JSON.parse(localStorage.getItem(seriesKey)!))!; }

describe("series authoring", () => {
  it("creates a validated draft with an automatic Turkish slug and prevents duplicate membership", async () => {
    const user = userEvent.setup();
    localStorage.setItem(seriesKey, JSON.stringify([{ ...initialSeries[0], articleSlugs: [...initialSeries[0].articleSlugs] }, initialSeries[2]]));
    render(<SeriesStudio />);
    await user.click(screen.getByRole("button", { name: /Yeni seri oluştur/ }));
    await user.type(screen.getByLabelText("Seri adı"), "Şiir ve kültür");
    expect((screen.getByLabelText("Kalıcı bağlantı adı") as HTMLInputElement).value).toBe("siir-ve-kultur");
    expect(screen.getByRole("button", { name: /Yapay zekâ ile düşünmek/ }).hasAttribute("disabled")).toBe(true);
    await user.click(screen.getByRole("button", { name: /Satır aralarında bir yer/ }));
    await user.click(screen.getByRole("button", { name: /Seriyi kaydet/ }));
    expect(storedSeries()).toHaveLength(initialSeries.length);
    expect(storedSeries().at(-1)).toMatchObject({ title: "Şiir ve kültür", slug: "siir-ve-kultur", status: "draft", articleSlugs: ["satir-aralarinda"] });
    expect(screen.getByRole("status").textContent).toContain("taslak olarak");
  });
  it("reorders and removes membership without deleting articles or mutating storage before Save", async () => {
    const user = userEvent.setup();
    render(<SeriesStudio />);
    await user.click(screen.getByRole("button", { name: /YZ ile düşün, yaz ve geliştir/ }));
    await user.click(screen.getByRole("button", { name: "İyi kodun sessizliği bölümünü yukarı taşı" }));
    expect(localStorage.getItem(seriesKey)).toBeNull();
    await user.click(screen.getByRole("button", { name: /Seriyi kaydet/ }));
    expect(storedSeries()[0].articleSlugs).toEqual(["iyi-kodun-sessizligi", "yapay-zeka-ile-dusunmek", ...initialSeries[0].articleSlugs.slice(2)]);
    await user.click(screen.getByRole("button", { name: "İyi kodun sessizliği yazısını seriden çıkar" }));
    await user.click(screen.getByRole("button", { name: /Seriyi kaydet/ }));
    expect(storedSeries()[0].articleSlugs).toEqual(["yapay-zeka-ile-dusunmek", ...initialSeries[0].articleSlugs.slice(2)]);
    expect(articles.find((article) => article.slug === "iyi-kodun-sessizligi")).toBeTruthy();
    expect(screen.getByRole("button", { name: /İyi kodun sessizliği/ }).hasAttribute("disabled")).toBe(false);
  });
  it("keeps invalid links and empty publication in the form until corrected", async () => {
    const user = userEvent.setup();
    render(<SeriesStudio />);
    await user.click(screen.getByRole("button", { name: /Yeni seri oluştur/ }));
    fireEvent.change(screen.getByLabelText("Seri adı"), { target: { value: "Yeni seri" } });
    fireEvent.change(screen.getByLabelText("Kalıcı bağlantı adı"), { target: { value: "Türkçe Link!" } });
    await user.click(screen.getByRole("button", { name: /Seriyi kaydet/ }));
    expect(screen.getByRole("alert").textContent).toContain("bağlantısı benzersiz");
    expect(localStorage.getItem(seriesKey)).toBeNull();
    fireEvent.change(screen.getByLabelText("Kalıcı bağlantı adı"), { target: { value: "yeni-seri" } });
    await user.selectOptions(screen.getByLabelText("Görünürlük"), "published");
    await user.click(screen.getByRole("button", { name: /Seriyi kaydet/ }));
    expect(screen.getByRole("alert").textContent).toContain("en az bir bölüm");
    await user.click(screen.getByRole("button", { name: "Vazgeç" }));
    expect(screen.queryByLabelText("Seri adı")).toBeNull();
  });
});

describe("series block contract", () => {
  it("persists card/list presentation with normal structural placement and backward compatibility", () => {
    const workspace = createWorkspace();
    workspace.draft = addBlock(workspace.draft, "footer", "footer");
    workspace.draft = addBlock(workspace.draft, "series", "my-series");
    const block = workspace.draft.blocks.find((item) => item.kind === "series")!;
    expect(block).toMatchObject({ display: "cards", title: "Seriler" });
    expect(workspace.draft.blocks.map((item) => item.kind)).toEqual(["scene", "series", "footer"]);
    if (block.kind === "series") block.display = "list";
    expect(parseWorkspace(JSON.stringify(applyDraft(workspace)))?.applied.blocks[1]).toMatchObject({ kind: "series", display: "list" });
    expect(parseWorkspace(JSON.stringify(createWorkspace()))).toEqual(createWorkspace());
    if (block.kind === "series") (block as { display: string }).display = "invalid";
    expect(parseWorkspace(JSON.stringify(workspace))).toBeNull();
  });
});
