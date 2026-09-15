import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * TASK-281 (0018.06.25 a₿ · block 967,125) — the last lane of the 274→281
 * chain re-scopes the two in-repo `file:` packages from `@pacsarcade/*` to
 * `@onecocreation/*` (this repo owns their `package.json` "name" fields
 * directly). The six GitHub-tarball packages (`arcade-ui`, `plugin-rails`,
 * `presence`, `puck-changelog`, `puck-config`, `variant-engine`) are NOT
 * re-scoped — their names live inside tarballs this repo doesn't control —
 * so this pin only asserts the two renamed entries, not the whole
 * `dependencies` block.
 */
describe("package scope — the two file: packages carry @onecocreation/*", () => {
  it("packages/operator-auth/package.json and packages/page-store/package.json are @onecocreation-scoped", async () => {
    const [operatorAuthRaw, pageStoreRaw] = await Promise.all([
      fs.readFile(
        path.join(process.cwd(), "packages/operator-auth/package.json"),
        "utf8",
      ),
      fs.readFile(
        path.join(process.cwd(), "packages/page-store/package.json"),
        "utf8",
      ),
    ]);

    expect(JSON.parse(operatorAuthRaw).name).toBe(
      "@onecocreation/operator-auth",
    );
    expect(JSON.parse(pageStoreRaw).name).toBe("@onecocreation/page-store");
  });

  it("root package.json's dependencies carry no @pacsarcade/operator-auth or @pacsarcade/page-store keys", async () => {
    const raw = await fs.readFile(
      path.join(process.cwd(), "package.json"),
      "utf8",
    );
    const pkg = JSON.parse(raw);

    expect(pkg.dependencies).not.toHaveProperty("@pacsarcade/operator-auth");
    expect(pkg.dependencies).not.toHaveProperty("@pacsarcade/page-store");
    expect(pkg.dependencies).toHaveProperty(
      "@onecocreation/operator-auth",
      "file:packages/operator-auth",
    );
    expect(pkg.dependencies).toHaveProperty(
      "@onecocreation/page-store",
      "file:packages/page-store",
    );
  });
});
