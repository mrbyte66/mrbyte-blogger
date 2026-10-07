import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../components/auth/AuthProvider";
import { AuthPage } from "../components/auth/AuthPage";
import { fakeBackend, settle } from "./support/fake-backend";

const routing = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => routing, usePathname: () => "/giris" }));

function visit(path: string) { window.history.replaceState(null, "", path); }

beforeEach(() => { localStorage.clear(); routing.replace.mockReset(); routing.push.mockReset(); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); visit("/"); });

describe("sign-in and sign-up pages (#34)", () => {
  it("leave the page after returning signed in from Google", async () => {
    fakeBackend({ signedIn: { email: "okur@example.test" } });
    visit("/giris?google=signed_in");
    render(<AuthProvider><AuthPage initial="login" /></AuthProvider>);
    await waitFor(() => expect(routing.replace).toHaveBeenCalledWith("/"));
    expect(screen.queryByRole("button", { name: /giriş yap/i })).toBeNull();
    expect(window.location.search).toBe("");
  });

  it("send an already signed-in visitor of the sign-up page to the same place", async () => {
    fakeBackend({ signedIn: { email: "okur@example.test" } });
    visit("/uye-ol");
    render(<AuthProvider><AuthPage initial="register" /></AuthProvider>);
    await waitFor(() => expect(routing.replace).toHaveBeenCalledWith("/"));
  });

  it("stay on the form with the error when Google fails", async () => {
    fakeBackend();
    visit("/giris?google_error=google_failed");
    render(<AuthProvider><AuthPage initial="login" /></AuthProvider>);
    await settle();
    expect(routing.replace).not.toHaveBeenCalled();
    expect(screen.getByText("Google ile giriş tamamlanamadı.")).toBeTruthy();
  });

  it("show the form to guests", async () => {
    fakeBackend();
    visit("/giris");
    render(<AuthProvider><AuthPage initial="login" /></AuthProvider>);
    await settle();
    expect(routing.replace).not.toHaveBeenCalled();
    expect(document.querySelector("form")).not.toBeNull();
  });
});
