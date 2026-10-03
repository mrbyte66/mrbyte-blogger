import { afterEach, describe, expect, it, vi } from "vitest";
import { AudioSession, type AudioSnapshot } from "../lib/audio/session";
class Channel {
  static peers = new Set<Channel>();
  static omitRelease = false;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  constructor() { Channel.peers.add(this); }
  postMessage(data: unknown) { if (Channel.omitRelease && (data as { kind: string }).kind === "released") return; for (const peer of Channel.peers) if (peer !== this) peer.onmessage?.({ data }); }
  close() { Channel.peers.delete(this); }
}
afterEach(() => { vi.unstubAllGlobals(); Channel.peers.clear(); Channel.omitRelease = false; });
function installTransport() {
    let held = false;
    const queue: Array<() => void> = [];
    vi.stubGlobal("BroadcastChannel", Channel);
    vi.stubGlobal("navigator", { locks: { request: (_: string, options: { ifAvailable?: boolean; signal?: AbortSignal }, callback: (lock: object | null) => Promise<void>) => new Promise<void>((resolve, reject) => {
      const acquire = () => {
        if (options.signal?.aborted) { reject(new DOMException("cancelled", "AbortError")); queue.shift()?.(); return; }
        held = true;
        void callback({}).then(resolve, reject).finally(() => { held = false; queue.shift()?.(); });
      };
      if (held && options.ifAvailable) { void callback(null).then(resolve, reject); return; }
      if (held) queue.push(acquire); else acquire();
    }) } });
}
describe("shared audio session", () => {
  it("keeps one player, synchronizes a new tab, remotely pauses and resumes, then resumes automatically even when owner closure omits its message", async () => {
    installTransport();
    const initial: AudioSnapshot = { phase: "off", track: 0, time: 0, elapsed: 0 };
    let firstState = { ...initial }, secondState = { ...initial };
    const firstToggle = vi.fn(() => { firstState.phase = firstState.phase === "on" ? "off" : "on"; first.publish(); });
    const first = new AudioSession(() => firstState, s => { firstState = s; }, firstToggle, () => { firstState.phase = "off"; }, s => { firstState = s; });
    first.toggle();
    firstState.time = 83; firstState.elapsed = 83;
    const secondToggle = vi.fn(() => { secondState.phase = "on"; second.publish(); });
    const second = new AudioSession(() => secondState, s => { secondState = { ...s }; }, secondToggle, () => {}, s => { secondState = { ...s }; });
    expect(secondState).toMatchObject({ phase: "on", time: 83 });
    second.toggle();
    expect(secondToggle).not.toHaveBeenCalled();
    expect(firstState.phase).toBe("off");
    expect(secondState.phase).toBe("off");
    second.toggle();
    expect(firstState.phase).toBe("on");
    expect(firstState.time).toBe(83);
    Channel.omitRelease = true;
    first.close(); await Promise.resolve(); await Promise.resolve();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(secondState).toMatchObject({ phase: "on", time: 83 });
    expect(secondToggle).toHaveBeenCalledOnce();
    expect(secondState.time).toBe(83);
    second.close();
  });
  it("lets the clicked tab resume after an unvisited background successor is blocked, across five tabs", async () => {
    installTransport();
    const initial: AudioSnapshot = { phase: "off", track: 0, time: 0, elapsed: 0 };
    function client(deny = false) {
      const model = { state: { ...initial }, playing: false, deny, starts: 0 };
      const session = new AudioSession(() => model.state, state => { model.state = { ...state }; }, () => {
        model.starts++;
        model.playing = !model.deny;
        model.state.phase = model.deny ? "blocked" : "on";
        session.publish();
      }, () => { model.playing = false; }, state => { model.state = { ...state }; });
      return { model, session };
    }
    const first = client(); first.session.toggle();
    first.model.state = { phase: "on", track: 2, time: 127, elapsed: 900 };
    const blocked = client(true), spare = client(), spare2 = client(), foreground = client();
    Channel.omitRelease = true;
    first.session.close();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(blocked.model.starts).toBe(1);
    expect(foreground.model.state).toMatchObject({ phase: "blocked", track: 2, time: 127 });
    foreground.session.toggle();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(foreground.model.playing).toBe(true);
    expect(foreground.model.state).toMatchObject({ track: 2, time: 127, elapsed: 900 });
    expect(blocked.model.starts).toBe(1); // No remote retry in the denied document.
    expect(spare.model.playing || spare2.model.playing).toBe(false);
    for (const peer of [blocked, spare, spare2, foreground]) peer.session.close();
  });

});
