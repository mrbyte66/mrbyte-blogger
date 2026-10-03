"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AudioSession, type AudioSnapshot } from "../../lib/audio/session";
import { listeningLimit, mozartTracks } from "../../lib/audio/mozart";

type Phase = AudioSnapshot["phase"];
type Player = { phase: Phase; track: number; toggle: () => void };
const AudioContext = createContext<Player>({ phase: "off", track: 0, toggle: () => {} });
export function AmbientAudioProvider({ children }: { children: ReactNode }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [phase, setPhase] = useState<Phase>("off");
  const [track, setTrack] = useState(0);
  const index = useRef(0);
  const elapsed = useRef(0);
  const previousTime = useRef(0);
  const requested = useRef(false);
  const operation = useRef(0);
  const session = useRef<AudioSession | null>(null);
  const phaseRef = useRef<Phase>("off");
  const resumeTime = useRef(0);
  const restorePending = useRef(false);
  function updatePhase(value: Phase) { phaseRef.current = value; setPhase(value); session.current?.publish(); }
  const actions = useRef({ toggle, pause });
  actions.current = { toggle, pause };
  useEffect(() => {
    if (window.parent !== window) return;
    const connect = () => new AudioSession(
      () => ({ phase: phaseRef.current, track: index.current, time: !restorePending.current && audio.current?.getAttribute("src") ? audio.current.currentTime : resumeTime.current, elapsed: elapsed.current }),
      state => { phaseRef.current = state.phase; setPhase(state.phase); setTrack(state.track); },
      () => actions.current.toggle(),
      () => actions.current.pause(),
      (state: AudioSnapshot) => { restorePending.current = true; index.current = state.track; elapsed.current = state.elapsed; resumeTime.current = state.time; previousTime.current = state.time; },
    );
    let coordinator = connect();
    session.current = coordinator;
    const close = () => coordinator.close();
    const reopen = (event: PageTransitionEvent) => { if (event.persisted) { coordinator = connect(); session.current = coordinator; } };
    const refresh = () => { if (document.visibilityState === "visible") coordinator.refresh(); };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("pageshow", reopen);
    window.addEventListener("pagehide", close);
    return () => { document.removeEventListener("visibilitychange", refresh); window.removeEventListener("pagehide", close); window.removeEventListener("pageshow", reopen); coordinator.close(); session.current = null; };
  }, []);
  useEffect(() => { if (audio.current) audio.current.volume = .22; return () => { requested.current = false; operation.current++; audio.current?.pause(); }; }, []);
  function pause() { requested.current = false; operation.current++; audio.current?.pause(); updatePhase("off"); }
  async function start() {
    const player = audio.current;
    if (!player) return;
    const token = ++operation.current;
    requested.current = true;
    if (!player.getAttribute("src") || restorePending.current) {
      player.src = mozartTracks[index.current].src;
      player.currentTime = resumeTime.current;
      previousTime.current = resumeTime.current;
      restorePending.current = false;
    }
    updatePhase("loading");
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([player.play(), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Audio timeout")), 20000); })]);
      if (token === operation.current && requested.current) updatePhase("on");
    } catch (error) { if (token === operation.current && requested.current) { requested.current = false; player.pause(); updatePhase(error instanceof DOMException && error.name === "NotAllowedError" ? "blocked" : "error"); } }
    finally { clearTimeout(timer); }
  }
  function toggle() {
    if (requested.current) { pause(); return; }
    if (elapsed.current >= listeningLimit) {
      elapsed.current = 0; previousTime.current = 0; resumeTime.current = 0; index.current = 0; setTrack(0);
      if (audio.current) { audio.current.src = mozartTracks[0].src; audio.current.load(); }
    }
    void start();
  }
  function measure() {
    const player = audio.current;
    if (!player) return;
    if (requested.current) elapsed.current += Math.max(0, player.currentTime - previousTime.current);
    previousTime.current = player.currentTime;
    session.current?.publish();
    if (elapsed.current >= listeningLimit) pause();
  }
  function next() {
    measure();
    if (!requested.current || !audio.current) return;
    index.current = (index.current + 1) % mozartTracks.length; setTrack(index.current);
    previousTime.current = 0; audio.current.src = mozartTracks[index.current].src; audio.current.load(); void start();
  }
  return <AudioContext.Provider value={{ phase, track, toggle: () => session.current ? session.current.toggle() : toggle() }}>{children}<audio ref={audio} preload="none" onTimeUpdate={measure} onEnded={next} onPlaying={() => { if (requested.current) updatePhase("on"); }} onWaiting={() => { if (requested.current) updatePhase("loading"); }} onError={() => { if (requested.current) { requested.current = false; operation.current++; updatePhase("error"); } }} /></AudioContext.Provider>;
}
export function AmbientAudioToggle({ embedded = false, scene = false }: { embedded?: boolean; scene?: boolean }) {
  const { phase, track, toggle } = useContext(AudioContext);
  const [insideFrame, setInsideFrame] = useState(false);
  useEffect(() => { setInsideFrame(window.parent !== window); }, []);
  if (insideFrame) return null;
  const enabled = phase === "on" || phase === "loading";
  return <div className={`ambient-player ${scene ? "ambient-scene" : embedded ? "ambient-embedded" : "ambient-global"}`}>
    <button type="button" className="ambient-toggle" aria-label={enabled ? "Mozart müziğini kapat" : phase === "blocked" ? "Mozart müziğine devam et" : phase === "error" ? "Mozart müziğini yeniden dene" : "Mozart müziğini aç"} aria-pressed={enabled} aria-busy={phase === "loading"} onClick={toggle} title={`${phase === "blocked" ? "Aynı yerden devam et" : enabled ? "Sesi kapat" : "Sesi aç"} · Mozart · 40 dakika`}>
      {phase === "on" ? <span className="ambient-equalizer" aria-hidden="true"><i /><i /><i /><i /></span> : <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4 6 8H3v8h3l5 4V4Z" />{enabled ? <><path d="M15 8c2 2 2 6 0 8M18 5c4 4 4 10 0 14" /></> : <path d="m16 9 5 6m0-6-5 6" />}</svg>}
      {scene && <span className="ambient-label">{phase === "blocked" ? "Devam et" : `Müzik ${enabled ? "açık" : "kapalı"}`}</span>}
    </button>
    <div className="ambient-caption"><span>Wolfgang Amadeus Mozart</span><p>1756–1791. Klasik dönemin bestecisi; senfonileri, operaları ve piyano eserleriyle tanınır.</p><a href={mozartTracks[track].source} target="_blank" rel="noopener noreferrer">Musopen Symphony ↗</a></div>
    {phase === "blocked" && <p className="ambient-error" role="status">Müzik diğer sekmeden devralındı. Aynı yerden devam etmek için dokun.</p>}
    {phase === "error" && <p className="ambient-error" role="alert">Müzik yüklenemedi. Yeniden deneyebilirsin.</p>}
  </div>;
}
