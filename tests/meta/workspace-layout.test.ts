import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("workspace layout", () => {
  it("declares apps workspaces and dev scripts", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      workspaces?: string[];
      scripts?: Record<string, string>;
    };

    expect(pkg.workspaces).toEqual(expect.arrayContaining(["apps/*"]));
    expect(pkg.scripts?.["dev:api"]).toBe("bun run --cwd apps/api dev");
    expect(pkg.scripts?.["dev:frontend"]).toBe("bun run --cwd apps/frontend dev");
  });
});
