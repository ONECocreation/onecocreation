import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
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
  proofFor,
  reduce,
} from "@/components/door/door-machine";

/**
 * TASK-185 — the door's contract, pinned at the model: the state machine,
 * the counted walks, the landing rule, the member menu, the proof badge,
 * and the no-arcade-voice law on every word the door renders. Phase B adds
 * the ruling pins: /welcome is the what's-yours-now page (no second walk),
 * the arcade pieces are retired, the chip never shows a placeholder name
 * mid-walk. (This repo's tests run in node with no DOM — pin the model,
 * not the render, the same pattern login-card.test.ts uses for EmailDoor.)
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
  it("what's yours now (ruling 1: /welcome linked), my library, my sessions, the reading room — sign out renders beside them in DoorButton", () => {
    expect(MEMBER_MENU.map((i) => i.label)).toEqual(["What's yours now", "My library", "My sessions", "The reading room"]);
    expect(MEMBER_MENU[0]!.href).toBe("/welcome");
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

/* ── Phase B: the Admiral's four rulings + K7, pinned ─────────────────── */

const SRC = join(__dirname, "..", "src");
const readSrc = (...p: string[]) => readFileSync(join(SRC, ...p), "utf8");
/* retirement pins scan what COMPILES — comments may honestly name the
   retired pieces (they say why they're gone) */
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("ruling 1 — /welcome is the what's-yours-now page, never a second walk", () => {
  const flow = () => readSrc("components", "welcome", "WelcomeFlow.tsx");

  it("the join / code / names steps are retired — the page calls no auth or claim route", () => {
    const src = flow();
    expect(src).not.toContain("/api/auth/email/start");
    expect(src).not.toContain("/api/auth/email/verify");
    expect(src).not.toContain("/api/frens/availability");
    expect(src).not.toContain("/api/frens/claim");
    expect(src).not.toMatch(/step === "(join|code|names)"/);
  });

  it("the three what's-yours doors survive as the whole page", () => {
    const src = flow();
    expect(src).toContain("Book your discovery call");
    expect(src).toContain("Step into Heartfield Commons");
    expect(src).toContain("Wander the store");
  });

  it("a signed-out visitor is pointed at the one door (/login), never re-asked an email", () => {
    const src = flow();
    expect(src).toContain('href="/login"');
    expect(src).not.toContain('type="email"');
  });

  it("the URL keeps its place (the page still mounts the flow)", () => {
    const page = readSrc("app", "welcome", "page.tsx");
    expect(page).toContain('from "@/components/welcome/WelcomeFlow"');
  });
});

describe("ruling 2 — the arcade pieces are retired; EmailDoor's callers ride the sheet", () => {
  it("LoginPanel, TagClaim, FrenBadge are gone from the tree", () => {
    expect(existsSync(join(SRC, "components", "LoginPanel.tsx"))).toBe(false);
    expect(existsSync(join(SRC, "components", "TagClaim.tsx"))).toBe(false);
    expect(existsSync(join(SRC, "components", "FrenBadge.tsx"))).toBe(false);
  });

  it("the /welcome arcade-font scoping retired with TagClaim", () => {
    expect(existsSync(join(SRC, "app", "welcome", "layout.tsx"))).toBe(false);
  });

  it("the puck join blocks ride the one door (/login) — no TagClaim, no embedded EmailDoor", () => {
    const view = stripComments(readSrc("lib", "puck-blocks", "JoinSurfaceView.tsx"));
    expect(view).not.toContain("TagClaim");
    expect(view).not.toContain("EmailDoor");
    expect(view).not.toContain("SignerDoors");
    expect(view).toContain('href="/login"');
  });

  it("the console's door previews render the real door, not the retired panel", () => {
    for (const f of [
      ["components", "BrandTester.tsx"],
      ["components", "console", "BrandDesk.tsx"],
    ] as const) {
      const src = stripComments(readSrc(...f));
      expect(src, f.join("/")).not.toContain("LoginPanel");
      expect(src, f.join("/")).toContain("DoorSheet");
    }
  });
});

describe("ruling 3 — the chip stays \"Log in\" until the walk completes", () => {
  it("a walk in progress forces the signed-out chip (source pin)", () => {
    const src = readSrc("components", "door", "DoorButton.tsx");
    /* the name renders only when no walk owns the sheet */
    expect(src).toContain('const walking = open === "sheet"');
    expect(src).toMatch(/const name = !walking && session/);
    /* and the Log in chip is inert mid-walk */
    expect(src).toContain("if (!walking) setOpen(");
  });
});

describe("K7 — the proof badge: by email / by key, one honest word", () => {
  it("an inbox soul proves by email, a key soul by signer, the unknown is a dash", () => {
    expect(proofFor("email")).toBe("by email");
    expect(proofFor("onecocreation")).toBe("by key");
    expect(proofFor(null)).toBeNull();
    expect(proofFor(undefined)).toBeNull();
    expect(proofFor("")).toBeNull();
  });

  it("the badge is listed where the soul is listed — the member menu (source pin)", () => {
    const src = readSrc("components", "door", "DoorButton.tsx");
    expect(src).toContain("proofFor(session.space)");
    expect(src).toContain("{proof}");
  });
});
