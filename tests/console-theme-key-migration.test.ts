import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * TASK-275 (0018.06.25 a₿ · block 967,125) — the console theme's stored
 * wire value renamed "arcade" → "default" (HB-6, H110, A). Two pins:
 *   1. the old literal `"arcade"` survives in console-fx.ts on exactly one
 *      line — the migration-read comparison, by design (the grep gate).
 *   2. storedTheme() actually migrates a returning visitor's stored
 *      "arcade" key to "default" on next read (a stubbed localStorage —
 *      the suite runs under vitest's `node` environment, no jsdom).
 */

const CONSOLE_FX_PATH = fileURLToPath(new URL("../src/lib/console-fx.ts", import.meta.url));

describe("console-fx.ts — the old \"arcade\" literal", () => {
  it("appears on exactly one line: the migration-read comparison", () => {
    const src = readFileSync(CONSOLE_FX_PATH, "utf8");
    const hits = src
      .split("\n")
      .map((line, i) => ({ line, n: i + 1 }))
      .filter(({ line }) => line.includes('"arcade"'));
    expect(hits).toHaveLength(1);
    expect(hits[0].line).toContain('t === "arcade"');
  });
});

/** a minimal in-memory localStorage — vitest's default environment is
 *  "node" (vitest.config.ts), no window/localStorage without a stub */
class FakeLocalStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
}

describe("storedTheme() — migrating a returning visitor's stored key", () => {
  const originalLocalStorage = (globalThis as { localStorage?: unknown }).localStorage;
  const originalWindow = (globalThis as { window?: unknown }).window;
  let fake: FakeLocalStorage;

  beforeEach(() => {
    fake = new FakeLocalStorage();
    (globalThis as { localStorage?: unknown }).localStorage = fake;
    // setStoredTheme (unused here) and storedTheme's try/catch both only
    // touch localStorage; window isn't required for the read path, but stub
    // it defensively in case a future edit reaches for window.dispatchEvent.
    (globalThis as { window?: unknown }).window = globalThis;
  });

  afterEach(() => {
    (globalThis as { localStorage?: unknown }).localStorage = originalLocalStorage;
    (globalThis as { window?: unknown }).window = originalWindow;
  });

  it('migrates a stored "arcade" to "default" and returns "default"', async () => {
    const { storedTheme } = await import("@/lib/console-fx");
    fake.setItem("scarlet:theme", "arcade");
    const theme = storedTheme();
    expect(theme).toBe("default");
    expect(fake.getItem("scarlet:theme")).toBe("default");
  });

  it("leaves lcars/cartridge untouched", async () => {
    const { storedTheme } = await import("@/lib/console-fx");
    fake.setItem("scarlet:theme", "lcars");
    expect(storedTheme()).toBe("lcars");
    expect(fake.getItem("scarlet:theme")).toBe("lcars");

    fake.setItem("scarlet:theme", "cartridge");
    expect(storedTheme()).toBe("cartridge");
  });

  it('a fresh/unknown stored value resolves to "default" without writing', () => {
    return import("@/lib/console-fx").then(({ storedTheme }) => {
      expect(storedTheme()).toBe("default"); // nothing stored yet
      expect(fake.getItem("scarlet:theme")).toBeNull(); // no spurious write
    });
  });
});
