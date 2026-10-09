/** Compile-only regression checks: schema drift must fail typecheck, without a runtime test. */
import type { Input, Output, Schema } from "../lib/api/contract";

const login = { identifier: "reader@example.com", password: "password" } satisfies Input<"login">;
// @ts-expect-error Login requires a password (not only an identifier).
const missingPassword: Input<"login"> = { identifier: "reader@example.com" };
// @ts-expect-error Client roles must never be part of a registration request.
const clientRole = { name: "Reader", email: "reader@example.com", password: "password", passwordConfirmation: "password", role: "owner" } satisfies Input<"register">;
// @ts-expect-error An unknown publication action must fail compilation.
const invalidAction = { action: "publish-now" } satisfies Input<"studioArticleAction">;
const bookmark = {} satisfies Input<"saveBookmark">;
const publicRole: Schema<"Profile">["role"] = "member";
const categoryName: Output<"studioListCategories">["items"][number]["name"] = "Bilim";
void [login, missingPassword, clientRole, invalidAction, bookmark, publicRole, categoryName];

// @ts-expect-error Logout has no JSON request body.
const logoutBody: Input<"logout"> = {};
const createdName: Output<"studioCreateCategory">["name"] = "Tarih";
void [logoutBody, createdName];
