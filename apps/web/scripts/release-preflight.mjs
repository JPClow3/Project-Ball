import { readFileSync } from "node:fs";

const zeroAddress = /^0x0{40}$/i;
const zeroD1Id = /^0{8}-0{4}-0{4}-0{4}-0{12}$/i;

function stripJsonComments(value) {
  return value
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function isLocalhostUrl(value) {
  try {
    const url = new URL(value);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  } catch {
    return false;
  }
}

function requireHttpsUrl(name, value, failures) {
  if (typeof value !== "string" || value.trim() === "") {
    failures.push(`${name} is missing`);
    return;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "https:") {
      failures.push(`${name} must be an https URL for release deploys`);
    }
  } catch {
    failures.push(`${name} must be a valid URL`);
  }
}

const configUrl = new URL("../wrangler.jsonc", import.meta.url);
const config = JSON.parse(stripJsonComments(readFileSync(configUrl, "utf8")));
const vars = config.vars ?? {};
const failures = [];

requireHttpsUrl("PUBLIC_APP_URL", vars.PUBLIC_APP_URL, failures);
requireHttpsUrl("PUBLIC_CELO_RPC_URL", vars.PUBLIC_CELO_RPC_URL, failures);
requireHttpsUrl("PUBLIC_CELO_EXPLORER_URL", vars.PUBLIC_CELO_EXPLORER_URL, failures);

if (isLocalhostUrl(vars.PUBLIC_APP_URL)) {
  failures.push("PUBLIC_APP_URL still points at localhost");
}

const poolsAddress = vars.PUBLIC_PROJECT_BALL_POOLS_ADDRESS;
if (typeof poolsAddress !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(poolsAddress)) {
  failures.push("PUBLIC_PROJECT_BALL_POOLS_ADDRESS must be a valid EVM address");
} else if (zeroAddress.test(poolsAddress)) {
  failures.push("PUBLIC_PROJECT_BALL_POOLS_ADDRESS is still the zero-address placeholder");
}

const d1Database = (config.d1_databases ?? []).find((database) => database.binding === "PROJECT_BALL_DB");
if (!d1Database?.database_id || zeroD1Id.test(d1Database.database_id)) {
  failures.push("PROJECT_BALL_DB database_id is still the placeholder value");
}

if (failures.length > 0) {
  console.error("Release preflight failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Release preflight passed.");
