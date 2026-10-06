import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "../components/auth/AuthProvider";
import { AuthCard } from "../components/auth/AuthCard";
import { AccountMenu } from "../components/auth/AccountMenu";
import { clearCsrf } from "../lib/api/client";
const profile = { id: "00000000-0000-0000-0000-000000000001", name: "Alice", email: "alice@example.com", role: "member", verified: true, avatar: "glasses", version: 0, preferences: { publicationEmail: true, timeZone: "Europe/Istanbul" } };
let authenticated = false; let failed = false; let requests: { url: string; init?: RequestInit }[] = [];
function Inspector() { const auth = useAuth(); return <><output data-testid="identity">{auth.session?.profile.name ?? "guest"}</output><button onClick={() => void auth.login("alice@example.com", "never-store-this-42")}>Login</button><button onClick={() => void auth.signOut()}>Logout</button>{auth.error && <p role="alert">{auth.error}</p>}</>; }
beforeEach(() => {
 localStorage.clear(); clearCsrf(); authenticated = false; failed = false; requests = [];
 vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
  requests.push({ url, init });
  if(url.endsWith("/auth/csrf")) return Response.json({ token: "test-csrf", headerName: "X-CSRF-TOKEN" });
  if(url.endsWith("/auth/session")) return Response.json(authenticated ? { authenticated: true, profile, expiresAt: new Date(Date.now() + 3600000).toISOString() } : { authenticated: false });
  if(url.endsWith("/auth/login")) { if(failed) return Response.json({ code: "INVALID_CREDENTIALS" }, { status: 401 }); authenticated = true; return Response.json(profile); }
  if(url.endsWith("/auth/logout")) { authenticated = false; return new Response(null, { status: 204 }); }
  if(url.endsWith("/auth/register")) return Response.json({ message: "E-postanı kontrol et" }, { status: 202 });
  throw new Error("Unexpected request: " + url);
 }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("server membership", () => {
 it("ignores forged browser roles and creates only a server-confirmed session", async () => {
  localStorage.setItem("mrbyte:demo-session:v1", JSON.stringify({ profile: { role: "owner" } }));
  render(<AuthProvider><Inspector /></AuthProvider>);
  await waitFor(() => expect(requests.some(r => r.url.endsWith("/auth/session"))).toBe(true));
  expect(screen.getByTestId("identity").textContent).toBe("guest");
  fireEvent.click(screen.getByRole("button", { name: "Login" }));
  await waitFor(() => expect(screen.getByTestId("identity").textContent).toBe("Alice"));
  const login = requests.find(r => r.url.endsWith("/auth/login"))!;
  expect(new Headers(login.init?.headers).get("X-CSRF-TOKEN")).toBe("test-csrf");
  expect(login.init?.credentials).toBe("same-origin");
  expect(Object.values(localStorage).join()).not.toContain("never-store-this-42");
  fireEvent.click(screen.getByRole("button", { name: "Logout" }));
  await waitFor(() => expect(screen.getByTestId("identity").textContent).toBe("guest"));
 });
 it("reports rejected credentials without creating a fake session", async () => {
  failed = true; render(<AuthProvider><Inspector /></AuthProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Login" }));
  await screen.findByRole("alert"); expect(screen.getByTestId("identity").textContent).toBe("guest");
 });
 it("registers matching passwords and waits for email confirmation without logging in", async () => {
  render(<AuthProvider><AuthCard initial="register" /></AuthProvider>);
  fireEvent.change(screen.getByLabelText("Adın"), { target: { value: "Alice" } });
  fireEvent.change(screen.getByLabelText("E-posta"), { target: { value: "alice@example.com" } });
  fireEvent.change(screen.getByLabelText("Şifre", { exact: true }), { target: { value: "never-store-this-42" } });
  fireEvent.change(screen.getByLabelText("Şifre tekrarı"), { target: { value: "wrong" } });
  expect((screen.getByRole("button", { name: "Hesap oluştur" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText("Şifre tekrarı"), { target: { value: "never-store-this-42" } });
  fireEvent.click(screen.getByRole("button", { name: "Hesap oluştur" }));
  await screen.findByRole("heading", { name: "Son bir küçük adım" });
  expect(requests.some(r => r.url.endsWith("/auth/login"))).toBe(false);
  expect(localStorage.length).toBe(0);
 });
 it("refreshes server session on focus and hides Studio from members", async () => {
  authenticated = true; render(<AuthProvider><AccountMenu /><Inspector /></AuthProvider>);
  fireEvent.click(await screen.findByRole("button", { name: "Alice · Hesap menüsü" }));
  expect(screen.queryByRole("link", { name: /Studio/ })).toBeNull();
  authenticated = false; act(() => window.dispatchEvent(new Event("focus")));
  await waitFor(() => expect(screen.getByTestId("identity").textContent).toBe("guest"));
 });
 it("does not announce a successful login when session confirmation is unavailable", async () => {
  let sessionRequests=0;
  const original=fetch;
  vi.stubGlobal("fetch",vi.fn(async (url:string,init?:RequestInit)=>{if(url.endsWith("/auth/session")&&++sessionRequests>1)throw new TypeError("Network unavailable");return original(url,init);}));
  render(<AuthProvider><Inspector /></AuthProvider>);
  await waitFor(()=>expect(sessionRequests).toBe(1));
  fireEvent.click(screen.getByRole("button",{name:"Login"}));
  await screen.findByRole("alert");
  expect(screen.getByTestId("identity").textContent).toBe("guest");
 });
 it("ignores a delayed owner session after logout", async () => {
  authenticated=true;render(<AuthProvider><Inspector /></AuthProvider>);
  await waitFor(()=>expect(screen.getByTestId("identity").textContent).toBe("Alice"));
  const original=fetch;let resolve!:(response:Response)=>void;
  vi.stubGlobal("fetch",vi.fn((url:string,init?:RequestInit)=>url.endsWith("/auth/session")?new Promise<Response>(complete=>{resolve=complete;}):original(url,init)));
  act(()=>window.dispatchEvent(new Event("focus")));
  fireEvent.click(screen.getByRole("button",{name:"Logout"}));
  await waitFor(()=>expect(screen.getByTestId("identity").textContent).toBe("guest"));
  await act(async()=>resolve(Response.json({authenticated:true,profile:{...profile,role:"owner"},expiresAt:new Date(Date.now()+3600000).toISOString()})));
  expect(screen.getByTestId("identity").textContent).toBe("guest");
 });

});
