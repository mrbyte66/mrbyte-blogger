import type { components, operations } from "./generated";

/** Wire types have a single source: backend/docs/openapi.yaml. UI models stay separate. */
export type Schema<Name extends keyof components["schemas"]> = components["schemas"][Name];
type JsonBody<Body> = Body extends { content: { "application/json": infer Value } } ? Value : never;
export type Input<Name extends keyof operations> = operations[Name] extends { requestBody?: infer Body } ? JsonBody<NonNullable<Body>> : never;
type SuccessStatus<Name extends keyof operations> = {
  [Status in keyof operations[Name]["responses"]]: Status extends number ? `${Status}` extends `2${string}` ? Status : never : never;
}[keyof operations[Name]["responses"]];
export type Output<Name extends keyof operations, Status extends keyof operations[Name]["responses"] = SuccessStatus<Name>> = JsonBody<operations[Name]["responses"][Status]>;
/** Pagination is a transport abstraction, derived from an existing wire schema. */
export type Page<T> = Omit<Schema<"ArticleSummaryPage">, "items"> & { items: T[] };
