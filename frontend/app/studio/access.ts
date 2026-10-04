"use server";
import { cookies } from "next/headers";
import { issueStudioSession, studioConfigured, studioCookie, studioSessionSeconds, verifyStudioCredentials } from "../../lib/auth/studio-session";
// Local single-process throttle. Distributed throttling belongs to Spring Boot.
const attempts: { count: number; resetAt: number } = { count: 0, resetAt: 0 };
export async function loginStudio(username: string, password: string): Promise<{ ok: boolean; message: string }> {
  if (!studioConfigured()) return { ok: false, message: "Studio giriş ayarları sunucuda tanımlanmamış." };
  const now = Date.now();
  if (now >= attempts.resetAt) { attempts.count = 0; attempts.resetAt = now + 5 * 60 * 1000; }
  if (attempts.count >= 5) return { ok: false, message: "Çok sayıda deneme yapıldı. Birkaç dakika sonra tekrar dene." };
  if (typeof username !== "string" || typeof password !== "string" || !verifyStudioCredentials(username, password)) { attempts.count += 1; return { ok: false, message: "Kullanıcı adı veya şifre eşleşmedi." }; }
  attempts.count = 0;
  (await cookies()).set(studioCookie, issueStudioSession(), { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: studioSessionSeconds });
  return { ok: true, message: "" };
}
export async function logoutStudio() { (await cookies()).delete(studioCookie); }
