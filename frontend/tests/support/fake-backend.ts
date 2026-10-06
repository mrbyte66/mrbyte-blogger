import { vi } from "vitest";
import { memberApi, memberApiState } from "./fake-member-api";

type Profile = { id: string; name: string; email: string; verified: boolean; avatar: string | null; role: "member" | "owner"; preferences: { publicationEmail: boolean; timeZone: string }; version: number };
export type Call = { method: string; path: string; body?: Record<string, unknown>; headers: Record<string, string> };

/**
 * Minimal stand-in for the auth/me endpoints of the Spring API, installed as global fetch.
 * Records requests so tests can assert what the browser sent (never storing passwords itself).
 */
export function fakeBackend(options: { signedIn?: Partial<Profile> | null; password?: string } = {}) {
  const account = (patch: Partial<Profile> = {}): Profile => ({ id: "11111111-1111-4111-8111-111111111111", name: "Alice", email: "alice@example.com", verified: true, avatar: null, role: "member", preferences: { publicationEmail: true, timeZone: "Europe/Istanbul" }, version: 0, ...patch });
  const state = {
    profile: options.signedIn === undefined || options.signedIn === null ? null : account(options.signedIn),
    password: options.password ?? "dogru-parola-123",
    accounts: new Map<string, Profile>(),
    calls: [] as Call[],
    connections: [] as { provider: string; connectedAt: string }[],
    member: memberApiState(),
  };
  if (state.profile) state.accounts.set(state.profile.email, state.profile);
  const json = (status: number, body?: unknown) => Promise.resolve(new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { "Content-Type": status >= 400 ? "application/problem+json" : "application/json" } }));
  const problem = (status: number, code: string, title: string) => json(status, { type: `urn:satir:problem:${code}`, title, status, code, requestId: "test" });

  const fetchMock = vi.fn((input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, "http://localhost");
    const method = (init.method ?? "GET").toUpperCase();
    const path = url.pathname.replace(/^\/api\/v1/, "");
    const body = typeof init.body === "string" ? JSON.parse(init.body) : undefined;
    state.calls.push({ method, path, body, headers: { ...(init.headers as Record<string, string> ?? {}) } });
    if (method !== "GET" && !(init.headers as Record<string, string>)?.["X-CSRF-TOKEN"]) return problem(403, "CSRF_INVALID", "Oturum doğrulanamadı");
    const member = memberApi(state.member, method, path, body, (init.headers as Record<string, string>) ?? {}, state.profile?.verified ? state.profile.id : null, json, problem);
    if (member) return member;
    switch (`${method} ${path}`) {
      case "GET /auth/csrf": return json(200, { token: "csrf-token", headerName: "X-CSRF-TOKEN" });
      case "GET /auth/session": return json(200, state.profile ? { authenticated: true, profile: state.profile, expiresAt: new Date(Date.now() + 3_600_000).toISOString() } : { authenticated: false });
      case "GET /me": return state.profile ? json(200, state.profile) : problem(401, "UNAUTHENTICATED", "Giriş yapman gerekiyor");
      case "GET /me/connections": return json(200, { items: state.connections });
      case "POST /auth/login": {
        const found = state.accounts.get(String(body?.identifier).toLowerCase());
        if (!found || body?.password !== state.password) return problem(401, "INVALID_CREDENTIALS", "E-posta, kullanıcı adı veya parola hatalı");
        state.profile = found; return json(200, found);
      }
      case "POST /auth/logout": state.profile = null; return json(204);
      case "POST /auth/register": {
        if (!state.accounts.has(String(body?.email))) state.accounts.set(String(body?.email), account({ id: crypto.randomUUID(), name: String(body?.name), email: String(body?.email), verified: false }));
        return json(202, { message: "E-postanı kontrol et" });
      }
      case "POST /auth/verification/confirm": {
        if (body?.token !== "valid-token") return problem(422, "INVALID_TOKEN", "Bağlantı geçersiz veya süresi dolmuş");
        for (const a of state.accounts.values()) a.verified = true;
        return json(204);
      }
      case "POST /auth/password/forgot": return json(202, { message: "E-postanı kontrol et" });
      case "PATCH /me": {
        if (!state.profile) return problem(401, "UNAUTHENTICATED", "Giriş yapman gerekiyor");
        state.profile = { ...state.profile, name: body?.name ?? state.profile.name, avatar: body?.avatar ?? state.profile.avatar, version: state.profile.version + 1 };
        state.accounts.set(state.profile.email, state.profile);
        return json(200, state.profile);
      }
      case "PUT /me/password": return problem(403, "REAUTH_REQUIRED", "Bu işlem için parolanı yeniden doğrula");
      case "POST /auth/reauthenticate": return body?.password === state.password ? json(200, { validUntil: new Date().toISOString() }) : problem(401, "INVALID_CREDENTIALS", "Parola hatalı");
      default: return problem(404, "NOT_FOUND", "Bulunamadı");
    }
  });
  vi.stubGlobal("fetch", fetchMock);
  return {
    state, fetchMock,
    addAccount(patch: Partial<Profile>) { const created = account(patch); state.accounts.set(created.email, created); return created; },
    /** Simulates a session change made in another tab or device. */
    switchTo(profile: Partial<Profile> | null) { state.profile = profile ? account(profile) : null; },
  };
}

/** Lets pending fetch promises and React updates settle. */
export async function settle() {
  for (let i = 0; i < 5; i++) await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}
