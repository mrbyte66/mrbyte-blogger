import userEvent from "@testing-library/user-event";
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

it("filters draft writing and draft series", () => {
  const navigate = vi.fn();
  const list = [
    { ...articles[0], title: "Yayındaki yazı", status: "published" as const },
    { ...articles[1], title: "Taslak yazı", status: "draft" as const },
    { ...articles[2], title: "Planlı yazı", status: "scheduled" as const, scheduledAt: "2027-01-01T10:00:00.000Z" },
  ];
  const series = [{ ...initialSeries[0], title: "Taslak seri", status: "draft" as const }, { ...initialSeries[1], status: "published" as const }];
  render(<PageNavigator target={{kind:"home"}} articles={list} series={series} ready onNavigate={navigate} onCreateArticle={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", {name:"Sayfalar: Ana sayfa"}));
  fireEvent.change(screen.getByLabelText("İçerik görünümü"), {target:{value:"draft"}});
  expect(within(screen.getByRole("region",{name:"Yazılar"})).getAllByRole("button").map(b => b.textContent)).toEqual(["Taslak yazıTaslak"]);
  expect(within(screen.getByRole("region",{name:"Seriler"})).getAllByRole("button").map(b => b.textContent)).toEqual(["Taslak seriTaslak"]);
  fireEvent.click(screen.getByRole("button",{name:/Taslak yazı/}));
  expect(navigate).toHaveBeenCalledWith({kind:"article",slug:articles[1].slug});
});
it("shows an empty draft state", () => {
  render(<PageNavigator target={{kind:"home"}} articles={[{ ...articles[0], status: "published" as const }]} series={[]} ready onNavigate={vi.fn()} onCreateArticle={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", {name:"Sayfalar: Ana sayfa"}));
  fireEvent.change(screen.getByLabelText("İçerik görünümü"), {target:{value:"draft"}});
  expect(screen.getByText("Taslakta bekleyen yazı veya seri yok.")).toBeTruthy();
});


it("exposes standalone series creation beside writing and closes the menu", () => {
  const createSeries = vi.fn();
  render(<PageNavigator target={{ kind: "home" }} articles={articles} series={initialSeries} ready onNavigate={vi.fn()} onCreateArticle={vi.fn()} onCreateSeries={createSeries} />);
  fireEvent.click(screen.getByRole("button", { name: "Sayfalar: Ana sayfa" }));
  const button = screen.getByRole("button", { name: /Yeni seri/ });
  expect(button.parentElement).toBe(screen.getByRole("button", { name: /Yeni yazı/ }).parentElement);
  fireEvent.click(button);
  expect(createSeries).toHaveBeenCalledOnce();
  expect(screen.queryByRole("navigation", { name: "Sayfalar" })).toBeNull();
});

it("allows keyboard activation of new series", async () => {
  const user = userEvent.setup(); const createSeries = vi.fn();
  render(<PageNavigator target={{ kind: "home" }} articles={articles} series={initialSeries} ready onNavigate={vi.fn()} onCreateArticle={vi.fn()} onCreateSeries={createSeries} />);
  screen.getByRole("button", { name: "Sayfalar: Ana sayfa" }).focus();
  await user.keyboard("{Enter}");
  screen.getByRole("button", { name: /Yeni seri/ }).focus();
  await user.keyboard("{Enter}");
  expect(createSeries).toHaveBeenCalledOnce();
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Sayfalar: Ana sayfa" }));
});
