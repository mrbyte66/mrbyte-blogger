/** Browser-only UI demo. These records are not credentials or server authorization. */
export const sessionKey = "mrbyte:demo-session:v1";
export const profilesKey = "mrbyte:demo-profiles:v1";
export const sessionDuration = 7 * 24 * 60 * 60 * 1000;
export const avatarStyles = ["initials", "round", "glasses", "curly", "reader", "robot", "portrait-01", "portrait-02", "portrait-03", "portrait-04", "portrait-05", "portrait-06", "portrait-07", "portrait-08", "portrait-09", "portrait-10", "portrait-11", "portrait-12", "portrait-13", "portrait-14", "portrait-15", "portrait-16", "portrait-17", "portrait-18", "portrait-19", "portrait-20", "portrait-21", "portrait-22", "portrait-23", "portrait-24", "portrait-25", "portrait-26", "portrait-27", "portrait-28", "portrait-29", "portrait-30", "portrait-31", "portrait-32", "portrait-33", "portrait-34", "portrait-35", "portrait-36", "portrait-37", "portrait-38", "portrait-39", "portrait-40", "portrait-41", "portrait-42", "portrait-43", "portrait-44", "portrait-45", "portrait-46", "portrait-47", "portrait-48", "portrait-49", "portrait-50", "portrait-51", "portrait-52", "portrait-53", "portrait-54"] as const;
export type AvatarStyle = typeof avatarStyles[number];
export type DemoProfile = { id: string; name: string; avatar?: AvatarStyle; publicationEmail?: boolean; email: string; verified: boolean; googleConnected: boolean; role: "member" | "owner" };
export type DemoSession = { version: 1; profile: DemoProfile; startedAt: number; expiresAt: number };
export type AuthScreen = "login" | "register" | "forgot" | "reset" | "verify";
export function validEmail(email: string) { return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
export function validProfile(value: unknown): value is DemoProfile {
  if (!value || typeof value !== "object") return false;
  const p = value as DemoProfile;
  return typeof p.id === "string" && /^[a-zA-Z0-9-]{1,64}$/.test(p.id) && typeof p.name === "string" && p.name.trim().length > 0 && p.name.length <= 80 && typeof p.email === "string" && validEmail(p.email) && typeof p.verified === "boolean" && typeof p.googleConnected === "boolean" && (p.role === "member" || p.role === "owner") && (p.avatar === undefined || avatarStyles.includes(p.avatar)) && (p.publicationEmail === undefined || typeof p.publicationEmail === "boolean");
}
export function parseSession(raw: string | null, now = Date.now()): DemoSession | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as DemoSession;
    if (s.version !== 1 || !validProfile(s.profile) || !Number.isFinite(s.startedAt) || !Number.isFinite(s.expiresAt) || s.startedAt > now || s.expiresAt <= now || s.expiresAt <= s.startedAt || s.expiresAt - s.startedAt > sessionDuration) return null;
    return s;
  } catch { return null; }
}
export function readProfiles(raw: string | null): DemoProfile[] {
  if (!raw) return [];
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data) || data.length > 100 || !data.every(validProfile) || new Set(data.map(p => p.email)).size !== data.length || new Set(data.map(p => p.id)).size !== data.length) throw new Error("Demo hesap verisi okunamadı.");
  return data;
}
export function passwordStrength(password: string) {
  if (!password) return 0;
  return Math.min(4, Number(password.length >= 8) + Number(password.length >= 12) + Number(/[a-z]/i.test(password) && /\d/.test(password)) + Number(/[^a-z\d]/i.test(password)));
}
