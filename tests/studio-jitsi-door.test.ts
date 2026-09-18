import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { mintJitsiRoom } from "@/lib/studio/jitsi-door";

/**
 * TASK-337 (0018.06.28 a₿) — the Jitsi one-time door's own pins. The mint
 * primitive is pure (no KV, no network), so it's exercised directly, in
 * the read-the-source pin style of tests/console-field-contrast.test.ts
 * for the wiring pieces that need no render harness.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

const JITSI_CARD = "src/components/studio-overlay/JitsiDoorCard.tsx";
const ACTIONS = "src/app/a/studio/actions.ts";

describe("TASK-337 — mintJitsiRoom()", () => {
  it("mints the oc-<16 lowercase hex> shape (64 bits — a public-Jitsi room name IS the secret)", () => {
    expect(mintJitsiRoom()).toMatch(/^oc-[0-9a-f]{16}$/);
  });

  it("2000 draws land zero duplicates — a real uniqueness pin, not a mocked one", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const room = mintJitsiRoom();
      expect(seen.has(room)).toBe(false);
      seen.add(room);
    }
    expect(seen.size).toBe(2000);
  });
});

describe("TASK-337 — JitsiDoorCard.tsx stays pure", () => {
  it("never imports @/lib/store or any server module", async () => {
    const src = await read(JITSI_CARD);
    expect(src).not.toMatch(/@\/lib\/store/);
    expect(src).not.toMatch(/@\/lib\/studio\/jitsi-door/);
    expect(src).not.toMatch(/["']use server["']/);
    /* the only site import allowed: the shared card/doorStack style consts
       StudioRoom.tsx already exports (a named decision, see that file) */
    const imports = [...src.matchAll(/^import .*$/gm)].map((m) => m[0]);
    for (const line of imports) {
      if (/^import\s+(?:type\s+)?React/.test(line)) continue;
      expect(line, `unexpected import in a pure card: ${line}`).toMatch(/\.\/StudioRoom["']/);
    }
  });
});

describe("TASK-337 — mintJitsiDoor gates the same way saveStudio does", () => {
  it("actions.ts gates mintJitsiDoor on operatorFromCookieHeader, same as saveStudio", async () => {
    const src = await read(ACTIONS);
    const fn = src.match(/export async function mintJitsiDoor\(\)[\s\S]*?\n\}/);
    expect(fn, "mintJitsiDoor not found in actions.ts").not.toBeNull();
    expect(fn![0]).toMatch(/operatorFromCookieHeader\(\(await headers\(\)\)\.get\("cookie"\)\)/);
    expect(fn![0]).toMatch(/if \(!operator\) return \{ ok: false, reason:/);
  });
});
