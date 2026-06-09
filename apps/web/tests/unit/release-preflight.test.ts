import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

describe("release preflight", () => {
  it("blocks deploys while release placeholders remain in wrangler config", async () => {
    const scriptPath = fileURLToPath(new URL("../../scripts/release-preflight.mjs", import.meta.url));

    try {
      await execFileAsync(process.execPath, [scriptPath]);
      throw new Error("Expected release preflight to fail with placeholder config");
    } catch (error) {
      const failure = error as { code?: number; stderr?: string };

      expect(failure.code).toBe(1);
      expect(failure.stderr).toContain("PUBLIC_APP_URL still points at localhost");
      expect(failure.stderr).toContain("PUBLIC_JONAKINHO_POOLS_ADDRESS is still the zero-address placeholder");
      expect(failure.stderr).toContain("JONAKINHO_DB database_id is still the placeholder value");
    }
  });
});
