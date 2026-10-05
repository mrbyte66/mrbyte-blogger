"use client";
/**
 * Browser client for the Spring Boot API (same origin via /api). Cookies carry the opaque session;
 * unsafe methods send the CSRF token. Nothing here stores credentials or tokens in browser storage.
 */
export type FieldError = { field: string; code: string };
export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, readonly title: string, readonly errors: FieldError[] = [], readonly extras: Record<string, unknown> = {}) {
    super(title);
  }
}

let csrf: Promise<{ token: string; headerName: string }> | null = null;
function csrfToken() {
  csrf ??= fetch("/api/v1/auth/csrf", { credentials: "same-origin", cache: "no-store" })
    .then(async (response) => { if (!response.ok) throw new ApiError(response.status, "CSRF_UNAVAILABLE", "Sunucuya ulaşılamadı."); return response.json(); })
    .catch((error) => { csrf = null; throw error; });
  return csrf;
}
/** Login, logout and re-authentication rotate the token; the next unsafe request fetches a fresh one. */
export function resetCsrf() { csrf = null; }

type Options = { body?: unknown; ifMatch?: number | string; idempotent?: boolean; form?: FormData; signal?: AbortSignal };
export type ApiResponse<T> = { data: T; etag: string | null; status: number };

export async function api<T = unknown>(method: string, path: string, options: Options = {}): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const unsafe = method !== "GET" && method !== "HEAD";
  if (unsafe) { const token = await csrfToken(); headers[token.headerName] = token.token; }
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.ifMatch !== undefined) headers["If-Match"] = typeof options.ifMatch === "number" ? `"${options.ifMatch}"` : options.ifMatch;
  if (options.idempotent) headers["Idempotency-Key"] = crypto.randomUUID();
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, { method, headers, credentials: "same-origin", cache: "no-store", signal: options.signal, body: options.form ?? (options.body === undefined ? undefined : JSON.stringify(options.body)) });
  } catch {
    throw new ApiError(0, "NETWORK", "Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.");
  }
  if (response.status === 403 && unsafe) {
    const problem = await problemOf(response);
    if (problem.code === "CSRF_INVALID") { resetCsrf(); if (!(options as { retried?: boolean }).retried) return api<T>(method, path, { ...options, retried: true } as Options); }
    throw problem;
  }
  if (!response.ok) throw await problemOf(response);
  const text = response.status === 204 ? "" : await response.text();
  return { data: (text ? JSON.parse(text) : undefined) as T, etag: response.headers.get("ETag"), status: response.status };
}

async function problemOf(response: Response): Promise<ApiError> {
  try {
    const body = await response.json();
    const { code, title, errors, type: _type, status: _status, requestId: _request, ...extras } = body ?? {};
    return new ApiError(response.status, code ?? "ERROR", title ?? "İşlem tamamlanamadı.", Array.isArray(errors) ? errors : [], extras);
  } catch {
    return new ApiError(response.status, response.status === 503 ? "SERVICE_UNAVAILABLE" : "ERROR", response.status >= 500 ? "Sunucu şu anda yanıt veremiyor." : "İşlem tamamlanamadı.");
  }
}

const fieldLabels: Record<string, string> = {
  title: "başlık", slug: "kalıcı bağlantı", categoryIds: "konu", "document.blocks": "metin", scheduledAt: "yayın zamanı", timeZone: "saat dilimi",
  name: "ad", email: "e-posta", password: "şifre", passwordConfirmation: "şifre tekrarı", avatar: "avatar", "cover.assetId": "kapak görseli",
};
const codeLabels: Record<string, string> = {
  REQUIRED: "gerekli", LENGTH: "uzunluğu geçersiz", FORMAT: "biçimi geçersiz", MISMATCH: "eşleşmiyor", IN_PAST: "gelecekte olmalı",
  PARAGRAPH_REQUIRED: "en az bir paragraf içermeli", MEDIA_NOT_READY: "hazır değil", NOT_PUBLIC: "yayında değil", UNKNOWN_FIELD: "tanınmıyor",
};
/** Human-readable Turkish message for an API failure. */
export function describe(error: unknown): string {
  if (!(error instanceof ApiError)) return "Beklenmeyen bir hata oluştu.";
  if (error.errors.length) {
    const first = error.errors[0];
    const field = fieldLabels[first.field] ?? fieldLabels[first.field.replace(/\[\d+\].*$/, "")] ?? first.field;
    return `${error.title}: ${field} ${codeLabels[first.code] ?? first.code.toLowerCase()}.`;
  }
  return error.title;
}

/** Fetches every page of a list endpoint (small V1 collections). */
export async function allPages<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  for (let page = 0; page < 40; page++) {
    const separator = path.includes("?") ? "&" : "?";
    const { data } = await api<{ items: T[]; totalPages: number }>("GET", `${path}${separator}page=${page}&size=50`);
    items.push(...data.items);
    if (page + 1 >= data.totalPages) break;
  }
  return items;
}

export function browserTimeZone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Istanbul"; } catch { return "Europe/Istanbul"; }
}
