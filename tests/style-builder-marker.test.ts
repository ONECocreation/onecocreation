import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

/**
 * TASK-342 (0018.06.28 a₿ · block 967,633) — the signed-in builder marker.
 * Pins `operatorDisplayName()` (pure — a hex pubkey shortens to a short
 * npub, an email/handle seat prints as-is, a non-hex garbage string never
 * throws) and `BuilderMarkerContext`'s `null` default via the house's
 * read-the-source idiom (`tests/about-middle-picture.test.ts`'s pattern) —
 * a render harness isn't needed to pin a `createContext` call argument.
 */

const SOURCE = path.join(process.cwd(), "src/components/style/BuilderMarker.tsx");

describe("operatorDisplayName — pure, never throws", () => {
  it("a hex pubkey (ground fact 2's key-operator branch) shortens to a short npub", async () => {
    const { operatorDisplayName } = await import("@/components/style/BuilderMarker");
    // a real, freshly-generated 32-byte pubkey (crypto.randomBytes(32).toString("hex")) —
    // the exact npub it encodes to is fixed, checked against nostr-tools directly.
    const hex = "b1e9c7acc3dcfb5542be9110a677164f52ff9fbaaa661020c34258dd7b0bb137".slice(0, 64);
    expect(hex).toHaveLength(64);
    expect(operatorDisplayName(hex)).toBe("npub1k8…9wtj");
  });

  it("an uppercase hex pubkey is treated the same as its lowercase form", async () => {
    const { operatorDisplayName } = await import("@/components/style/BuilderMarker");
    const hex = "b1e9c7acc3dcfb5542be9110a677164f52ff9fbaaa661020c34258dd7b0bb137".slice(0, 64);
    expect(operatorDisplayName(hex.toUpperCase())).toBe(operatorDisplayName(hex));
  });

  it("an email seat (ground fact 2's email branch) prints AS-IS — the one existing precedent, OperatorGate.tsx:116's full-address display", async () => {
    const { operatorDisplayName } = await import("@/components/style/BuilderMarker");
    expect(operatorDisplayName("love@onecocreation.com")).toBe("love@onecocreation.com");
  });

  it("a garbage string that merely LOOKS hex-shaped but is the wrong length never takes the npub branch", async () => {
    const { operatorDisplayName } = await import("@/components/style/BuilderMarker");
    const tooShort = "b1e9c7acc3dcfb5542be9110a677164f52ff9fbaaa661020c34258dd7b0bb13"; // 63 chars
    const tooLong = "b1e9c7acc3dcfb5542be9110a677164f52ff9fbaaa661020c34258dd7b0bb1370"; // 65 chars
    expect(operatorDisplayName(tooShort)).toBe(tooShort);
    expect(operatorDisplayName(tooLong)).toBe(tooLong);
  });

  it("non-hex garbage (an arbitrary handle) returns verbatim, never throws", async () => {
    const { operatorDisplayName } = await import("@/components/style/BuilderMarker");
    expect(() => operatorDisplayName("not-a-key-at-all!! 🎈")).not.toThrow();
    expect(operatorDisplayName("not-a-key-at-all!! 🎈")).toBe("not-a-key-at-all!! 🎈");
    expect(operatorDisplayName("")).toBe("");
  });
});

describe("BuilderMarkerContext — the safety net's default (read-the-source pin)", () => {
  it("defaults to null — every render path that never provides a value gets nothing", () => {
    const src = readFileSync(SOURCE, "utf8");
    expect(src).toMatch(/createContext<string \| null>\(null\)/);
  });
});
