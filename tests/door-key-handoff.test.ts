import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/* DoorSheet calls useRouter (next/navigation throws "expected app router
   to be mounted" outside it) — the house's mock idiom, the same one
   tests/home-puck.test.ts runs on next/headers */
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, back: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));

/**
 * TASK-316 (0018.06.25 a₿ · block ~967,210) — the sign-in door learns the
 * signer-app handoff. Pins, in the house's source-assertion convention for
 * interactive client components (tests/operator-gate-no-signer.test.ts's
 * docblock: node env, no jsdom — the seams are pinned on source, the
 * reachable behavior on real function calls and static markup):
 *
 *  · THE DEAD END IS GONE: DoorSheet's "no key signer on this device" note
 *    line no longer exists; the !window.nostr branch OPENS the signer
 *    doors in place (SignerDoors, kind="login") — never a note and a stop.
 *  · ONE SUBMIT: the post-sign branch is extracted to submitSignedKey and
 *    BOTH paths call it — the extension's tap and SignerDoors' submit.
 *  · THE HANDOFF CARRIES NEXT: nip55SignUri("login", "/rooms/x") builds a
 *    callback whose next survives the bounce (real function call).
 *  · THE RETURN STRIP WALKS NEW KEYS TO new-name: the unnamed-key branch
 *    mounts the door with the signed key (source pins), and the door
 *    really opens on new-name with it (static markup — the new-name copy,
 *    never an error).
 *  · PER-DEVICE COPY: the strings live beside DOOR_KEY_NOTE's one
 *    consumer in the sheet (door-machine.ts stays byte-identical — its
 *    source carries none of them).
 */

const sheetSrc = readFileSync(resolve(__dirname, "../src/components/door/DoorSheet.tsx"), "utf8");
const stripSrc = readFileSync(resolve(__dirname, "../src/app/login/signer-return/page.tsx"), "utf8");
const machineSrc = readFileSync(resolve(__dirname, "../src/components/door/door-machine.ts"), "utf8");

describe("item 1 — the key path stops dead-ending", () => {
  it("the dead-end note line is gone", () => {
    expect(sheetSrc).not.toContain("no key signer on this device");
  });

  it("the !window.nostr branch opens the signer doors in place, not a note", () => {
    expect(sheetSrc).toContain("setSignerOpen(true)");
    /* the branch no longer sets any note when the extension is absent */
    const branch = sheetSrc.match(/if \(!window\.nostr\) \{[\s\S]*?\}/)?.[0] ?? "";
    expect(branch).toContain("setSignerOpen(true)");
    expect(branch).not.toContain("setNote(");
    /* the doors render, fed the door's own submit and the surviving next */
    expect(sheetSrc).toContain("<SignerDoors");
    expect(sheetSrc).toContain('kind="login"');
    expect(sheetSrc).toContain("submit={submitSignedKey}");
    expect(sheetSrc).toContain("next={nextPathFromLocation() ?? undefined}");
  });

  it("the post-sign branch is ONE function both paths call", async () => {
    expect(sheetSrc).toContain("async function submitSignedKey(");
    /* the extension path calls it … */
    expect(sheetSrc).toContain("await submitSignedKey(");
    /* … and SignerDoors receives it as its submit (count the two call sites) */
    const calls = sheetSrc.match(/submitSignedKey/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(3); /* definition + extension call + SignerDoors prop */
    /* the session endpoint and the unnamed-key walk live inside it */
    const body = sheetSrc.match(/async function submitSignedKey[\s\S]*?\n  \}/)?.[0] ?? "";
    expect(body).toContain("/api/member/session");
    expect(body).toContain("isUnnamedKeyReason");
    expect(body).toContain('go({ type: "key-known" })');
    expect(body).toContain('go({ type: "key-new" })');
  });

  it("the extension path itself is unchanged: sign, then the one submit", () => {
    expect(sheetSrc).toContain("window.nostr.signEvent");
    expect(sheetSrc).toContain("PACS-LOGIN-");
    expect(sheetSrc).toContain("signing was declined — nothing sent");
  });
});

