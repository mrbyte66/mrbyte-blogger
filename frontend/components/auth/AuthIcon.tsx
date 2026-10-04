import type { ReactNode } from "react";
export function AuthIcon({ kind }: { kind: "eye" | "hidden" | "close" | "user" | "arrow" }) {
  const paths: Record<typeof kind, ReactNode> = {
    eye: <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    hidden: <><path d="m3 3 18 18M10 5c6-1 10 7 10 7l-3 4M6 6c-3 2-4 6-4 6s3 7 10 7l3-1" /></>,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>,
    arrow: <path d="M19 12H5m6-6-6 6 6 6" />,
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]}</svg>;
}
export function GoogleLogo() {
  return <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.2h6.6c3.9-3.6 6.1-8.9 6.1-15.1Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.2c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20.4 20.4 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.6 27.4a12.3 12.3 0 0 1 0-7.8v-5.3H5.8a20 20 0 0 0 0 18.4l6.8-5.3Z"/><path fill="#EA4335" d="M24 11.2c3 0 5.7 1 7.8 3.1l5.8-5.8A19.5 19.5 0 0 0 24 3 20.4 20.4 0 0 0 5.8 14.3l6.8 5.3c1.6-4.8 6.1-8.4 11.4-8.4Z"/></svg>;
}
