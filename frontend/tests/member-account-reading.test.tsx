import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AuthProvider } from "../components/auth/AuthProvider";
import { ReadingTools } from "../components/reading/ReadingTools";
import { readReadingDocument, writeReadingDocument } from "../lib/reading/storage";
import { useMemberVisit } from "../lib/reading/history";
import { articles } from "../lib/content";
import { fakeBackend, settle } from "./support/fake-backend";
import { personalOf } from "./support/fake-member-api";

const ARTICLE = "40000000-0000-4000-8000-000000000001";
const BLOCK = "40000000-0000-4000-8000-0000000000b1";
const server = { id: ARTICLE, revisionId: "rev-1", blockIds: { paragraphs: [BLOCK] } };
const guestMark = { id: "guest-1", kind: "highlight" as const, note: "", createdAt: "2026-10-04T12:00:00.000Z", fragments: [{ anchorId: "paragraph-0", start: 0, end: 5, quote: "Hello", before: "", after: " world" }] };
let backend: ReturnType<typeof fakeBackend>;

function Page() {
  return <AuthProvider><article id="reading-content"><p data-reading-anchor="excerpt">Özet</p><p data-reading-anchor={BLOCK} data-reading-legacy="paragraph-0">Hello world</p></article>
    <ReadingTools articleId="sample" contentRootId="reading-content" server={server} /></AuthProvider>;
}
beforeEach(() => {
  localStorage.clear();
  backend = fakeBackend({ signedIn: { id: "reader-1", email: "reader@example.com" } });
  backend.state.member.publicArticles.set(ARTICLE, { slug: "sample", stats: { views: 0, claps: 0, saves: 0 } });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("loads a verified member's marks from the account, never from browser storage", async () => {
  personalOf(backend.state.member, "reader-1").marks.push({ id: "m-1", articleId: ARTICLE, kind: "note", revisionId: "rev-1", note: "Hesaptaki not", createdAt: "2026-10-05T10:00:00Z", version: 0, fragments: [{ blockId: BLOCK, start: 0, end: 5, quote: "Hello", before: "", after: "" }] });
  render(<Page />);
  await act(settle);
  expect(screen.getByText("1 kayıt")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Notlar/ }));
  expect(screen.getByText("Hesaptaki not")).toBeTruthy();
  expect(screen.getByText(/hesabında saklanır/)).toBeTruthy();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "1. kaydı kaldır" })); await settle(); });
  expect(backend.state.calls.some((c) => c.method === "DELETE" && c.path === `/me/articles/${ARTICLE}/annotations/m-1`)).toBe(true);
  expect(personalOf(backend.state.member, "reader-1").marks).toEqual([]);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Son kaldırmayı geri al/ })); await settle(); });
  const undo = backend.state.calls.find((c) => c.method === "PUT" && c.path === `/me/articles/${ARTICLE}/annotations/m-1`);
  expect(undo?.headers["If-None-Match"]).toBe("*");
  expect(undo?.body?.fragments).toEqual([{ blockId: BLOCK, start: 0, end: 5, quote: "Hello", before: "", after: "" }]);
  expect(localStorage.length).toBe(0);
});

it("imports guest marks only when the member asks, translating legacy anchors", async () => {
  writeReadingDocument({ version: 1, articleId: "sample", marks: [guestMark] });
  render(<Page />);
  await act(settle);
  expect(screen.getByText("0 kayıt")).toBeTruthy();
  expect(backend.state.calls.some((c) => c.path === "/me/imports/annotations")).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: /Notlar/ }));
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Misafir notlarını hesabıma aktar" })); await settle(); });
  const request = backend.state.calls.find((c) => c.path === "/me/imports/annotations");
  expect(request?.body?.items).toEqual([expect.objectContaining({ articleId: ARTICLE, revisionId: "rev-1", fragments: [expect.objectContaining({ blockId: BLOCK, quote: "Hello" })] })]);
  expect(readReadingDocument("sample").document.marks).toEqual([]);
  expect(screen.getByText("1 kayıt")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Misafir notlarını hesabıma aktar" })).toBeNull();
});

it("keeps guests on browser-only notes", async () => {
  backend.switchTo(null);
  writeReadingDocument({ version: 1, articleId: "sample", marks: [guestMark] });
  render(<Page />);
  await act(settle);
  expect(screen.getByText("1 kayıt")).toBeTruthy();
  expect(backend.state.calls.some((c) => c.path.startsWith("/me/"))).toBe(false);
});

it("records a permalink visit for verified members only", async () => {
  function Visit() { useMemberVisit({ ...articles[0], id: ARTICLE, revisionId: "rev-1" }); return null; }
  render(<AuthProvider><Visit /></AuthProvider>);
  await act(settle);
  expect(personalOf(backend.state.member, "reader-1").visits).toEqual([{ articleId: ARTICLE, revisionId: "rev-1" }]);
  backend.switchTo({ id: "pending-1", email: "pending@example.com", verified: false });
  render(<AuthProvider><Visit /></AuthProvider>);
  await act(settle);
  expect(personalOf(backend.state.member, "pending-1").visits).toEqual([]);
});
