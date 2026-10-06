import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const routing = { path: "/", refresh: vi.fn() };
vi.mock("next/navigation", () => ({ usePathname: () => routing.path, useRouter: () => ({ refresh: routing.refresh }) }));
import { announceContentChange, PublicContentRefresh } from "../components/data/PublicContentRefresh";

beforeEach(() => { routing.path = "/"; routing.refresh.mockReset(); });
afterEach(() => vi.useRealTimers());

it("re-renders server content when Studio announces a change", () => {
  render(<PublicContentRefresh />);
  act(() => announceContentChange());
  expect(routing.refresh).toHaveBeenCalledTimes(1);
  act(() => announceContentChange());
  expect(routing.refresh).toHaveBeenCalledTimes(2);
});

it("refreshes visitor pages on focus at most every 15 seconds, never Studio", () => {
  vi.useFakeTimers({ now: 1_000_000 });
  const { rerender } = render(<PublicContentRefresh />);
  act(() => { window.dispatchEvent(new Event("focus")); window.dispatchEvent(new Event("focus")); });
  expect(routing.refresh).toHaveBeenCalledTimes(1);
  vi.setSystemTime(1_000_000 + 16_000);
  act(() => { window.dispatchEvent(new Event("focus")); });
  expect(routing.refresh).toHaveBeenCalledTimes(2);
  routing.path = "/studio";
  rerender(<PublicContentRefresh />);
  vi.setSystemTime(1_000_000 + 40_000);
  act(() => { window.dispatchEvent(new Event("focus")); });
  expect(routing.refresh).toHaveBeenCalledTimes(2);
});