describe("item 3 — per-device copy tells the truth (door-machine.ts untouched)", () => {
  it("extension keeps today's one-tap words (DOOR_KEY_NOTE)", () => {
    expect(sheetSrc).toContain("keyNoteFor(hasNostr, android)");
    expect(sheetSrc).toContain("if (hasNostr || android === null) return DOOR_KEY_NOTE;");
  });

  it("Android hears about the signer-app handoff; everything else, the remote signer", () => {
    expect(sheetSrc).toContain("your signer app opens and brings you back");
    expect(sheetSrc).toContain("Connect a remote signer");
  });

  it("the strings live in the sheet — door-machine.ts carries none of them (byte-identical law)", () => {
    expect(machineSrc).not.toContain("KEY_NOTE_ANDROID");
    expect(machineSrc).not.toContain("KEY_NOTE_REMOTE");
    expect(machineSrc).not.toContain("keyNoteFor");
    expect(machineSrc).toContain("DOOR_KEY_NOTE"); /* the constant itself is unmoved */
  });
});

describe("item 2 + the handoff — nip55SignUri carries next (real function call)", () => {
  const realLocation = globalThis.location;

  beforeAll(() => {
    /* the builder reads location.origin — stub the fixture origin */
    Object.defineProperty(globalThis, "location", {
      value: { origin: "https://fixture.test" },
      configurable: true,
      writable: true,
    });
  });

  afterAll(() => {
    Object.defineProperty(globalThis, "location", {
      value: realLocation,
      configurable: true,
      writable: true,
    });
  });

  it("nip55SignUri('login', '/rooms/x') bounces back to /login/signer-return with door + next + the event slot", async () => {
    const { nip55SignUri } = await import("@/lib/signer-doors");
    const uri = nip55SignUri("login", "/rooms/x");
    expect(uri.startsWith("nostrsigner:")).toBe(true);
    const query = uri.slice(uri.indexOf("?") + 1);
    const params = new URLSearchParams(query);
    expect(params.get("type")).toBe("sign_event");
    expect(params.get("returnType")).toBe("event");
    const callback = params.get("callbackUrl") ?? "";
    expect(callback).toContain("https://fixture.test/login/signer-return");
    expect(callback).toContain("door=login");
    /* next survives the bounce — the return strip hands it to the door */
    expect(callback).toContain(`next=${encodeURIComponent("/rooms/x")}`);
    expect(callback.endsWith("event=")).toBe(true);
    /* the challenge itself is the same 22242 shape every door signs */
    const event = JSON.parse(decodeURIComponent(uri.slice("nostrsigner:".length, uri.indexOf("?"))));
    expect(event.kind).toBe(22242);
    expect(event.content.startsWith("PACS-LOGIN-")).toBe(true);
  });
});

describe("item 2 — the return strip walks a new key to new-name, never an error", () => {
  it("the unnamed-key branch mounts the door with the signed key in memory", () => {
    expect(stripSrc).toContain("isUnnamedKeyReason(data?.reason)");
    expect(stripSrc).toContain("setClaimKey({ event, npub: nip19.npubEncode(pubkey) })");
    expect(stripSrc).toContain("<DoorSheet mount=\"page\" initialKey={claimKey} />");
    /* the branch is NOT the error path */
    const branch = stripSrc.match(/if \(door === "login" && isUnnamedKeyReason[\s\S]*?\}/)?.[0] ?? "";
    expect(branch).not.toContain("setError(");
  });

  it("the door really opens on new-name with the initial key (static markup)", async () => {
    const DoorSheet = (await import("@/components/door/DoorSheet")).default;
    const html = renderToStaticMarkup(
      createElement(DoorSheet, {
        mount: "page",
        initialKey: {
          event: { kind: 22242, pubkey: "ab".repeat(32), created_at: 1, tags: [], content: "PACS-LOGIN-1", id: "cd".repeat(32), sig: "ef".repeat(64) },
          npub: "npub1fixture",
        },
      }),
    );
    /* the new-name step's own copy (door-machine.ts's DOOR_COPY) … */
    expect(html).toContain("Your name in the field");
    expect(html).toContain("Claim my name");
    /* … never an error, never the first screen */
    expect(html).not.toContain("READING YOUR SIGNATURE");
    expect(html).not.toContain("Email me a code");
  });

  it("the door without an initial key still opens on the first screen (untouched path)", async () => {
    const DoorSheet = (await import("@/components/door/DoorSheet")).default;
    const html = renderToStaticMarkup(createElement(DoorSheet, { mount: "page" }));
    expect(html).toContain("Welcome home");
    expect(html).toContain("Email me a code");
    expect(html).not.toContain("Claim my name");
  });
});
