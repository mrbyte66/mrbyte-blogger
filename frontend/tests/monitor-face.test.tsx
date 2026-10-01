import { createRef } from "react";
import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MonitorFace } from "../components/MonitorFace";

let media: MediaQueryList;
let mediaChanged: (() => void) | undefined;
const figure = createRef<HTMLDivElement>();

beforeEach(() => {
  vi.useFakeTimers();
  mediaChanged = undefined;
  media = { matches: false, addEventListener: vi.fn((_name, callback) => { mediaChanged = callback; }), removeEventListener: vi.fn() } as unknown as MediaQueryList;
  vi.stubGlobal("matchMedia", () => media);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => setTimeout(() => callback(0), 16));
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  Object.defineProperty(document, "hidden", { value: false, configurable: true });
  figure.current = document.createElement("div");
  figure.current.getBoundingClientRect = () => ({ x: 100, y: 100, left: 100, top: 100, width: 600, height: 900, right: 700, bottom: 1000, toJSON: () => ({}) });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("live monitor display", () => {
  it("closes and reopens the eyes on an automatic blink", () => {
    const { container } = render(<MonitorFace ready motionEnabled figure={figure} />);
    const face = container.querySelector("svg")!;
    act(() => vi.advanceTimersByTime(2600));
    expect(face.dataset.blinking).toBe("true");
    act(() => vi.advanceTimersByTime(150));
    expect(face.dataset.blinking).toBe("false");
  });
  it("stops blinking when motion is disabled and clears pending timers", () => {
    const { container, rerender, unmount } = render(<MonitorFace ready motionEnabled figure={figure} />);
    act(() => vi.advanceTimersByTime(2600));
    rerender(<MonitorFace ready motionEnabled={false} figure={figure} />);
    expect(container.querySelector("svg")!.dataset.blinking).toBe("false");
    act(() => vi.advanceTimersByTime(10000));
    expect(container.querySelector("svg")!.dataset.blinking).toBe("false");
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("respects reduced motion, including preference changes while running", () => {
    const { container } = render(<MonitorFace ready motionEnabled figure={figure} />);
    act(() => vi.advanceTimersByTime(2600));
    Object.defineProperty(media, "matches", { value: true });
    act(() => mediaChanged?.());
    act(() => vi.advanceTimersByTime(20000));
    expect(container.querySelector("svg")!.dataset.blinking).toBe("false");
    expect(vi.getTimerCount()).toBe(0);
  });
  it("moves the display toward a mouse and resets when the pointer leaves", () => {
    const { container } = render(<MonitorFace ready motionEnabled figure={figure} />);
    const event = new MouseEvent("pointermove", { clientX: 1000, clientY: 900 });
    Object.defineProperty(event, "pointerType", { value: "mouse" });
    fireEvent(window, event);
    act(() => vi.advanceTimersByTime(16));
    expect(container.querySelector("svg")!.style.getPropertyValue("--gaze-x")).toBe("24px");
    fireEvent(document, new Event("pointerleave"));
    expect(container.querySelector("svg")!.style.getPropertyValue("--gaze-x")).toBe("0px");
  });
  it("pauses in hidden tabs and waits for the character image to load", () => {
    const { container, rerender } = render(<MonitorFace ready={false} motionEnabled figure={figure} />);
    expect(vi.getTimerCount()).toBe(0);
    rerender(<MonitorFace ready motionEnabled figure={figure} />);
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    fireEvent(document, new Event("visibilitychange"));
    expect(vi.getTimerCount()).toBe(0);
    expect(container.querySelector("svg")!.dataset.blinking).toBe("false");
  });
});
