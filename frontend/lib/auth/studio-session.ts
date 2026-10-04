// Server-only: imported by Server Components and Server Actions, never by client UI.
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
export const studioCookie = "mrbyte-studio";
export const studioSessionSeconds = 8 * 60 * 60;
function configuration() {
  const username = process.env.STUDIO_USERNAME;
  const salt = process.env.STUDIO_PASSWORD_SALT;
  const hash = process.env.STUDIO_PASSWORD_HASH;
  const secret = process.env.STUDIO_SESSION_SECRET;
  if (!username || !salt || !hash || !secret || !/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(hash) || secret.length < 64) return null;
  return { username, salt, hash, secret };
}
export function studioConfigured() { return !!configuration(); }
export function verifyStudioCredentials(username: string, password: string) {
  const config = configuration();
  if (!config || username.length > 80 || password.length > 128) return false;
  const derived = scryptSync(password, config.salt, 64);
  const matchesPassword = timingSafeEqual(derived, Buffer.from(config.hash, "hex"));
  return matchesPassword && username === config.username;
}
export function issueStudioSession(now = Date.now()) {
  const config = configuration(); if (!config) throw new Error("Studio is not configured");
  const payload = Buffer.from(JSON.stringify({ nonce: randomBytes(24).toString("hex"), expiresAt: now + studioSessionSeconds * 1000 })).toString("base64url");
  return `${payload}.${createHmac("sha256", config.secret).update(payload).digest("hex")}`;
}
export function validStudioSession(token: string | undefined, now = Date.now()) {
  const config = configuration(); if (!config || !token || token.length > 512) return false;
  const [payload, signature, extra] = token.split(".");
  if (extra || !payload || !signature || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", config.secret).update(payload).digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, "hex"))) return false;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof value.nonce === "string" && /^[a-f0-9]{48}$/.test(value.nonce) && Number.isFinite(value.expiresAt) && value.expiresAt > now && value.expiresAt <= now + studioSessionSeconds * 1000;
  } catch { return false; }
}
