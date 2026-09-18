import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * TASK-345 (0018.06.27 a₿) — pin `@frens-earth/puck-config` to 0.16.0.
 *
 * The package is consumed by URL to a GitHub release tarball (there is no
 * npm registry). T-341 shipped puck-config-v0.15.0 (Style Inspector gains
 * Typography and Spacing sections plus a `weight` key) and T-340 Part A
 * shipped puck-config-v0.16.0 (double-click inline text editing on the
 * /style canvas). This lane repoints package.json to 0.16.0 and
 * regenerates package-lock.json for that one entry — no other dependency
 * moves.
 *
 * Read-the-source style, like tests/style-route.test.ts: this pins the
 * URL in package.json, the lockfile's resolved URL + integrity for the
 * same entry, and (when node_modules is present) the installed package's
 * own version — never a hand-typed expectation about what npm wrote.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFile(path.join(ROOT, rel), "utf8");
const exists = (rel: string) =>
  fs.stat(path.join(ROOT, rel)).then(() => true, () => false);

const PINNED_VERSION = "0.16.0";
const PKG_NAME = "@frens-earth/puck-config";

// https://github.com/PacsArcade/puck-studio/releases/download/puck-config-v<X>/frens-earth-puck-config-<X>.tgz
// — both <X> occurrences must agree, and must equal PINNED_VERSION.
const RELEASE_URL_RE =
  /^https:\/\/github\.com\/PacsArcade\/puck-studio\/releases\/download\/puck-config-v([0-9]+\.[0-9]+\.[0-9]+)\/frens-earth-puck-config-([0-9]+\.[0-9]+\.[0-9]+)\.tgz$/;

describe("TASK-345 — package.json pins puck-config to the 0.16.0 release tarball", () => {
  it("the dependency URL points at puck-config-v0.16.0 with matching tag/filename versions", async () => {
    const pkg = JSON.parse(await read("package.json"));
    const url = pkg.dependencies?.[PKG_NAME];
    expect(url, `${PKG_NAME} missing from package.json dependencies`).toBeTypeOf("string");

    const match = RELEASE_URL_RE.exec(url as string);
    expect(match, `${PKG_NAME} URL does not match the puck-studio release tarball shape: ${url}`).not.toBeNull();

    const [, tagVersion, fileVersion] = match!;
    expect(tagVersion).toBe(fileVersion);
    expect(tagVersion).toBe(PINNED_VERSION);
  });
});

describe("TASK-345 — package-lock.json resolves puck-config to the same 0.16.0 tarball", () => {
  it("the top-level dependencies entry matches package.json's URL", async () => {
    const pkg = JSON.parse(await read("package.json"));
    const lock = JSON.parse(await read("package-lock.json"));

    const pkgUrl = pkg.dependencies?.[PKG_NAME];
    const lockRootUrl = lock.packages?.[""]?.dependencies?.[PKG_NAME];

    expect(lockRootUrl, `${PKG_NAME} missing from package-lock.json root dependencies`).toBe(pkgUrl);
  });

  it("the node_modules entry resolves to the 0.16.0 tarball and carries an integrity field", async () => {
    const lock = JSON.parse(await read("package-lock.json"));
    const entry = lock.packages?.[`node_modules/${PKG_NAME}`];

    expect(entry, `node_modules/${PKG_NAME} missing from package-lock.json packages`).toBeTruthy();
    expect(entry.version).toBe(PINNED_VERSION);

    const match = RELEASE_URL_RE.exec(entry.resolved ?? "");
    expect(match, `node_modules/${PKG_NAME} resolved URL does not match the release tarball shape: ${entry.resolved}`).not.toBeNull();
    expect(match![1]).toBe(PINNED_VERSION);

    expect(entry.integrity, `node_modules/${PKG_NAME} is missing an integrity field`).toBeTypeOf("string");
    expect((entry.integrity as string).length).toBeGreaterThan(0);
  });
});

describe("TASK-345 — the installed package matches the pinned version", () => {
  it("node_modules/@frens-earth/puck-config/package.json version equals 0.16.0 (skipped if node_modules is absent)", async () => {
    const installedPkgPath = `node_modules/${PKG_NAME}/package.json`;

    if (!(await exists(installedPkgPath))) {
      console.warn(
        `SKIP: ${installedPkgPath} not found — run \`npm install\` in this worktree to exercise this pin.`
      );
      return;
    }

    const installed = JSON.parse(await read(installedPkgPath));
    expect(installed.version).toBe(PINNED_VERSION);
  });
});
