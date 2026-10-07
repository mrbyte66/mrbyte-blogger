import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SiteEditor } from "../components/builder/SiteEditor";
import { articles } from "../lib/content";
import { MemorySite, renderWithSite } from "./support/memory-site";

vi.mock("../components/Experience", () => ({ Experience: () => <div>Scene</div> }));
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const studio = (site = new MemorySite()) => renderWithSite(<SiteEditor />, { site, mode: "studio" });
const pages = () => fireEvent.click(screen.getByRole("button", { name: /^Sayfalar:/ }));
const newArticle = () => { pages(); fireEvent.click(screen.getByRole("button", { name: /Yeni yazı/ })); };
const open = (title: string) => { pages(); fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${title}`) })); };

describe("Studio page navigation", () => {
  it("leaves an untouched new article without asking and drops it from the page list", () => {
    const confirm = vi.spyOn(window, "confirm");
    studio();
    newArticle();
    expect(screen.getByLabelText("Yazı başlığı")).toHaveProperty("value", "Yeni yazı");
    open(articles[1].title);
    expect(confirm).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Yazı başlığı")).toHaveProperty("value", articles[1].title);
    pages();
    expect(screen.queryByRole("button", { name: /^Yeni yazı$/ })).toBeNull();
  });

  it("asks before discarding edits and stays when the author cancels", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    studio();
    open(articles[0].title);
    fireEvent.change(screen.getByLabelText("Yazı başlığı"), { target: { value: "Değişmiş başlık" } });
    open(articles[1].title);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Yazı başlığı")).toHaveProperty("value", "Değişmiş başlık");
    expect(screen.getByText(/Sayfa değiştirmeden önce/)).toBeTruthy();
    confirm.mockReturnValue(true);
    open(articles[1].title);
    expect(screen.getByLabelText("Yazı başlığı")).toHaveProperty("value", articles[1].title);
  });

  it("explains why an article without body text cannot be published", async () => {
    studio();
    newArticle();
    fireEvent.click(screen.getByLabelText("İçerik işlemleri"));
    const publish = screen.getByRole("button", { name: "Yayına al" });
    expect(publish.hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("note").textContent).toContain("en az bir paragraf");
    expect(publish.getAttribute("aria-describedby")).toBe("publish-hint");
  });

  it("announces saved content so visitor pages refresh", async () => {
    const site = new MemorySite();
    const changed = vi.fn();
    window.addEventListener("satir:content-changed", changed);
    studio(site);
    open(articles[0].title);
    fireEvent.change(screen.getByLabelText("Yazı başlığı"), { target: { value: "Yenilenen başlık" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Sayfayı kaydet/ })); });
    expect(site.article(articles[0].slug)!.title).toBe("Yenilenen başlık");
    expect(changed).toHaveBeenCalled();
    window.removeEventListener("satir:content-changed", changed);
  });
});
