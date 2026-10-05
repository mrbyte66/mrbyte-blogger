import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { PublicationSchedule } from "../components/builder/PublicationSchedule";
import { articles } from "../lib/content";
afterEach(() => { cleanup(); vi.useRealTimers(); });
it("requires a future time and supports rescheduling/cancellation", () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-05T10:00:00.000Z"));
  const schedule = vi.fn(); const cancel = vi.fn();
  function Editor() {
    const [article, setArticle] = useState({ ...articles[0], status: "scheduled" as const, scheduledAt: "2026-10-06T12:00:00.000Z" });
    return <PublicationSchedule article={article} onChange={a => setArticle({ ...a, status: "scheduled", scheduledAt: a.scheduledAt ?? "" })} onSchedule={schedule} onCancel={cancel} disabled={false} />;
  }
  render(<Editor />);
  fireEvent.change(screen.getByLabelText("Yayın tarihi ve saati"), { target: { value: "2026-10-04T12:00" } });
  expect((screen.getByRole("button", { name: "Yayın planını güncelle" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole("alert").textContent).toContain("Bu saat geçti");
  fireEvent.change(screen.getByLabelText("Yayın tarihi ve saati"), { target: { value: "2026-10-07T12:00" } });
  fireEvent.click(screen.getByRole("button", { name: "Yayın planını güncelle" }));
  expect(schedule).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "Planı iptal et · taslağa dön" }));
  expect(cancel).toHaveBeenCalledOnce();
});
