import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
process.chdir(root);

const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 22 || (major === 22 && minor < 12)) {
  console.error("Please install Node.js 24 LTS from https://nodejs.org and try again.");
  process.exit(1);
}

const fingerprint = createHash("sha256")
  .update(readFileSync(join(root, "package-lock.json")))
  .digest("hex");
const marker = join(root, "node_modules", ".still-piano-dependencies");
const vite = join(root, "node_modules", "vite", "bin", "vite.js");
const installed = existsSync(vite) && existsSync(marker)
  && readFileSync(marker, "utf8") === fingerprint;

if (!installed) {
  console.log("\n[Still Online Piano] Installing dependencies. Internet access is needed for the first run.\n");
  const result = spawnSync(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["ci", "--no-audit", "--no-fund"],
    { cwd: root, stdio: "inherit", shell: process.platform === "win32" },
  );
  if (result.error || result.status !== 0) {
    console.error("\nInstallation failed. Check your Internet connection and the error above, then run this file again.");
    if (result.error) console.error(result.error.message);
    process.exit(result.status || 1);
  }
  writeFileSync(marker, fingerprint);
}

console.log("\n[Still Online Piano] Opening your piano in the browser.");
console.log("Keep this window open. Press Ctrl+C to stop.");
console.log("Source edits will appear in the browser automatically.\n");

// Bind only to this computer; local use does not expose a public website.
const server = spawn(process.execPath, [
  vite, "--host", "127.0.0.1", "--port", "5173", "--strictPort", "--open",
], { cwd: root, stdio: "inherit" });
let stopping = false;

server.on("error", error => {
  console.error(error.message);
  process.exitCode = 1;
});
server.on("exit", (code, signal) => {
  process.exitCode = stopping || signal === "SIGINT" || signal === "SIGTERM" ? 0 : (code ?? 1);
});
process.on("SIGINT", () => { stopping = true; server.kill("SIGINT"); });
process.on("SIGTERM", () => { stopping = true; server.kill("SIGTERM"); });
