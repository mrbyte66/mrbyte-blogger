import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RouteMotion, SlideLink } from "../components/SlideLink";

const routing = vi.hoisted(() => ({ path: "/", push: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => routing.path, useRouter: () => ({ push: routing.push }) }));
const original = Object.getOwnPropertyDescriptor(document, "startViewTransition");
beforeEach(() => {
  routing.path = "/"; routing.push.mockClear();
  document.documentElement.dataset.motion = "on";
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
  Object.defineProperty(document, "startViewTransition", { configurable: true, value: undefined });
});
afterEach(() => {
  vi.unstubAllGlobals(); vi.useRealTimers();
  if (original) Object.defineProperty(document, "startViewTransition", original);
  else Reflect.deleteProperty(document, "startViewTransition");
  delete document.documentElement.dataset.motion;
});
const first = <RouteMotion><h1>Eski sayfa</h1><SlideLink href="/yazilar/ornek">Yazıyı aç</SlideLink></RouteMotion>;

describe("permalink cover navigation", () => {
  it("slides an inert old page aside when native view transitions are unavailable", () => {
    vi.useFakeTimers();
    const { container, rerender } = render(first);
    fireEvent.click(screen.getByRole("link", { name: "Yazıyı aç" }));
    expect(routing.push).toHaveBeenCalledWith("/yazilar/ornek");
    expect(container.querySelector(".route-previous")?.hasAttribute("inert")).toBe(true);
    routing.path = "/yazilar/ornek";
    rerender(<RouteMotion><h1>Yeni sayfa</h1></RouteMotion>);
    expect(screen.getByRole("heading", { name: "Yeni sayfa" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Eski sayfa" })).toBeNull();
    expect(container.querySelector(".route-current.route-sliding")).not.toBeNull();
    act(() => vi.advanceTimersByTime(460));
    expect(container.querySelector(".route-previous")).toBeNull();
  });
  it("holds a native snapshot until the new route has committed", async () => {
    let committed: Promise<void> | undefined;
    const start = vi.fn((update: () => Promise<void>) => { committed = update(); });
    Object.defineProperty(document, "startViewTransition", { configurable: true, value: start });
    const { rerender } = render(first);
    fireEvent.click(screen.getByRole("link", { name: "Yazıyı aç" }));
    expect(start).toHaveBeenCalledOnce();
    expect(routing.push).toHaveBeenCalledWith("/yazilar/ornek");
    routing.path = "/yazilar/ornek";
    rerender(<RouteMotion><h1>Yeni sayfa</h1></RouteMotion>);
    await committed;
  });
  it("respects motion-off without creating a snapshot", () => {
    document.documentElement.dataset.motion = "off";
    const { container } = render(first);
    fireEvent.click(screen.getByRole("link", { name: "Yazıyı aç" }));
    expect(routing.push).toHaveBeenCalledOnce();
    expect(container.querySelector(".route-previous")).toBeNull();
  });
});
