export function EngagementIcon({ kind }: { kind: "view" | "clap" | "share" | "save" }) {
  return <svg className="engagement-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === "save" ? <path d="M6 3h12v18l-6-4-6 4V3Z" /> : kind === "view" ? <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></> : kind === "share" ? <><path d="M8 16 19 5M10 5h9v9" /><path d="M5 9v10h10" /></> : <><path d="m8 13-3-3a1.4 1.4 0 0 0-2 2l5 6c2 2 5 2 7 0l3-3c1-1 1-3 0-4l-5-6a1.3 1.3 0 0 0-2 1l3 4-5-6a1.3 1.3 0 0 0-2 1l5 6-5-5a1.3 1.3 0 0 0-2 2l5 5" /><path d="m17 3 1-1m2 5 2-1M5 19l-1 2" /></>}
  </svg>;
}
