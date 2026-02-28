import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("runtime config", () => {
  it("uses bun-native turn script and avoids tsx runtime dependency", () => {
    const raw = readFileSync(new URL("../../package.json", import.meta.url), "utf8");
    const pkg = JSON.parse(raw) as {
      scripts?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    expect(pkg.scripts?.turn).toBe("bun src/cli/run-turn.ts");
    expect(pkg.devDependencies?.tsx).toBeUndefined();
  });

  it("ignores .env files to prevent key leaks", () => {
    const gitignore = readFileSync(new URL("../../.gitignore", import.meta.url), "utf8");
    const lines = gitignore
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));

    expect(lines).toContain(".env");
  });
});
