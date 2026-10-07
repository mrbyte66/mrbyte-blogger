import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// Polling avoids the file-watcher limit in the local desktop sandbox. PORT picks another port (default 3000).
const port = process.env.PORT || "3000";
const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "--webpack", "--hostname", "127.0.0.1", "--port", port], {
  stdio: "inherit",
  env: { ...process.env, WATCHPACK_POLLING: "true" },
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 0; });
