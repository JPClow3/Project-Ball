import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("[Contracts] Missing forge command.");
  process.exit(1);
}

const lookup = process.platform === "win32"
  ? spawnSync("where.exe", ["forge"], { stdio: "ignore" })
  : spawnSync("sh", ["-c", "command -v forge"], { stdio: "ignore" });

if (lookup.status !== 0) {
  console.warn(`[Contracts] forge not found; skipping contracts ${args.join(" ")}.`);
  process.exit(0);
}

const result = spawnSync("forge", args, {
  stdio: "inherit",
  shell: process.platform === "win32"
});

if (result.error) {
  console.error("[Contracts] Failed to run forge:", result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
