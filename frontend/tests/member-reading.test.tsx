import { act, render, screen } from "@testing-library/react";
import { beforeEach, expect, it } from "vitest";
import { AuthProvider } from "../components/auth/AuthProvider";
import { ReadingTools } from "../components/reading/ReadingTools";
import { readingStorageKey, readReadingDocument, writeReadingDocument } from "../lib/reading/storage";
import { afterEach, vi } from "vitest";
import { fakeBackend, settle } from "./support/fake-backend";
const documentData = { version: 1 as const, articleId: "sample", marks: [{ id: "mark-1", kind: "note" as const, note: "Alice private", createdAt: "2026-10-04T12:00:00.000Z", fragments: [{ anchorId: "paragraph-0", start: 0, end: 5, quote: "Hello", before: "", after: " world" }] }] };
beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());
it("keeps guest annotations separate from member annotations", () => {
 writeReadingDocument(documentData);
 expect(readReadingDocument("sample", "alice").document.marks).toEqual([]);
 writeReadingDocument({ ...documentData, marks: [] }, "alice");
 expect(readReadingDocument("sample").document.marks).toHaveLength(1);
 expect(readingStorageKey("sample", "alice")).not.toBe(readingStorageKey("sample"));
});
it("clears the previous member's visible notes when another tab changes identity", async () => {
 const backend = fakeBackend({ signedIn: { id: "alice", email: "alice@example.com" } });
 writeReadingDocument(documentData, "alice");
 render(<AuthProvider><article id="reading-content"><p data-reading-anchor="paragraph-0">Hello world</p></article><ReadingTools articleId="sample" contentRootId="reading-content" /></AuthProvider>);
 await act(settle);
 expect(screen.getByText("1 kayıt")).toBeTruthy();
 backend.switchTo({ id: "bob", email: "bob@example.com" });
 await act(async () => { window.dispatchEvent(new Event("focus")); await settle(); });
 expect(screen.getByText("0 kayıt")).toBeTruthy();
 expect(readReadingDocument("sample", "alice").document.marks).toHaveLength(1);
});
