import { scryptSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { issueStudioSession, studioConfigured, validStudioSession, verifyStudioCredentials, studioSessionSeconds } from "../lib/auth/studio-session";
beforeEach(() => {
 const salt = "a".repeat(32);
 vi.stubEnv("STUDIO_USERNAME", "test-owner"); vi.stubEnv("STUDIO_PASSWORD_SALT", salt);
 vi.stubEnv("STUDIO_PASSWORD_HASH", scryptSync("test-only-password", salt, 64).toString("hex"));
 vi.stubEnv("STUDIO_SESSION_SECRET", "b".repeat(64));
});
afterEach(() => vi.unstubAllEnvs());
describe("server verified Studio access", () => {
 it("accepts only matching credentials, not a browser membership flag", () => {
  expect(verifyStudioCredentials("test-owner", "test-only-password")).toBe(true);
  expect(verifyStudioCredentials("someone", "test-only-password")).toBe(false);
  expect(verifyStudioCredentials("test-owner", "incorrect")).toBe(false);
  expect(validStudioSession(JSON.stringify({ role: "owner" }))).toBe(false);
 });
 it("rejects tampered and expired tokens", () => {
  const now = 1900000000000; const token = issueStudioSession(now);
  expect(validStudioSession(token, now)).toBe(true);
  expect(validStudioSession(token, now + studioSessionSeconds * 1000)).toBe(false);
  expect(validStudioSession(token + ".extra", now)).toBe(false);
  const [payload, signature] = token.split(".");
  expect(validStudioSession(`${payload.slice(0, -1)}A.${signature}`, now)).toBe(false);
 });
 it("fails closed when server configuration is missing", () => {
  vi.stubEnv("STUDIO_SESSION_SECRET", "");
  expect(studioConfigured()).toBe(false);
  expect(validStudioSession("anything")).toBe(false);
  expect(verifyStudioCredentials("test-owner", "test-only-password")).toBe(false);
 });
});
