import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PageNavigator } from "../components/builder/PageNavigator";
import { articles } from "../lib/content";
import { initialSeries } from "../lib/series/model";
afterEach(cleanup);
it("groups scheduled writing, sorts its dates and opens the selected editor", () => {
  const navigate = vi.fn();
  const planned = [
    { ...articles[0], title: "Uzak yazı", status: "scheduled" as const, scheduledAt: "2027-12-01T10:00:00.000Z" },
    { ...articles[1], title: "Yakın yazı", status: "scheduled" as const, scheduledAt: "2027-01-01T10:00:00.000Z" },
    { ...articles[2], title: "Taslak yazı", status: "draft" as const },
  ];
  render(<PageNavigator target={{kind:"home"}} articles={planned} series={initialSeries} ready onNavigate={navigate} onCreateArticle={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", {name:"Sayfalar: Ana sayfa"}));
  fireEvent.change(screen.getByLabelText("İçerik görünümü"), {target:{value:"scheduled"}});
  expect(screen.queryByRole("region",{name:"Seriler"})).toBeNull();
  const titles = () => within(screen.getByRole("region",{name:"Yazılar"})).getAllByRole("button").map(b => b.textContent);
  expect(titles()[0]).toContain("Yakın yazı");
  expect(screen.queryByText("Taslak yazı")).toBeNull();
  expect(document.querySelectorAll("time[datetime]").length).toBe(2);
  fireEvent.change(screen.getByLabelText("Yayın planı sıralaması"),{target:{value:"farthest"}});
  expect(titles()[0]).toContain("Uzak yazı");
  fireEvent.change(screen.getByLabelText("Yayın planı sıralaması"),{target:{value:"title"}});
  expect(titles()[0]).toContain("Uzak yazı");
  fireEvent.click(screen.getByRole("button",{name:/Yakın yazı/}));
  expect(navigate).toHaveBeenCalledWith({kind:"article",slug:articles[1].slug});
});
it("shows a useful empty planned-writing state", () => {
  render(<PageNavigator target={{kind:"home"}} articles={articles} series={initialSeries} ready onNavigate={vi.fn()} onCreateArticle={vi.fn()} />);
  fireEvent.click(screen.getByRole("button",{name:"Sayfalar: Ana sayfa"}));
  fireEvent.change(screen.getByLabelText("İçerik görünümü"),{target:{value:"scheduled"}});
  expect(screen.getByText("Henüz planlanmış bir yazı yok.")).toBeTruthy();
});

