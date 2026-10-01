import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(cleanup);
// jsdom lacks native dialog methods. Browser checks cover focus/inert behavior.
HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
