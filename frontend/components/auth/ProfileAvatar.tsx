import type { AvatarStyle } from "../../lib/auth/model";
export const avatars: { id: AvatarStyle; label: string }[] = [{ id: "initials", label: "Baş harfler" }, { id: "round", label: "Sade" }, { id: "glasses", label: "Gözlüklü" }, { id: "curly", label: "Kıvırcık" }, { id: "reader", label: "Okur" }, { id: "robot", label: "Robot" }];
export function ProfileAvatar({ name, avatar = "initials" }: { name: string; avatar?: AvatarStyle }) {
  return <span className="profile-avatar" aria-hidden="true">{avatar === "initials" ? name.split(/\s+/).slice(0, 2).map(n => n[0]).join("").toLocaleUpperCase("tr") : <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {avatar === "robot" ? <><rect x="9" y="11" width="22" height="23" rx="6"/><path d="M20 7v4M7 19v8m26-8v8M15 28h10"/><circle cx="20" cy="5" r="2"/><path d="M15 20v2m10-2v2"/></> : <><path d="M8 36c1-7 6-9 12-9s11 2 12 9"/><path d="M12 15v6c0 5 3 9 8 9s8-4 8-9v-6"/><path d="M17 24c2 1 4 1 6 0"/>
    {avatar === "glasses" ? <><circle cx="16" cy="19" r="3"/><circle cx="24" cy="19" r="3"/><path d="M19 19h2M11 15c0-8 18-10 18 0"/></> : <><path d="M16 19h.01m8 0h.01"/>{avatar === "curly" ? <path d="M11 16c-5-3-2-8 1-7-1-5 6-7 8-3 4-4 9-1 8 3 5 0 6 6 1 8"/> : avatar === "reader" ? <path d="M10 16V9c6-6 16-4 20 3l-10 1-9 4"/> : <path d="M11 16c0-13 18-13 18 0M12 12c5 3 10 3 16 0"/>}</> }</>}
  </svg>}</span>;
}
