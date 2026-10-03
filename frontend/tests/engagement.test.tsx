import userEvent from "@testing-library/user-event";
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { ArticleEngagement } from "../components/ArticleEngagement";
import { ArticleContent } from "../components/ArticleContent";
import { articles } from "../lib/content";
import { viewKey } from "../lib/reactions/use-views"
import { ClapCount } from "../components/ClapCount";
import { clapKey, useClaps } from "../lib/reactions/use-claps";

beforeEach(() => { localStorage.clear(); userEvent.setup(); });
afterEach(() => vi.restoreAllMocks());
const props = { slug: "ornek-yazi", title: "Kod & düşünce" };

describe("anonymous local claps", () => {
  it("toggles once per article, synchronizes card totals and restores after remount", () => {
    const view = render(<><ArticleEngagement {...props} /><ClapCount slugs={[props.slug, "diger-yazi"]} series /></>);
    fireEvent.click(screen.getByRole("button", { name: "Yazıyı alkışla" }));
    expect(screen.getByRole("button", { name: "Alkışını geri al" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByLabelText("1 alkış · seri yazılarının toplamı")).toBeTruthy();
    view.unmount();
    render(<ArticleEngagement {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Alkışını geri al" }));
    expect(JSON.parse(localStorage.getItem(clapKey)!).articles).toEqual([]);
    expect(screen.getByRole("button", { name: "Yazıyı alkışla" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("handles cross-tab changes and refuses to overwrite malformed records", () => {
    const { result } = renderHook(useClaps);
    act(() => {
      localStorage.setItem(clapKey, JSON.stringify({ version: 1, articles: [props.slug] }));
      window.dispatchEvent(new StorageEvent("storage", { key: clapKey }));
    });
    expect(result.current.count([props.slug, props.slug])).toBe(1);
    localStorage.setItem(clapKey, "corrupt");
    act(() => result.current.toggle(props.slug));
    expect(localStorage.getItem(clapKey)).toBe("corrupt");
    expect(result.current.error).toContain("kaydedilemedi");
  });

  it("does not increment on storage failure or allow voting in Studio", () => {
    const { rerender } = render(<ArticleEngagement {...props} />);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    fireEvent.click(screen.getByRole("button", { name: "Yazıyı alkışla" }));
    expect(screen.getByRole("alert").textContent).toContain("kaydedilemedi");
    expect(screen.getByRole("button", { name: "Yazıyı alkışla" }).getAttribute("aria-pressed")).toBe("false");
    rerender(<ArticleEngagement {...props} preview />);
    expect((screen.getByRole("button", { name: "Yazıyı alkışla" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText("WhatsApp ↗")).toBeNull();
  });
});

describe("permanent article sharing", () => {
  it("copies the canonical article URL and encodes platform URLs", async () => {
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    render(<ArticleEngagement {...props} />);
    fireEvent.click(screen.getByText("Paylaş"));
    const url = new URL(`/yazilar/${props.slug}`, window.location.origin).href;
    expect(new URL(screen.getByRole("link", { name: "LinkedIn ↗" }).getAttribute("href")!).searchParams.get("url")).toBe(url);
    fireEvent.click(screen.getByRole("button", { name: "Bağlantıyı kopyala" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(url));
    expect(screen.getByRole("status").textContent).toBe("Bağlantı kopyalandı.");
  });

  it("offers a selectable URL if clipboard access fails", async () => {
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    render(<ArticleEngagement {...props} />);
    fireEvent.click(screen.getByText("Paylaş"));
    fireEvent.click(screen.getByRole("button", { name: "Bağlantıyı kopyala" }));
    expect(await screen.findByLabelText("Paylaşılacak bağlantı")).toBeTruthy();
  });
});


describe("reader view counting", () => {
  it("does not count opening the side panel, but counts the permalink reader", async () => {
    const article = articles[0];
    const { rerender } = render(<ArticleContent article={article} />);
    await waitFor(() => expect(localStorage.getItem(viewKey)).toBeNull());
    rerender(<ArticleContent article={article} fullPage />);
    await waitFor(() => expect(JSON.parse(localStorage.getItem(viewKey)!).articles[article.slug]).toBe(1));
  });
});
