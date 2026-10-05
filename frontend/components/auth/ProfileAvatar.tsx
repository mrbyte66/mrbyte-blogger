import type { CSSProperties } from "react";
import type { AvatarStyle } from "../../lib/auth/model";
export const avatars: { id: AvatarStyle; label: string }[] = [
  { id: "initials", label: "Baş harfler" },
  { id: "round", label: "Sade" },
  { id: "glasses", label: "Gözlüklü" },
  { id: "curly", label: "Kıvırcık" },
  { id: "reader", label: "Okur" },
  { id: "robot", label: "Robot" },
  ...Array.from({ length: 54 }, (_, index) => ({ id: `portrait-${String(index + 1).padStart(2, "0")}` as AvatarStyle, label: `Portre ${String(index + 7).padStart(2, "0")}` })),
];
const legacy = ["round", "glasses", "curly", "reader", "reader", "robot"];
const hair = [
  "M11 16c0-10 18-10 18 0", "M10 16c-4-2-3-7 1-7-1-5 6-7 9-3 4-4 9-1 8 3 5 0 5 6 1 8", "M10 17c-2-13 5-15 10-13 8-2 12 4 10 15l-3-5-2-5c-4 4-9 5-15 4", "M10 16c0-8 3-12 10-12s10 4 10 12v8c-2 2-4 3-5 3V15c-3 2-8 2-10 0v12c-2-1-4-2-5-3Z", "M11 17c-3-4-1-10 4-11 0-5 9-5 10 0 5 1 7 7 4 11l-4-3-4-5-5 5Z", "M10 16c-1-5 2-8 5-8 2-6 10-5 11 0 4 0 6 4 4 8l-4-2-5-5-6 6Z", "M10 14c3-7 17-7 20 0M11 14v3m18-3v3", "M10 15c0-15 20-15 20 0v2H10zM10 14h20", "M10 17c-2-10 4-14 10-14 8 0 12 6 10 14-4-1-7-4-9-7-3 4-6 6-11 7Z", "M10 14v7m20-7v7M10 17H7v7h6m17-7h3v7h-6M12 13c1-6 15-6 16 0" ];
const faces = ["M12 17c0-7 3-10 8-10s8 3 8 10v4c0 5-3 8-8 8s-8-3-8-8Z", "M12 15c1-6 4-9 8-9s7 3 8 9v6c-1 5-4 8-8 8s-7-3-8-8Z", "M11 17c0-7 3-11 9-11s9 4 9 11v4c0 5-4 8-9 8s-9-3-9-8Z", "M12 16c0-6 3-10 8-10s8 4 8 10v6c0 4-3 7-8 7s-8-3-8-7Z", "M12 17c0-8 3-11 8-11s8 3 8 11v4c0 5-3 8-8 8s-8-3-8-8Z", "M13 16c0-6 2-9 7-9s7 3 7 9v6c0 5-3 8-7 8s-7-3-7-8Z"];
export function ProfileAvatar({ name, avatar = "initials" }: { name: string; avatar?: AvatarStyle }) {
  if (avatar === "initials") return <span className="profile-avatar" aria-hidden="true">{name.split(/\s+/).slice(0, 2).map(n => n[0]).join("").toLocaleUpperCase("tr")}</span>;
  const oldIndex = ["round", "glasses", "curly", "reader", "reader", "robot"].indexOf(avatar);
  const variant = oldIndex >= 0 ? oldIndex : Math.max(0, avatars.findIndex(option => option.id === avatar) - 6);
  const hairIndex = variant % hair.length; const faceIndex = Math.floor(variant / 10) % faces.length;
  const glasses = avatar === "glasses" || (oldIndex < 0 && Math.floor(variant / 6) % 4 === 0);
  const robot = avatar === "robot";
  return <span className="profile-avatar" data-avatar={avatar} style={{ "--avatar-wash": `var(--avatar-wash-${variant % 6})` } as CSSProperties} aria-hidden="true"><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {robot ? <><rect x="9" y="11" width="22" height="23" rx="6"/><path d="M20 7v4M7 19v8m26-8v8M15 28h10"/><circle cx="20" cy="5" r="2"/><path d="M15 20v2m10-2v2"/></> : <><path d="M8 36c1-7 6-9 12-9s11 2 12 9"/><path d={faces[faceIndex]}/><path d={hair[hairIndex]}/><path d="M17 24c2 1 4 1 6 0"/>{glasses ? <><circle cx="16" cy="19" r="3"/><circle cx="24" cy="19" r="3"/><path d="M19 19h2"/></> : <path d="M16 19h.01m8 0h.01"/>}{variant % 5 === 2 && <circle cx="29" cy="24" r="1.2"/>}{variant % 7 === 4 && <path d="m20 22 1 1"/>}</>}
  </svg></span>;
}
