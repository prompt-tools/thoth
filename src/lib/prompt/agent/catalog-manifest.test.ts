import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("catalog manifest initialization", () => {
  it("loads options in an isolated server process", () => {
    const script = `import("./src/lib/prompt/agent/catalog-manifest.ts").then((module) => {
      const api = module.default ?? module;
      process.stdout.write(String(api.buildCatalogManifest().length));
    })`;
    const count = Number(execFileSync(process.execPath, ["--import", "tsx", "-e", script], {
      cwd: process.cwd(),
      encoding: "utf8",
    }));

    expect(count).toBeGreaterThan(0);
  });
});
