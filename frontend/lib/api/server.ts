import "server-only";
import { cookies } from "next/headers";
/** Fixed internal origin; never derive backend URLs from incoming Host headers. */
export function backendOrigin() {
  const url = new URL(process.env.BACKEND_INTERNAL_URL ?? "http://127.0.0.1:8080");
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("Invalid BACKEND_INTERNAL_URL");
  return url.origin;
}
export async function serverApi(path: string, authenticated = false) {
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Invalid API path");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (authenticated) headers.Cookie = (await cookies()).toString();
  return fetch(`${backendOrigin()}/api/v1${path}`, { headers, cache: "no-store", signal: AbortSignal.timeout(10000) });
}
export async function hasStudioAccess() {
  try {
    const response = await serverApi("/auth/session", true);
    if (!response.ok) return false;
    const data = await response.json();
    return data.authenticated === true && data.profile?.role === "owner" && data.profile?.verified === true;
  } catch { return false; }
}
