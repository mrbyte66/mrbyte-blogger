import userEvent from "@testing-library/user-event";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ArticleEngagement } from "../components/ArticleEngagement";
import { ArticleContent } from "../components/ArticleContent";
import { ArticleCard } from "../components/ArticleCard";
import { ClapCount } from "../components/ClapCount";
import { ViewCount } from "../components/ViewCount";
import { AuthProvider } from "../components/auth/AuthProvider";
import { SiteDataValues, type ContentState } from "../components/data/SiteData";
import { EngagementProvider } from "../components/engagement/EngagementProvider";
import { createWorkspace } from "../lib/builder/model";
import { articles as fixtures, type Article } from "../lib/content";
import { fakeBackend, settle } from "./support/fake-backend";

const first: Article = { ...fixtures[0], id: "10000000-0000-4000-8000-000000000001", stats: { views: 4, claps: 2, saves: 1 } };
const second: Article = { ...fixtures[1], id: "10000000-0000-4000-8000-000000000002", stats: { views: 1, claps: 3, saves: 0 } };
const draft: Article = { ...fixtures[2], id: "10000000-0000-4000-8000-000000000003", status: "draft" };
const props = { slug: first.slug, title: first.title };
let backend: ReturnType<typeof fakeBackend>;

function Site({ children, articles = [first, second, draft] }: { children: ReactNode; articles?: Article[] }) {
  const content: ContentState = { articles, series: [], ready: true, error: null };
  return <SiteDataValues content={content} workspace={{ workspace: createWorkspace(), save: () => false, ready: true, storageError: null }}>
    <AuthProvider><EngagementProvider>{children}</EngagementProvider></AuthProvider>
  </SiteDataValues>;
}
async function show(ui: ReactNode) { const result = render(<Site>{ui}</Site>); await act(settle); return result; }
async function click(element: HTMLElement) { await act(async () => { fireEvent.click(element); await settle(); }); }
const calls = (method: string, path: string) => backend.state.calls.filter((c) => c.method === method && c.path === path);

beforeEach(() => {
  userEvent.setup();
  localStorage.clear();
  backend = fakeBackend();
  for (const article of [first, second]) backend.state.member.publicArticles.set(article.id!, { slug: article.slug, stats: { ...article.stats! } });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("server claps", () => {
  it("shows server totals, toggles the visitor's own clap and keeps card totals in sync", async () => {
    await show(<><ArticleEngagement {...props} /><ClapCount slugs={[first.slug, second.slug]} series /></>);
    expect(screen.getByLabelText("5 alkış · seri yazılarının toplamı")).toBeTruthy();
    await click(screen.getByRole("button", { name: "Yazıyı alkışla" }));
    expect(screen.getByRole("button", { name: "Alkışını geri al" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByLabelText("6 alkış · seri yazılarının toplamı")).toBeTruthy();
    expect(calls("PUT", `/articles/${first.id}/clap`)[0].body).toEqual({ clapped: true });
    expect(calls("PUT", `/articles/${first.id}/clap`)[0].headers["X-CSRF-TOKEN"]).toBe("csrf-token");
    await click(screen.getByRole("button", { name: "Alkışını geri al" }));
    expect(screen.getByLabelText("5 alkış · seri yazılarının toplamı")).toBeTruthy();
    expect(localStorage.length).toBe(0);
  });

  it("restores the previous state and explains a failed clap", async () => {
    await show(<ArticleEngagement {...props} />);
    backend.state.member.publicArticles.delete(first.id!);
    await click(screen.getByRole("button", { name: "Yazıyı alkışla" }));
    expect(screen.getByRole("alert").textContent).toContain("Bulunamadı");
    expect(screen.getByRole("button", { name: "Yazıyı alkışla" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("never lets Studio preview clap and never invents totals for drafts", async () => {
    await show(<><ArticleEngagement {...props} preview /><ViewCount slugs={[draft.slug]} /></>);
    expect((screen.getByRole("button", { name: "Yazıyı alkışla" }) as HTMLButtonElement).disabled).toBe(true);
    expect(calls("GET", `/articles/${first.id}/my-clap`)).toHaveLength(0);
    expect(screen.getByLabelText("Görüntülenme sayısı yalnız yayındaki yazılarda gösterilir").textContent).toContain("—");
    expect(screen.queryByText("WhatsApp ↗")).toBeNull();
  });
});

describe("permanent article sharing", () => {
  it("copies the canonical article URL and encodes platform URLs", async () => {
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    await show(<ArticleEngagement {...props} />);
    fireEvent.click(screen.getByText("Paylaş"));
    const url = new URL(`/yazilar/${props.slug}`, window.location.origin).href;
    expect(new URL(screen.getByRole("link", { name: "LinkedIn ↗" }).getAttribute("href")!).searchParams.get("url")).toBe(url);
    fireEvent.click(screen.getByRole("button", { name: "Bağlantıyı kopyala" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(url));
    expect(await screen.findByText("Bağlantı kopyalandı.")).toBeTruthy();
  });

  it("offers a selectable URL if clipboard access fails", async () => {
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    await show(<ArticleEngagement {...props} />);
    fireEvent.click(screen.getByText("Paylaş"));
    fireEvent.click(screen.getByRole("button", { name: "Bağlantıyı kopyala" }));
    expect(await screen.findByLabelText("Paylaşılacak bağlantı")).toBeTruthy();
  });
});

describe("reader view counting", () => {
  it("does not count the side panel, counts the permalink once per page view", async () => {
    const { rerender } = await show(<ArticleContent article={first} />);
    expect(calls("POST", "/impressions")).toHaveLength(0);
    rerender(<Site><ArticleContent article={first} fullPage /></Site>);
    await act(settle);
    rerender(<Site><ArticleContent article={{ ...first }} fullPage /></Site>);
    await act(settle);
    const sent = calls("POST", "/impressions");
    expect(sent).toHaveLength(1);
    expect(sent[0].body).toMatchObject({ articleId: first.id, source: "permalink" });
    expect(screen.getByLabelText("5 görüntülenme")).toBeTruthy();
  });

  it("counts a card when 20% is visible, once, and never for previews", async () => {
    const observers: { callback: IntersectionObserverCallback; options?: IntersectionObserverInit }[] = [];
    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) { observers.push({ callback, options }); }
      observe() {} disconnect() {} unobserve() {} takeRecords() { return []; }
    });
    await show(<><ArticleCard article={first} /><ArticleCard article={second} preview /></>);
    expect(observers).toHaveLength(1);
    expect(observers[0].options?.threshold).toBe(0.2);
    await act(async () => { observers[0].callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver); await settle(); });
    await act(async () => { observers[0].callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver); await settle(); });
    const sent = calls("POST", "/impressions");
    expect(sent).toHaveLength(1);
    expect(sent[0].body).toMatchObject({ articleId: first.id, source: "card" });
    expect(typeof sent[0].body?.pageViewId).toBe("string");
  });
});
