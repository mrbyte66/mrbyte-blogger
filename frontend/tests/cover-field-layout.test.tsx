import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SiteEditor } from "../components/builder/SiteEditor";
import { ApiError } from "../lib/api/http";
import { articles } from "../lib/content";
import { initialSeries } from "../lib/series/model";
import { MemorySite, renderWithSite } from "./support/memory-site";

vi.mock("../components/Experience", () => ({ Experience: () => <div>Scene</div> }));
beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
  Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const cover = "/api/v1/media/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const png = () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "kapak.png", { type: "image/png" });
function open(site: MemorySite, title: string | RegExp) {
  renderWithSite(<SiteEditor />, { site, mode: "studio" });
  fireEvent.click(screen.getByRole("button", { name: /^Sayfalar:/ }));
  fireEvent.click(screen.getByRole("button", { name: title }));
}
/** preview → upload row (change + remove side by side) → status → note → “Çevrimiçi kapak bul”. */
function expectLayout(field: HTMLElement, hasCover: boolean) {
  const parts = [...field.children].map((child) => child.className.split(" ")[0]);
  expect(parts).toEqual(["cover-preview", "studio-upload", "cover-note", "cover-search"]);
  const row = field.querySelector(".studio-upload-row")!;
  expect(within(row as HTMLElement).getByText(hasCover ? "Kapağı değiştir" : "Kapak görseli yükle")).toBeTruthy();
  expect(!!within(row as HTMLElement).queryByRole("button", { name: "Kapağı kaldır" })).toBe(hasCover);
  expect(within(field).getByRole("heading", { name: "Çevrimiçi kapak bul" })).toBeTruthy();
}

describe("cover field layout (#58)", () => {
  it("uses the same order on articles and series", () => {
    const site = new MemorySite({ articles: articles.map((a, i) => i === 0 ? { ...a, coverUrl: cover } : { ...a }) });
    open(site, new RegExp(`^${articles[0].title}`));
    fireEvent.click(screen.getByRole("button", { name: "Kapak görseli" }));
    expectLayout(document.querySelector(".cover-field") as HTMLElement, true);
    expect(screen.getByRole("img", { name: "Yazı kapağı önizlemesi" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /^Sayfalar:/ }));
    fireEvent.click(screen.getByRole("button", { name: initialSeries[1].title }));
    fireEvent.click(screen.getByRole("button", { name: "Kapak görseli" }));
    const field = document.querySelector(".cover-field") as HTMLElement;
    expectLayout(field, !!site.series.find((s) => s.title === initialSeries[1].title)?.coverImage);
  });

  it("uses the same field in the inline series form, with an empty preview until an image is chosen", async () => {
    renderWithSite(<SiteEditor />, { site: new MemorySite(), mode: "studio" });
    fireEvent.click(screen.getByRole("button", { name: /^Sayfalar:/ }));
    fireEvent.click(screen.getByRole("button", { name: /Yeni yazı/ }));
    fireEvent.change(screen.getByLabelText("Yazının serisi"), { target: { value: "new" } });
    const form = document.querySelector(".inline-series-form") as HTMLElement;
    const field = form.querySelector(".cover-field") as HTMLElement;
    expectLayout(field, false);
    expect(within(field).getByText(/Kapak seçilmedi/)).toBeTruthy();
    expect(within(field).getByText("Çevrimiçi kapak aramak için önce kaydet.")).toBeTruthy();
    await act(async () => { fireEvent.change(within(field).getByLabelText("Kapak görseli yükle"), { target: { files: [png()] } }); });
    expectLayout(form.querySelector(".cover-field") as HTMLElement, true);
  });

  it("shows the upload result right below the buttons, as success or error", async () => {
    const site = new MemorySite({ articles: articles.map((a, i) => i === 0 ? { ...a, coverUrl: cover } : { ...a }) });
    open(site, new RegExp(`^${articles[0].title}`));
    fireEvent.click(screen.getByRole("button", { name: "Kapak görseli" }));
    const upload = document.querySelector(".cover-field .studio-upload") as HTMLElement;
    const status = within(upload).getByRole("status");
    expect(status.textContent).toBe("");
    await act(async () => { fireEvent.change(within(upload).getByLabelText("Kapağı değiştir"), { target: { files: [png()] } }); });
    expect(status.textContent).toBe("Görsel yüklendi.");
    expect(status.className).toContain("is-done");
    expect(status.previousElementSibling?.previousElementSibling?.className).toBe("studio-upload-row");
    site.failNext = new ApiError(413, "PAYLOAD_TOO_LARGE", "Dosya çok büyük");
    await act(async () => { fireEvent.change(within(upload).getByLabelText("Kapağı değiştir"), { target: { files: [png()] } }); });
    expect(status.textContent).toBe("Görsel yüklenemedi. Dosya çok büyük");
    expect(status.className).toContain("is-error");
  });
});
