/** Same-origin browser transport. Credentials and authorization stay in HttpOnly cookies. */
export class ApiError extends Error {
  constructor(public status: number, public code: string, public retryAfter?: number) {
    super(messages[code] ?? (status === 503 ? "Servise şu anda ulaşılamıyor. Tekrar dene." : "İşlem tamamlanamadı. Tekrar dene."));
  }
}
const messages: Record<string, string> = {
  INVALID_CREDENTIALS: "Giriş bilgileri eşleşmedi.", SESSION_REQUIRED: "Giriş yapman gerekiyor.",
  SESSION_EXPIRED: "Oturumun sona erdi. Tekrar giriş yap.", EMAIL_VERIFICATION_REQUIRED: "Önce e-posta adresini doğrula.",
  MAIL_UNAVAILABLE: "E-posta hizmeti henüz yapılandırılmamış.", MAIL_NOT_CONFIGURED: "E-posta hizmeti henüz yapılandırılmamış.",
  REAUTHENTICATION_REQUIRED: "Bu işlem için şifreni yeniden doğrulamalısın.",
  RATE_LIMITED: "Çok sayıda deneme yapıldı. Biraz sonra tekrar dene.",
  STALE_VERSION: "Kayıt başka bir sekmede değişti. Sayfayı yenileyip tekrar dene.", GOOGLE_NOT_CONFIGURED: "Google bağlantısı henüz yapılandırılmamış.", GOOGLE_UNAVAILABLE: "Google bağlantısı henüz yapılandırılmamış.",
  COVER_PROVIDER_UNAVAILABLE:"Kapak sağlayıcısı henüz yapılandırılmamış.",
  COVER_MODE_CONFLICT:"Önce otomatik kapak seçimini kaydet, sonra ara.",
  INVALID_TOKEN:"Bağlantı geçersiz veya süresi dolmuş.",
  TOKEN_INVALID: "Bağlantı geçersiz veya süresi dolmuş.", VERSION_CONFLICT: "Kayıt başka bir yerde değişti. Yenileyip tekrar dene.",
};
let csrf: Promise<{ token: string; headerName: string }> | undefined;
export function clearCsrf() { csrf = undefined; }
async function decode<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const problem = await response.json().catch(() => ({})) as { code?: string; retryAfter?: number };
    throw new ApiError(response.status, problem.code ?? "REQUEST_FAILED", problem.retryAfter);
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
}
export async function api<T>(path: string, options: { method?: string; body?: unknown; version?: number; idempotencyKey?: string; signal?: AbortSignal; creating?: boolean } = {}): Promise<T> {
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Invalid API path");
  const method = options.method ?? "GET";
  const headers = new Headers({ Accept: "application/json" });
  if (method !== "GET" && method !== "HEAD") {
    csrf ??= fetch("/api/v1/auth/csrf", { credentials: "same-origin", cache: "no-store" }).then(decode<{ token: string; headerName: string }>).catch(error => { clearCsrf(); throw error; });
    const token = await csrf; headers.set(token.headerName, token.token);
  }
  if (options.body !== undefined && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (options.creating) headers.set("If-None-Match", "*");
  if (options.version !== undefined) headers.set("If-Match", `"${options.version}"`);
  if (options.idempotencyKey) headers.set("Idempotency-Key", options.idempotencyKey);
  const response = await fetch(`/api/v1${path}`, { method, headers, body: options.body === undefined ? undefined : options.body instanceof FormData ? options.body : JSON.stringify(options.body), credentials: "same-origin", cache: "no-store", signal: options.signal });
  if(response.status===401&&path!=="/auth/session"&&path!=="/auth/login")window.dispatchEvent(new Event("satir:session-expired"));
  if (response.status === 403) clearCsrf();
  return decode<T>(response);
}
