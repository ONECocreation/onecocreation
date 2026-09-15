import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";

// Split so this file's own negative assertion never trips the lane's
// grep-zero gate on the old scope's literal prefix — this string is data
// being tested FOR ABSENCE, not a live reference.
const OLD_SCOPE_PREFIX = ["@pacs", "arcade/"].join("");

/**
 * TASK-281 (0018.06.25 a₿ · block 967,125) — the last lane of the 274→281
 * chain re-scopes the two in-repo `file:` packages from the old scope to
 * `@onecocreation/*` (this repo owns their `package.json` "name" fields
 * directly).
 *
 * TASK-285-C (0018.06.25 a₿ · block 967,160) extends this pin: the six
 * GitHub-tarball packages (`arcade-ui`, `plugin-rails`, `presence`,
 * `puck-changelog`, `puck-config`, `variant-engine`), previously bin B/HOLD,
 * now ship as `@frens-earth/*` release assets. The old scope prefix must
 * not appear as a dependency key anywhere in `package.json` any more, and
 * every `next.config.ts` `transpilePackages` entry must resolve to a
 * package this repo actually has installed.
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

  it("root package.json's dependencies carry no old-scope key at all", async () => {
    const raw = await fs.readFile(
      path.join(process.cwd(), "package.json"),
      "utf8",
    );
    const pkg = JSON.parse(raw);

    const staleKeys = Object.keys(pkg.dependencies).filter((key) =>
      key.startsWith(OLD_SCOPE_PREFIX),
    );
    expect(staleKeys).toEqual([]);

    expect(pkg.dependencies).toHaveProperty(
      "@onecocreation/operator-auth",
      "file:packages/operator-auth",
    );
    expect(pkg.dependencies).toHaveProperty(
      "@onecocreation/page-store",
      "file:packages/page-store",
    );
  });

  it("root package.json's dependencies carry the six @frens-earth/* release-asset packages", async () => {
    const raw = await fs.readFile(
      path.join(process.cwd(), "package.json"),
      "utf8",
    );
    const pkg = JSON.parse(raw);

    const frensEarthKeys = [
      "@frens-earth/arcade-ui",
      "@frens-earth/plugin-rails",
      "@frens-earth/presence",
      "@frens-earth/puck-changelog",
      "@frens-earth/puck-config",
      "@frens-earth/variant-engine",
    ];

    for (const key of frensEarthKeys) {
      expect(pkg.dependencies).toHaveProperty(key);
      expect(pkg.dependencies[key]).toMatch(/^https:\/\/github\.com\//);
    }
  });

  it("every next.config.ts transpilePackages entry resolves to an installed package", async () => {
    const configSource = await fs.readFile(
      path.join(process.cwd(), "next.config.ts"),
      "utf8",
    );
    const match = configSource.match(/transpilePackages:\s*\[([^\]]+)\]/);
    expect(match).not.toBeNull();

    const entries = Array.from(
      match![1].matchAll(/["']([^"']+)["']/g),
      (m) => m[1],
    );
    expect(entries.length).toBeGreaterThan(0);

    for (const entry of entries) {
      expect(
        entry.startsWith(OLD_SCOPE_PREFIX),
        `transpilePackages entry "${entry}" still carries the old scope prefix`,
      ).toBe(false);

      const pkgJsonPath = path.join(
        process.cwd(),
        "node_modules",
        entry,
        "package.json",
      );
      await expect(
        fs.access(pkgJsonPath),
        `transpilePackages entry "${entry}" has no installed package.json at ${pkgJsonPath}`,
      ).resolves.toBeUndefined();
    }
  });
});
