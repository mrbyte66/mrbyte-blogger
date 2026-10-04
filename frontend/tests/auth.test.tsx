import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "../components/auth/AuthProvider";
import { AuthCard } from "../components/auth/AuthCard";
import { AccountMenu } from "../components/auth/AccountMenu";
import { AccountPage } from "../components/auth/AccountPage";
import { SavedProvider, useSavedLibrary } from "../components/saved/SavedProvider";
import { SaveArticleButton } from "../components/saved/SaveArticleButton";
import { parseSession, profilesKey, sessionDuration, sessionKey, type DemoProfile } from "../lib/auth/model";
import { savedKey } from "../lib/saved/model";
const profile: DemoProfile = { id: "alice", name: "Alice", email: "alice@example.com", verified: true, googleConnected: false, role: "member" };
function stored(p = profile) { return JSON.stringify({ version: 1, profile: p, startedAt: Date.now(), expiresAt: Date.now() + sessionDuration }); }
function Inspector() {
 const auth = useAuth(); const saved = useSavedLibrary();
 return <><output data-testid="identity">{auth.session?.profile.id ?? "guest"}</output><output data-testid="records">{saved.library.entries.length}</output><button onClick={() => auth.enterDemo("alice@example.com")}>Alice</button><button onClick={() => auth.enterDemo("bob@example.com")}>Bob</button><button onClick={auth.signOut}>Logout</button><button onClick={() => saved.save("yapay-zeka-ile-dusunmek")}>Save</button></>;
}
beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());
describe("browser demo membership", () => {
 it("rejects malformed, expired or unsupported sessions", () => {
  expect(parseSession("bad")).toBeNull();
  expect(parseSession(JSON.stringify({ version: 1, profile, startedAt: 1, expiresAt: 2 }))).toBeNull();
  expect(parseSession(stored({ ...profile, role: "admin" as "member" }))).toBeNull();
  expect(parseSession(stored())?.profile.id).toBe("alice");
 });
 it("keeps profiles across login while never storing password fields", async () => {
  const complete = vi.fn(); render(<AuthProvider><AuthCard initial="register" onComplete={complete} /></AuthProvider>);
  fireEvent.change(screen.getByLabelText("Adın"), { target: { value: "Alice" } });
  fireEvent.change(screen.getByLabelText("E-posta"), { target: { value: "alice@example.com" } });
  fireEvent.change(screen.getByLabelText("Şifre", { exact: true }), { target: { value: "never-store-this-42" } });
  fireEvent.change(screen.getByLabelText("Şifre tekrarı"), { target: { value: "different-password" } });
  fireEvent.blur(screen.getByLabelText("Şifre tekrarı"));
  expect(screen.getByText("Şifreler aynı olmalı.")).toBeTruthy();
  expect((screen.getByRole("button", { name: "Demo hesap oluştur" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText("Şifre tekrarı"), { target: { value: "never-store-this-42" } });
  fireEvent.click(screen.getByRole("button", { name: "Şifreyi göster" }));
  expect((screen.getByLabelText("Şifre", { exact: true }) as HTMLInputElement).type).toBe("text");
  fireEvent.click(screen.getByRole("button", { name: "Demo hesap oluştur" }));
  await screen.findByRole("heading", { name: "Son bir küçük adım" });
  expect(localStorage.getItem(profilesKey)).not.toContain("never-store-this-42");
  expect(parseSession(localStorage.getItem(sessionKey))?.profile.verified).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Doğrulamayı önizle" }));
  await waitFor(() => expect(complete).toHaveBeenCalledOnce());
  expect(parseSession(localStorage.getItem(sessionKey))?.profile.verified).toBe(true);
 });
 it("updates session, profile and logout from another tab, without revealing the prior library", () => {
  localStorage.setItem(sessionKey, stored());
  render(<AuthProvider><SavedProvider><Inspector /></SavedProvider></AuthProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(screen.getByTestId("records").textContent).toBe("1");
  act(() => { localStorage.setItem(sessionKey, stored({ ...profile, id: "bob", email: "bob@example.com" })); window.dispatchEvent(new StorageEvent("storage", { key: sessionKey })); });
  expect(screen.getByTestId("identity").textContent).toBe("bob");
  expect(screen.getByTestId("records").textContent).toBe("0");
  act(() => { localStorage.removeItem(sessionKey); window.dispatchEvent(new StorageEvent("storage", { key: sessionKey })); });
  expect(screen.getByTestId("identity").textContent).toBe("guest");
  expect(localStorage.getItem(`${savedKey}:alice`)).toContain("yapay-zeka-ile-dusunmek");
 });
 it("isolates collections across demo accounts and restores them on subsequent login", () => {
  render(<AuthProvider><SavedProvider><Inspector /></SavedProvider></AuthProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Alice" }));
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  const id = parseSession(localStorage.getItem(sessionKey))!.profile.id;
  fireEvent.click(screen.getByRole("button", { name: "Logout" }));
  fireEvent.click(screen.getByRole("button", { name: "Bob" }));
  expect(screen.getByTestId("records").textContent).toBe("0");
  fireEvent.click(screen.getByRole("button", { name: "Alice" }));
  expect(screen.getByTestId("identity").textContent).toBe(id);
  expect(screen.getByTestId("records").textContent).toBe("1");
 });
 it("opens an accessible login dialog from a guest bookmark", () => {
  render(<AuthProvider><SavedProvider><SaveArticleButton slug="yapay-zeka-ile-dusunmek" title="Yazı" /></SavedProvider></AuthProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Giriş yap ve yazıyı kaydet: Yazı" }));
  expect(screen.getByRole("dialog", { name: "Hesap erişimi" }).hasAttribute("open")).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Giriş penceresini kapat" }));
  expect(screen.queryByRole("dialog", { name: "Hesap erişimi" })).toBeNull();
 });
 it("does not expose Studio to a member or render the editor", () => {
  localStorage.setItem(sessionKey, stored());
  render(<AuthProvider><AccountMenu /></AuthProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Alice · Hesap menüsü" }));
  expect(screen.queryByRole("link", { name: /Studio/ })).toBeNull();
  expect(screen.getByRole("link", { name: "Hesap" }).getAttribute("href")).toBe("/hesap");
  expect(screen.queryByText("Editor secret")).toBeNull();
  expect(screen.queryByRole("button", { name: "Sahip önizlemesini aç" })).toBeNull();
 });
 it("persists a chosen avatar and restores it across session updates", () => {
  localStorage.setItem(sessionKey, stored()); localStorage.setItem(profilesKey, JSON.stringify([profile]));
  render(<AuthProvider><AccountPage /></AuthProvider>);
  fireEvent.click(screen.getByRole("radio", { name: "Gözlüklü" }));
  fireEvent.click(screen.getByRole("button", { name: "Değişiklikleri kaydet" }));
  expect(parseSession(localStorage.getItem(sessionKey))?.profile.avatar).toBe("glasses");
  expect(JSON.parse(localStorage.getItem(profilesKey)!)[0].avatar).toBe("glasses");
  act(() => { localStorage.setItem(sessionKey, stored({ ...profile, avatar: "robot" })); window.dispatchEvent(new StorageEvent("storage", { key: sessionKey })); });
  expect((screen.getByRole("radio", { name: "Robot" }) as HTMLInputElement).checked).toBe(true);
 });
 it("requires explicit confirmation before deleting a demo profile and its private library", () => {
  localStorage.setItem(sessionKey, stored()); localStorage.setItem(profilesKey, JSON.stringify([profile]));
  localStorage.setItem(`${savedKey}:alice`, "private-library");
  render(<AuthProvider><AccountPage /></AuthProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Demo hesabı sil" }));
  const button = screen.getByRole("button", { name: "Hesabı sil" }) as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  fireEvent.change(screen.getByLabelText("E-posta adresin"), { target: { value: "alice@example.com" } });
  fireEvent.click(button);
  expect(localStorage.getItem(sessionKey)).toBeNull(); expect(localStorage.getItem(`${savedKey}:alice`)).toBeNull();
  expect(JSON.parse(localStorage.getItem(profilesKey)!)).toEqual([]);
 });
 it("reports failed storage without pretending login succeeded", async () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("quota"); });
  render(<AuthProvider><Inspector /></AuthProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Alice" }));
  expect(screen.getByTestId("identity").textContent).toBe("guest");
 });
});

it("rolls back a new profile if only the session write fails", () => {
 const setItem = Storage.prototype.setItem;
 vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) { if (key === sessionKey) throw new DOMException("quota"); setItem.call(this, key, value); });
 render(<AuthProvider><Inspector /></AuthProvider>);
 fireEvent.click(screen.getByRole("button", { name: "Alice" }));
 expect(localStorage.getItem(profilesKey)).toBeNull();
 expect(screen.getByTestId("identity").textContent).toBe("guest");
});
