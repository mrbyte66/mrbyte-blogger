import { readFile, writeFile, mkdir } from "node:fs/promises";
import openapiTS, { astToString } from "openapi-typescript";

const source = new URL("../../backend/docs/openapi.yaml", import.meta.url);
const output = new URL("../lib/api/generated.ts", import.meta.url);
const generated = "/** Generated from backend/docs/openapi.yaml. Do not edit; run npm run api:generate. */\n" + astToString(await openapiTS(source));
if (process.argv.includes("--check")) {
  let existing;
  try { existing = await readFile(output, "utf8"); } catch { /* missing output is stale too */ }
  if (existing !== generated) {
    console.error("API types are stale. Run npm run api:generate and commit lib/api/generated.ts.");
    process.exitCode = 1;
  }
} else {
  await mkdir(new URL("../lib/api/", import.meta.url), { recursive: true });
  await writeFile(output, generated);
}
