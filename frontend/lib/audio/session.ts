/** One tab owns the audio; other same-origin tabs are remote controls. */
export type AudioSnapshot = { phase: "off" | "loading" | "on" | "error" | "blocked"; track: number; time: number; elapsed: number };
type Message = { kind: "query" | "toggle" } | { kind: "state" | "released"; snapshot: AudioSnapshot };
const channelName = "mrbyte:ambient:v1";
export class AudioSession {
  private channel: BroadcastChannel | null = null;
  private release: (() => void) | null = null;
  private owner = false;
  private disposed = false;
  private handoff: AbortController | null = null;
  constructor(private read: () => AudioSnapshot, private receive: (state: AudioSnapshot) => void, private localToggle: () => void, private stop: () => void, private restore: (state: AudioSnapshot) => void) {
    if (typeof BroadcastChannel !== "undefined" && navigator.locks) {
      this.channel = new BroadcastChannel(channelName);
      this.channel.onmessage = ({ data }: MessageEvent<Message>) => {
        if (data?.kind === "query" && this.owner) this.publish();
        if (data?.kind === "toggle" && this.owner) this.localToggle();
        if ((data?.kind === "state" || data?.kind === "released") && !this.owner && validSnapshot(data.snapshot)) {
          this.restore(data.snapshot); this.receive(data.snapshot);
          if (["on", "loading"].includes(data.snapshot.phase)) {
            if (!this.handoff) this.takeOver();
          } else { this.handoff?.abort(); this.handoff = null; }
        }
      };
      this.channel.postMessage({ kind: "query" });
    }
  }
  toggle() {
    if (this.disposed) return;
    this.handoff?.abort(); this.handoff = null;
    if (this.owner || !this.channel) { this.localToggle(); return; }
    // A lock, not message timing, prevents simultaneous starts in different tabs.
    void navigator.locks.request(channelName, { ifAvailable: true }, async lock => {
      if (this.disposed) return;
      if (!lock) { this.channel?.postMessage({ kind: "toggle" }); return; }
      this.owner = true;
      await new Promise<void>(resolve => { this.release = resolve; this.localToggle(); });
      this.owner = false;
    }).catch(() => { if (!this.disposed) this.receive({ ...this.read(), phase: "blocked" }); });
  }
  private takeOver() {
    const controller = new AbortController();
    this.handoff = controller;
    // Wait on the owner lock while music is active: tab termination can omit
    // pagehide messages, but the browser still releases its Web Lock.
    void navigator.locks.request(channelName, { signal: controller.signal }, async lock => {
      if (this.handoff === controller) this.handoff = null;
      if (!lock || this.disposed || !["on", "loading"].includes(this.read().phase)) return;
      this.owner = true;
      await new Promise<void>(resolve => { this.release = resolve; this.localToggle(); });
      this.owner = false;
    }).catch(error => { if (error?.name !== "AbortError" && !this.disposed) this.receive({ ...this.read(), phase: "blocked" }); }).finally(() => { if (this.handoff === controller) this.handoff = null; });
  }
  publish() {
    if (!this.owner || this.disposed) return;
    const snapshot = this.read();
    this.channel?.postMessage({ kind: "state", snapshot });
    // A denied/background player must not retain the lock: a click in another
    // document must start media there, where that click grants playback access.
    if (snapshot.phase === "blocked" || snapshot.phase === "error") {
      this.owner = false;
      this.release?.(); this.release = null;
    }
  }
  refresh() {
    if (!this.disposed) this.channel?.postMessage({ kind: "query" });
  }
  close() {
    if (this.disposed) return;
    this.disposed = true;
    this.handoff?.abort(); this.handoff = null;
    if (this.owner) {
      const snapshot = { ...this.read() };
      this.stop(); this.channel?.postMessage({ kind: "released", snapshot });
    }
    this.channel?.close(); this.release?.(); this.release = null;
  }
}
function validSnapshot(s: AudioSnapshot): boolean {
  return !!s && ["off", "loading", "on", "error", "blocked"].includes(s.phase) && Number.isInteger(s.track) && s.track >= 0 && s.track < 4 && Number.isFinite(s.time) && s.time >= 0 && Number.isFinite(s.elapsed) && s.elapsed >= 0 && s.elapsed <= 2500;
}
