import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DOOR_COPY,
  DOOR_KEY_CTA,
  DOOR_KEY_NOTE,
  DOOR_NAME_SUFFIX,
  DOOR_WALKS,
  MEMBER_MENU,
  isUnnamedKeyReason,
  landingFor,
  reduce,
} from "@/components/door/door-machine";

/**
 * TASK-185 Phase A (prototype) — the door's contract, pinned at the model:
 * the state machine, the counted walks, the landing rule, the member menu,
 * and the no-arcade-voice law on every word the door renders. (This repo's
 * tests run in node with no DOM — pin the model, not the render, the same
 * pattern login-card.test.ts uses for EmailDoor.)
 */
describe("the door's state machine (TASK-185)", () => {
  it("opens from closed into sign-in, and only from closed", () => {
    expect(reduce("closed", { type: "open" })).toBe("sign-in");
    expect(reduce("code", { type: "open" })).toBe("code");
  });

  it("returning email soul: sign-in → code → in (two steps)", () => {
    const s1 = reduce("closed", { type: "open" });
    const s2 = reduce(s1, { type: "code-sent" });
    const s3 = reduce(s2, { type: "verified", isNew: false });
    expect([s1, s2, s3]).toEqual(["sign-in", "code", "in"]);
    expect(DOOR_WALKS["returning-email"]).toHaveLength(2);
  });

  it("new email soul: the sheet turns into sign-up on its own (three steps)", () => {
    const s1 = reduce("closed", { type: "open" });
    const s2 = reduce(s1, { type: "code-sent" });
    const s3 = reduce(s2, { type: "verified", isNew: true });
    const s4 = reduce(s3, { type: "named" });
    expect([s1, s2, s3, s4]).toEqual(["sign-in", "code", "new-name", "in"]);
    expect(DOOR_WALKS["new-email"]).toHaveLength(3);
  });

  it("returning key: one step — sign-in → in", () => {
    expect(reduce("sign-in", { type: "key-known" })).toBe("in");
    expect(DOOR_WALKS["returning-key"]).toHaveLength(1);
  });

  it("a good key with no name gets the same third step, never an error", () => {
    expect(reduce("sign-in", { type: "key-new" })).toBe("new-name");
    expect(reduce("new-name", { type: "named" })).toBe("in");
    expect(DOOR_WALKS["new-key"]).toHaveLength(2);
  });

  it("close always closes; back unwinds to sign-in without stranding", () => {
    expect(reduce("code", { type: "close" })).toBe("closed");
    expect(reduce("in", { type: "close" })).toBe("closed");
    expect(reduce("code", { type: "back" })).toBe("sign-in");
    expect(reduce("new-name", { type: "back" })).toBe("sign-in");
    expect(reduce("sign-in", { type: "back" })).toBe("sign-in");
  });

  it("out-of-order events are no-ops (a late answer can't skip the walk)", () => {
    expect(reduce("closed", { type: "verified", isNew: false })).toBe("closed");
    expect(reduce("sign-in", { type: "named" })).toBe("sign-in");
    expect(reduce("code", { type: "key-known" })).toBe("code");
  });
});

describe("the door's landing rule", () => {
  it("a same-origin ?next= wins on both mounts", () => {
    expect(landingFor({ next: "/rooms/weekly-reading", isNew: false, mount: "sheet" })).toBe("/rooms/weekly-reading");
    expect(landingFor({ next: "/rooms/weekly-reading", isNew: true, mount: "page" })).toBe("/rooms/weekly-reading");
  });

  it("a new soul with no next lands on what's theirs now; a returning soul on the page mount goes to their field", () => {
    expect(landingFor({ next: null, isNew: true, mount: "sheet" })).toBe("/welcome");
    expect(landingFor({ next: null, isNew: false, mount: "page" })).toBe("/me");
  });

  it("a returning soul in the sheet stays — the page behind never changed", () => {
    expect(landingFor({ next: null, isNew: false, mount: "sheet" })).toBeNull();
  });
});

describe("the new-key test — the server's own words", () => {
  it("recognizes an unnamed key, rejects everything else", () => {
    expect(isUnnamedKeyReason("that key doesn't own a tag")).toBe(true);
    expect(isUnnamedKeyReason("bad signature")).toBe(false);
    expect(isUnnamedKeyReason(null)).toBe(false);
  });
});

describe("the member menu — the whole of it", () => {
  it("my library, my sessions, the reading room — sign out renders beside them in DoorButton", () => {
    expect(MEMBER_MENU.map((i) => i.label)).toEqual(["My library", "My sessions", "The reading room"]);
    for (const i of MEMBER_MENU) expect(i.href.startsWith("/")).toBe(true);
  });
});

describe("the door speaks as Love does — no arcade voice (source pin)", () => {
  /* the arcade's words, named in the spec: no fren, no SOUL, no raw key
     handles, no RPG ceremony, no WALK THE WELCOME PATH */
  const ARCADE = [/\bfren/i, /\bSOUL\b/, /WALK THE WELCOME PATH/i, /font-arcade/, /text-coin/, /key-[0-9a-f]{4}/i];

  it("no rendered word in the copy table carries the arcade's voice", () => {
    const words = [
      ...Object.values(DOOR_COPY).flatMap((c) => [c.title, c.note, c.cta, c.busyCta]),
      DOOR_KEY_CTA, DOOR_KEY_NOTE, DOOR_NAME_SUFFIX,
      ...MEMBER_MENU.map((i) => i.label),
    ];
    for (const w of words) for (const re of ARCADE) expect(w).not.toMatch(re);
  });

  it("the door's components carry no arcade voice in their JSX copy", () => {
    /* the legacy ROUTE names (/api/frens/*) and hook identifiers
       (useFrenSession) are the server's own names — unowned, unchangeable
       here, never rendered. Strip them; pin everything a visitor could
       read. */
    for (const f of ["DoorSheet.tsx", "DoorButton.tsx"]) {
      const raw = readFileSync(join(__dirname, "..", "src", "components", "door", f), "utf8");
      const src = raw
        .replace(/\/\*[\s\S]*?\*\//g, "") // block comments don't render
        .replace(/^\s*\/\/.*$/gm, "")     // line comments don't render
        .replace(/^import .*$/gm, "")
        .replace(/\/api\/frens\/[a-z-]+/g, "")
        .replace(/\b(use|apply)FrenSession\b/g, "")
        .replace(/\bfren:/g, ""); // the hook's own property name (unowned API)
      for (const re of ARCADE) expect(src, `${f} matches ${re}`).not.toMatch(re);
    }
  });

  it("Love's words are present: welcome home, you're in, your name in the field", () => {
    expect(DOOR_COPY["sign-in"].title).toBe("Welcome home");
    expect(DOOR_COPY.in.title).toBe("You're in");
    expect(DOOR_COPY["new-name"].title).toBe("Your name in the field");
  });
});
