import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SeriesProperties } from "../components/builder/SeriesProperties";
import { DocumentActions } from "../components/builder/DocumentActions";
import { initialSeries } from "../lib/series/model";
import { articles } from "../lib/content";
afterEach(cleanup);
it("explains why a published series with only hidden chapters is absent", () => {
  const series = { ...initialSeries[0], articleSlugs: [articles[0].slug] };
  render(<SeriesProperties series={series} collection={[series]} articles={[{ ...articles[0], status: "draft" }]} field="meta" onChange={vi.fn()} />);
  expect(screen.getByRole("note").textContent).toContain("yayında bölüm yok");
});
it("does not warn when a public published chapter exists", () => {
  const series = { ...initialSeries[0], articleSlugs: [articles[0].slug] };
  render(<SeriesProperties series={series} collection={[series]} articles={[{ ...articles[0], status: "published", visibility: "public" }]} field="meta" onChange={vi.fn()} />);
  expect(screen.queryByRole("note")).toBeNull();
});
it("shows the series notice alongside the enabled publication action", () => {
  render(<DocumentActions status="draft" disabled={false} canPublish publishHint="Mevsimler serisi de yayınlanacak." onSave={vi.fn()} />);
  screen.getByRole("group").setAttribute("open", "");
  expect(screen.getByRole("button", { name: "Yayına al" }).hasAttribute("disabled")).toBe(false);
  expect(screen.getByRole("note").textContent).toBe("Mevsimler serisi de yayınlanacak.");
});
