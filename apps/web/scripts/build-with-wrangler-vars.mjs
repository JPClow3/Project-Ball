import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function stripJsonComments(value) {
  return value
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const astroBin = fileURLToPath(new URL("../node_modules/astro/bin/astro.mjs", import.meta.url));
const wranglerConfigUrl = new URL("../../../wrangler.jsonc", import.meta.url);
const wranglerConfig = JSON.parse(stripJsonComments(readFileSync(wranglerConfigUrl, "utf8")));
const env = { ...process.env };

for (const [key, value] of Object.entries(wranglerConfig.vars ?? {})) {
  env[key] ??= String(value);
}

for (const command of ["check", "build"]) {
  const result = spawnSync(process.execPath, [astroBin, command], {
    cwd: appRoot,
    env,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
