import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { AudioSnapshot } from "../lib/audio/session";
import { AmbientAudioProvider, AmbientAudioToggle } from "../components/audio/AmbientAudio";
import { mozartTracks } from "../lib/audio/mozart";
const transport = vi.hoisted(() => ({ receive: (_: AudioSnapshot) => {}, restore: (_: AudioSnapshot) => {} }));
vi.mock("../lib/audio/session", () => ({ AudioSession: class {
  constructor(_read: unknown, receive: typeof transport.receive, private localToggle: () => void, _stop: unknown, restore: typeof transport.restore) { transport.receive = receive; transport.restore = restore; }
  toggle() { this.localToggle(); }
  publish() {} close() {} refresh() {}
} }));
afterEach(() => vi.restoreAllMocks());
it("replaces stale local media with the latest shared track and position before resuming", async () => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  const { container } = render(<AmbientAudioProvider><AmbientAudioToggle /></AmbientAudioProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Mozart müziğini aç" }));
  await act(async () => {});
  const audio = container.querySelector("audio")!;
  audio.currentTime = 10;
  fireEvent.click(screen.getByRole("button", { name: "Mozart müziğini kapat" }));
  act(() => {
    const shared: AudioSnapshot = { phase: "blocked", track: 2, time: 127, elapsed: 900 };
    transport.restore(shared); transport.receive(shared);
  });
  fireEvent.click(screen.getByRole("button", { name: "Mozart müziğine devam et" }));
  await act(async () => {});
  expect(audio.src).toBe(mozartTracks[2].src);
  expect(audio.currentTime).toBe(127);
});
