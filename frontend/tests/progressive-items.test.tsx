import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SeriesCatalog } from "../components/series/SeriesCatalog";
import { initialSeries } from "../lib/series/model";

afterEach(() => vi.unstubAllGlobals());
const catalog = <SeriesCatalog series={initialSeries} selectedSeriesSlug={initialSeries[0].slug} onOpenSeries={vi.fn()} onOpenArticle={vi.fn()} />;
describe("five-item progressive chapter lists", () => {
  it("offers a keyboard button when observation is unavailable, without changing chapter order", () => {
    const { container } = render(catalog);
    expect(container.querySelectorAll(".series-chapter")).toHaveLength(5);
    expect(screen.getByRole("status").textContent).toBe("5 / 10 bölüm");
    fireEvent.click(screen.getByRole("button", { name: "Sonraki 5 bölümü göster ↓" }));
    expect(container.querySelectorAll(".series-chapter")).toHaveLength(10);
    expect([...container.querySelectorAll(".series-chapter")].map((node) => node.getAttribute("data-article"))).toEqual(initialSeries[0].articleSlugs);
    expect(screen.queryByRole("button", { name: "Sonraki 5 bölümü göster ↓" })).toBeNull();
  });
  it("loads the next five at the sentinel inside the panel scroll container", () => {
    let observed: (entries: { isIntersecting: boolean }[]) => void = () => {};
    let root: Element | null | undefined;
    const disconnect = vi.fn();
    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback: typeof observed, options: IntersectionObserverInit) { observed = callback; root = options.root as Element; }
      observe() {} disconnect = disconnect;
    });
    const { container, unmount } = render(<div className="panel-scroll">{catalog}</div>);
    expect(root).toBe(container.querySelector(".panel-scroll"));
    act(() => observed([{ isIntersecting: false }]));
    expect(container.querySelectorAll(".series-chapter")).toHaveLength(5);
    act(() => observed([{ isIntersecting: true }]));
    expect(container.querySelectorAll(".series-chapter")).toHaveLength(10);
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });
});
