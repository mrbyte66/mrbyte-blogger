import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "../components/auth/AuthProvider";
import { AuthCard } from "../components/auth/AuthCard";
import { AccountMenu } from "../components/auth/AccountMenu";
import { AccountPage } from "../components/auth/AccountPage";
import { SavedProvider, useSavedLibrary } from "../components/saved/SavedProvider";
import { SaveArticleButton } from "../components/saved/SaveArticleButton";
import { fakeBackend, settle } from "./support/fake-backend";
import { SiteDataValues } from "../components/data/SiteData";
import { EngagementProvider } from "../components/engagement/EngagementProvider";
import { createWorkspace } from "../lib/builder/model";
import { articles } from "../lib/content";
import type { ReactNode } from "react";

const savedArticle = { ...articles[0], id: "30000000-0000-4000-8000-000000000001", stats: { views: 0, claps: 0, saves: 0 } };
function Content({ children }: { children: ReactNode }) {
  return <SiteDataValues content={{ articles: [savedArticle], series: [], ready: true, error: null }} workspace={{ workspace: createWorkspace(), save: () => false, ready: true, storageError: null }}>{children}</SiteDataValues>;
}

function Inspector() {
  const auth = useAuth(); const saved = useSavedLibrary();
  return <><output data-testid="identity">{auth.session?.profile.email ?? "guest"}</output><output data-testid="records">{saved.library.entries.length}</output><button onClick={() => void auth.signOut()}>Logout</button><button onClick={() => void saved.save(savedArticle.slug)}>Save</button></>;
}
beforeEach(() => localStorage.clear());
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("server-backed membership", () => {
  it("registers through the API, sends CSRF and never stores the password in the browser", async () => {
    const backend = fakeBackend();
    render(<AuthProvider><AuthCard initial="register" /></AuthProvider>);
    await act(settle);
    fireEvent.change(screen.getByLabelText("Adın"), { target: { value: "Alice" } });
    fireEvent.change(screen.getByLabelText("E-posta"), { target: { value: "alice@example.com" } });
    fireEvent.change(screen.getByLabelText("Şifre", { exact: true }), { target: { value: "never-store-this-42" } });
    fireEvent.change(screen.getByLabelText("Şifre tekrarı"), { target: { value: "different-password" } });
    fireEvent.blur(screen.getByLabelText("Şifre tekrarı"));
    expect(screen.getByText("Şifreler aynı olmalı.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Hesap oluştur" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Şifre tekrarı"), { target: { value: "never-store-this-42" } });
    fireEvent.click(screen.getByRole("button", { name: "Şifreyi göster" }));
    expect((screen.getByLabelText("Şifre", { exact: true }) as HTMLInputElement).type).toBe("text");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Hesap oluştur" })); await settle(); });
    expect(await screen.findByRole("heading", { name: "E-postanı kontrol et" })).toBeTruthy();
    const call = backend.state.calls.find((c) => c.path === "/auth/register")!;
    expect(call.headers["X-CSRF-TOKEN"]).toBe("csrf-token");
    expect(call.body).toMatchObject({ name: "Alice", email: "alice@example.com", passwordConfirmation: "never-store-this-42" });
    expect(Object.values(localStorage).join("")).not.toContain("never-store-this-42");
  });
  it("requires at least 12 characters for new passwords", async () => {
    fakeBackend();
    render(<AuthProvider><AuthCard initial="register" /></AuthProvider>);
    fireEvent.change(screen.getByLabelText("Şifre", { exact: true }), { target: { value: "kisa-sifre" } });
    fireEvent.blur(screen.getByLabelText("Şifre", { exact: true }));
    expect(screen.getByText("En az 12 karakter kullan.")).toBeTruthy();
  });
  it("signs in with the server and reports a generic failure for wrong credentials", async () => {
    const backend = fakeBackend();
    backend.addAccount({ email: "alice@example.com" });
    const complete = vi.fn();
    render(<AuthProvider><AuthCard initial="login" onComplete={complete} /><Inspector /></AuthProvider>);
    await act(settle);
    fireEvent.change(screen.getByLabelText("E-posta veya kullanıcı adı"), { target: { value: "alice@example.com" } });
    fireEvent.change(screen.getByLabelText("Şifre", { exact: true }), { target: { value: "yanlis-parola-123" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Giriş yap" })); await settle(); });
    expect(screen.getByRole("alert").textContent).toContain("hatalı");
    expect(screen.getByTestId("identity").textContent).toBe("guest");
    fireEvent.change(screen.getByLabelText("Şifre", { exact: true }), { target: { value: "dogru-parola-123" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Giriş yap" })); await settle(); });
    expect(complete).toHaveBeenCalledOnce();
    expect(screen.getByTestId("identity").textContent).toBe("alice@example.com");
  });
  it("confirms an e-mail link only after an explicit button press", async () => {
    const backend = fakeBackend();
    window.history.replaceState(null, "", "/eposta-dogrula?token=valid-token");
    render(<AuthProvider><AuthCard initial="verify" /></AuthProvider>);
    await act(settle);
    expect(backend.state.calls.some((c) => c.path === "/auth/verification/confirm")).toBe(false);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "E-postamı doğrula" })); await settle(); });
    expect(await screen.findByRole("heading", { name: "E-postan doğrulandı" })).toBeTruthy();
    window.history.replaceState(null, "", "/");
  });
  it("re-reads the session when another tab changes identity and hides the prior library", async () => {
    const backend = fakeBackend({ signedIn: { email: "alice@example.com" } });
    backend.state.member.publicArticles.set(savedArticle.id, { slug: savedArticle.slug, stats: { views: 0, claps: 0, saves: 0 } });
    render(<Content><AuthProvider><EngagementProvider><SavedProvider><Inspector /></SavedProvider></EngagementProvider></AuthProvider></Content>);
    await act(settle);
    expect(screen.getByTestId("identity").textContent).toBe("alice@example.com");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Save" })); await settle(); });
    expect(screen.getByTestId("records").textContent).toBe("1");
    backend.switchTo({ id: "22222222-2222-4222-8222-222222222222", email: "bob@example.com", name: "Bob" });
    await act(async () => { window.dispatchEvent(new Event("focus")); await settle(); });
    expect(screen.getByTestId("identity").textContent).toBe("bob@example.com");
    expect(screen.getByTestId("records").textContent).toBe("0");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Logout" })); await settle(); });
    expect(screen.getByTestId("identity").textContent).toBe("guest");
    expect(backend.state.calls.some((c) => c.method === "POST" && c.path === "/auth/logout")).toBe(true);
  });
  it("opens an accessible login dialog from a guest bookmark", async () => {
    fakeBackend();
    render(<AuthProvider><SavedProvider><SaveArticleButton slug="yapay-zeka-ile-dusunmek" title="Yazı" /></SavedProvider></AuthProvider>);
    await act(settle);
    fireEvent.click(screen.getByRole("button", { name: "Giriş yap ve yazıyı kaydet: Yazı" }));
    expect(screen.getByRole("dialog", { name: "Hesap erişimi" }).hasAttribute("open")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Giriş penceresini kapat" }));
    expect(screen.queryByRole("dialog", { name: "Hesap erişimi" })).toBeNull();
  });
  it("does not expose Studio to a member", async () => {
    fakeBackend({ signedIn: { email: "alice@example.com", name: "Alice" } });
    render(<AuthProvider><AccountMenu /></AuthProvider>);
    await act(settle);
    fireEvent.click(screen.getByRole("button", { name: "Alice · Hesap menüsü" }));
    expect(screen.queryByRole("link", { name: /Studio/ })).toBeNull();
    expect(screen.getByRole("link", { name: "Hesap" }).getAttribute("href")).toBe("/hesap");
  });
  it("shows Studio only for the server-reported owner role", async () => {
    fakeBackend({ signedIn: { email: "owner@example.com", name: "Sahip", role: "owner" } });
    render(<AuthProvider><AccountMenu /></AuthProvider>);
    await act(settle);
    fireEvent.click(screen.getByRole("button", { name: "Sahip · Hesap menüsü" }));
    expect(screen.getByRole("link", { name: "Studio" }).getAttribute("href")).toBe("/studio");
  });
  it("saves the chosen avatar through the profile API with the current version", async () => {
    const backend = fakeBackend({ signedIn: { email: "alice@example.com" } });
    render(<AuthProvider><AccountPage /></AuthProvider>);
    await act(settle);
    fireEvent.click(screen.getByRole("radio", { name: "Gözlüklü" }));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Değişiklikleri kaydet" })); await settle(); });
    const patch = backend.state.calls.find((c) => c.method === "PATCH" && c.path === "/me")!;
    expect(patch.body).toMatchObject({ avatar: "glasses" });
    expect(patch.headers["If-Match"]).toBe('"0"');
    await waitFor(() => expect((screen.getByRole("radio", { name: "Gözlüklü" }) as HTMLInputElement).checked).toBe(true));
  });
  it("asks to re-authenticate before changing the password", async () => {
    const backend = fakeBackend({ signedIn: { email: "alice@example.com" } });
    render(<AuthProvider><AccountPage /></AuthProvider>);
    await act(settle);
    fireEvent.click(screen.getByRole("button", { name: "Güvenlik" }));
    fireEvent.change(screen.getByLabelText("Yeni şifre"), { target: { value: "yepyeni-parola-22" } });
    fireEvent.change(screen.getByLabelText("Yeni şifre tekrarı"), { target: { value: "yepyeni-parola-22" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Şifreyi değiştir" })); await settle(); });
    expect(screen.getByRole("dialog", { name: "Kimliğini doğrula" }).hasAttribute("open")).toBe(true);
    fireEvent.change(screen.getByLabelText("Şifre"), { target: { value: "dogru-parola-123" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Doğrula ve devam et" })); await settle(); });
    expect(backend.state.calls.filter((c) => c.path === "/me/password")).toHaveLength(2);
    expect(backend.state.calls.some((c) => c.path === "/auth/reauthenticate")).toBe(true);
  });
  it("keeps unverified accounts to verification and sign-out", async () => {
    fakeBackend({ signedIn: { email: "new@example.com", verified: false } });
    render(<AuthProvider><AccountPage /></AuthProvider>);
    await act(settle);
    expect(screen.getByRole("heading", { name: "E-posta adresini doğrula." })).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Hesap bölümleri" })).toBeNull();
  });
});
