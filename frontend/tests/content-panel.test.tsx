import { useReducer } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ContentPanel } from "../components/ContentPanel";
import { articles } from "../lib/content";
import { initialNavigation, navigate } from "../lib/navigation";

function Harness() {
  const [navigation, dispatch] = useReducer(navigate, { ...initialNavigation, section: "writing" });
  return <ContentPanel navigation={navigation} dispatch={dispatch} />;
}

describe("reading panel", () => {
  it("filters, opens a text and returns to the same filtered list", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Edebiyat" }));
    expect(screen.queryByText("Yapay zekâ ile düşünmek")).toBeNull();
    await user.click(screen.getByRole("button", { name: /Satır aralarında bir yer/ }));
    expect(screen.getByRole("heading", { name: "Satır aralarında bir yer" })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Satır aralarında bir yer" }));
    await user.click(screen.getByRole("button", { name: /Bütün yazılar/ }));
    expect(screen.getByRole("button", { name: "Edebiyat" }).getAttribute("aria-pressed")).toBe("true");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /Satır aralarında bir yer/ }));
    expect(screen.queryByText("Yapay zekâ ile düşünmek")).toBeNull();
  });
  it("copies the displayed code verbatim", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: /Yapay zekâ ile düşünmek/ }));
    await user.click(screen.getByRole("button", { name: "Kodu kopyala" }));
    expect(await navigator.clipboard.readText()).toBe(articles[0].code);
    expect(screen.getByRole("button", { name: "Kopyalandı" })).toBeTruthy();
  });
  it("restores the list scroll position after reading a later article", async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness />);
    const scrollArea = container.querySelector(".panel-scroll")!;
    scrollArea.scrollTop = 280;
    await user.click(screen.getByRole("button", { name: /Merak da bir alışkanlık/ }));
    expect(scrollArea.scrollTop).toBe(0);
    await user.click(screen.getByRole("button", { name: /Bütün yazılar/ }));
    expect(scrollArea.scrollTop).toBe(280);
  });
  it("reports clipboard failures without falsely claiming success", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(new Error("Denied"));
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: /Yapay zekâ ile düşünmek/ }));
    await user.click(screen.getByRole("button", { name: "Kodu kopyala" }));
    expect(screen.getByRole("status").textContent).toContain("Kopyalanamadı");
    expect(screen.queryByRole("button", { name: "Kopyalandı" })).toBeNull();
  });
  it("closes in response to native Escape cancellation", () => {
    render(<Harness />);
    const dialog = screen.getByRole("dialog");
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(dialog.hasAttribute("open")).toBe(false);
  });
});
