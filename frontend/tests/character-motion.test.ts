import { describe, expect, it } from "vitest";
import { getScreenGaze } from "../lib/character-motion";

const bounds = { left: 300, top: 50, width: 600, height: 900 };
describe("screen gaze", () => {
  it("looks forward when the pointer is centred between the lenses", () => {
    expect(getScreenGaze(300 + 600 * .442, 50 + 900 * .388, bounds)).toEqual({ x: 0, y: 0 });
  });
  it("follows the pointer horizontally and vertically", () => {
    expect(getScreenGaze(1000, 200, bounds).x).toBeGreaterThan(0);
    expect(getScreenGaze(100, 200, bounds).x).toBeLessThan(0);
    expect(getScreenGaze(600, 100, bounds).y).toBeLessThan(0);
    expect(getScreenGaze(600, 800, bounds).y).toBeGreaterThan(0);
  });
  it("keeps the eyes inside the lenses at extreme pointer positions", () => {
    expect(getScreenGaze(10000, -10000, bounds)).toEqual({ x: 24, y: -17 });
    expect(getScreenGaze(-10000, 10000, bounds)).toEqual({ x: -24, y: 17 });
    expect(Object.values(getScreenGaze(1, 1, { left: 0, top: 0, width: 0, height: 0 })).every(Number.isFinite)).toBe(true);
  });
});
