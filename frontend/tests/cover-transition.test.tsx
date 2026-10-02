import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CoverTransition } from "../components/CoverTransition";

describe("cover transition accessibility", () => {
  it("replaces catalog content directly when cover motion is disabled", () => {
    const { container, rerender } = render(<CoverTransition viewKey="articles" backward={false} animate={false}><h2>Yazılar</h2></CoverTransition>);
    rerender(<CoverTransition viewKey="series" backward={false} animate={false}><h2>Seriler</h2></CoverTransition>);
    expect(container.querySelector(".cover-previous")).toBeNull();
    expect(container.querySelector(".cover-changing")).toBeNull();
    expect(screen.getByRole("heading", { name: "Seriler" })).toBeTruthy();
  });
  it("keeps old content as an inert snapshot while only the new view is accessible", () => {
    const { container, rerender } = render(<CoverTransition viewKey="list" backward={false}><h2 id="panel-title">Yazılar</h2><button>Bir yazı aç</button></CoverTransition>);
    rerender(<CoverTransition viewKey="article" backward={false}><h2 id="panel-title">Bir yazı</h2><button>Geri dön</button></CoverTransition>);
    expect(container.querySelector(".cover-previous")?.hasAttribute("inert")).toBe(true);
    expect(container.querySelectorAll("#panel-title")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Bir yazı aç" })).toBeNull();
    expect(screen.getByRole("button", { name: "Geri dön" })).toBeTruthy();
    rerender(<CoverTransition viewKey="list" backward><h2 id="panel-title">Yazılar</h2><button>Bir yazı aç</button></CoverTransition>);
    expect(container.querySelector(".cover-back")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Bir yazı aç" })).toBeTruthy();
  });
});
