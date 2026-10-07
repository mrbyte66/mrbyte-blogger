import { useReducer } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithSite as render } from "./support/memory-site";
import { beforeEach, describe, expect, it } from "vitest";
import { ContentPanel } from "../components/ContentPanel";
import { initialNavigation, navigate } from "../lib/navigation";

function Reader() {
  const [navigation, dispatch] = useReducer(navigate, { ...initialNavigation, section: "writing", articleSlug: "yapay-zeka-ile-dusunmek", topic: "Yazılım" });
  return <ContentPanel navigation={navigation} dispatch={dispatch} />;
}
function touch(element: Element, type: string, x: number, y: number) {
  const event = new Event(type, { bubbles: true });
  Object.assign(event, { pointerType: "touch", pointerId: 1, clientX: x, clientY: y });
  fireEvent(element, event);
}

describe("reader return shortcuts", () => {
  beforeEach(() => { localStorage.clear(); });
  it("keeps header tabs keyboard accessible without sliding catalog content", () => {
    const { container } = render(<Reader />);
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    const articles = screen.getByRole("tab", { name: "Yazılar", selected: true });
    articles.focus();
    fireEvent.keyDown(articles, { key: "ArrowRight" });
    const series = screen.getByRole("tab", { name: "Seriler", selected: true });
    expect(document.activeElement).toBe(series);
    expect(container.querySelector(".cover-changing")).toBeNull();
    fireEvent.click(series);
    expect(container.querySelector(".click-ripple")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /YZ ile düşün, yaz ve geliştir/ }));
    expect(container.querySelector(".cover-changing")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "İlk bölümden başla" }));
    expect(container.querySelector(".cover-changing")).not.toBeNull();
  });
  it("returns from a series chapter to its chapters, then its catalog, then the scene", () => {
    render(<Reader />);
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    fireEvent.click(screen.getByRole("tab", { name: "Seriler" }));
    fireEvent.click(screen.getByRole("button", { name: /YZ ile düşün, yaz ve geliştir/ }));
    fireEvent.click(screen.getByRole("button", { name: "İlk bölümden başla" }));
    expect(screen.getByRole("button", { name: "Bölümlere dön" })).toBeTruthy();
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(screen.getByRole("heading", { name: "YZ ile düşün, yaz ve geliştir" })).toBeTruthy();
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(screen.getByRole("heading", { name: "Seriler" })).toBeTruthy();
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("returns to the filtered list on Escape, then closes on a second Escape", () => {
    render(<Reader />);
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(screen.getByRole("heading", { name: "Yazılar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yazılım", pressed: true })).toBeTruthy();
    expect(screen.queryByText("Satır aralarında bir yer")).toBeNull();
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("returns with Alt+Left without changing the selected category", () => {
    render(<Reader />);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowLeft", altKey: true });
    expect(screen.getByRole("heading", { name: "Yazılar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yazılım", pressed: true })).toBeTruthy();
  });
  it("accepts a deliberate rightward edge swipe, ignoring vertical scroll and cancellation", () => {
    const { container } = render(<Reader />);
    const edge = container.querySelector(".panel-swipe-edge") as HTMLElement;
    edge.setPointerCapture = () => {};
    touch(edge, "pointerdown", 10, 200);
    touch(edge, "pointerup", 130, 300);
    expect(screen.getByRole("heading", { name: "Yapay zekâ ile düşünmek" })).toBeTruthy();
    touch(edge, "pointerdown", 10, 200);
    touch(edge, "pointercancel", 100, 200);
    touch(edge, "pointerup", 130, 200);
    expect(screen.getByRole("heading", { name: "Yapay zekâ ile düşünmek" })).toBeTruthy();
    touch(edge, "pointerdown", 10, 200);
    touch(edge, "pointermove", 130, 210);
    touch(edge, "pointerup", 130, 210);
    expect(screen.getByRole("heading", { name: "Yazılar" })).toBeTruthy();
  });
});
