import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { CatalogCover } from "../components/CatalogCover";
import { SeriesCatalog } from "../components/series/SeriesCatalog";
import { initialSeries } from "../lib/series/model";

beforeEach(() => localStorage.clear());

describe("catalog cover fallback", () => {
  it("preserves a custom image, recovers from failure, and accepts a replacement", () => {
    const props = { src: "https://example.com/custom.jpg", fallback: "/assets/covers/code.svg" };
    const { container, rerender } = render(<CatalogCover {...props} />);
    expect(container.querySelector("img")?.getAttribute("src")).toBe(props.src);
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")?.getAttribute("src")).toBe(props.fallback);
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
    rerender(<CatalogCover {...props} src="https://example.com/replacement.jpg" />);
    expect(container.querySelector("img")?.getAttribute("src")).toBe("https://example.com/replacement.jpg");
  });

  it("shares series artwork between cards and the editable detail without mutating content", () => {
    const entry = { ...initialSeries[0], coverImage: "/assets/custom.jpg" };
    const { container, rerender } = render(<SeriesCatalog series={[entry]} />);
    expect(container.querySelector(".series-card-visual img")?.getAttribute("src")).toBe(entry.coverImage);
    rerender(<SeriesCatalog series={[entry]} selectedSeriesSlug={entry.slug} />);
    expect(container.querySelector('[data-edit-field="cover"] img')?.getAttribute("src")).toBe(entry.coverImage);
    rerender(<SeriesCatalog series={[{ ...entry, coverImage: undefined }]} selectedSeriesSlug={entry.slug} />);
    expect(container.querySelector('[data-edit-field="cover"] img')?.getAttribute("src")).toBe("/assets/covers/orbit.svg");
    expect(entry.coverImage).toBe("/assets/custom.jpg");
  });
});
