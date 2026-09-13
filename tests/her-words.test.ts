import { describe, it, expect } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * TASK-211 (0018.06.23 a₿, Love's call items #9, #17, #18, #26, #31, #32,
 * #40) — HER WORDS: a greppable pin on every string she named, so a future
 * edit can't quietly reintroduce the old wording. Source-grep, not a build
 * scrape — this house's tests "pin the model, not the render" (the same
 * idiom circle-legend.test.ts and door-machine.test.ts already use), and a
 * banned phrase is scoped to the SPECIFIC surface Love named — "Commons" and
 * "free for every member" both have other, unrelated, honest uses elsewhere
 * in the codebase (a generic "your commons — say hello" blurb; the desk's
 * admin-only Go-Live picker) that this lane does not touch and this test
 * does not police.
 */

const read = (rel: string) => fs.readFile(path.join(process.cwd(), rel), "utf8");

describe("#17 — \"The Heart Field\", two words, no \"Commons\", no dash", () => {
  /* the rendered/data surfaces this lane converged fully — no comment on
     these files still pairs "Heart Field" with "Commons". LiveDoorCard.tsx
     and door-machine.ts carry OLDER doc comments (TASK-174/210, dated
     journal entries this house doesn't rewrite) that still say the old
     name in passing; their RENDERED label is pinned separately below. */
  const surfaces = [
    "src/lib/matrix-rooms.ts",
    "src/components/rooms/RoomsShelf.tsx",
    "src/components/welcome/WelcomeFlow.tsx",
    "src/lib/puck-seeds.ts",
    "src/brand/cartridge.ts",
    "src/brand/cartridges/earthside.ts",
  ];

  it.each(surfaces)("%s carries no 'Heart Field Commons' / 'Heartfield Commons' variant", async (rel) => {
    const src = await read(rel);
    expect(src).not.toMatch(/heart[ -]?field\s*(—|-)?\s*commons/i);
  });

  it("matrix-rooms.ts: the room registry's own title is bare \"The Heart Field\"", async () => {
    const { ROOMS, COMMONS_PACKAGE_NAME } = await import("@/lib/matrix-rooms");
    const heartField = ROOMS.find((r) => r.id.startsWith("#heart-field:"));
    expect(heartField?.title).toBe("The Heart Field");
    expect(COMMONS_PACKAGE_NAME).toBe("Heart Field");
  });

  it("PackageRoomsCard composes COMMONS_PACKAGE_NAME into \"Enter the Heart Field\" — no double \"the\"", async () => {
    const src = await read("src/components/rooms/PackageRoomsCard.tsx");
    expect(src).toContain("Enter the {pkg.name}");
    const { COMMONS_PACKAGE_NAME } = await import("@/lib/matrix-rooms");
    expect(`Enter the ${COMMONS_PACKAGE_NAME}`).toBe("Enter the Heart Field");
  });

  it("classes/page.tsx: the kicker reads \"The Heart Field\"", async () => {
    const src = await read("src/app/classes/page.tsx");
    expect(src).toContain(">The Heart Field</p>");
  });

  it("RoomsShelf.tsx: the signed-out line reads \"...the Heart Field opens for you.\"", async () => {
    const src = await read("src/components/rooms/RoomsShelf.tsx");
    expect(src).toContain("and the Heart Field opens for you.");
  });

  it("WelcomeFlow.tsx: the door reads \"Step into The Heart Field\"", async () => {
    const src = await read("src/components/welcome/WelcomeFlow.tsx");
    expect(src).toContain("Step into The Heart Field");
  });

  it("LiveDoorCard.tsx: the picker's free-room group reads \"The Heart Field — free for every member\"", async () => {
    const src = await read("src/components/console/LiveDoorCard.tsx");
    expect(src).toContain("The Heart Field — free for every member");
  });
});

describe("#18 — \"My sessions\" → \"Calendar\"", () => {
  it("MEMBER_MENU carries \"Calendar\", not \"My sessions\"", async () => {
    const { MEMBER_MENU } = await import("@/components/door/door-machine");
    const labels = MEMBER_MENU.map((i) => i.label);
    expect(labels).not.toContain("My sessions");
    expect(MEMBER_MENU.find((i) => i.href === "/me/calendar")?.label).toBe("Calendar");
  });
});

describe("#31 — the Circle reads \"Events\" in /rooms", () => {
  it("VantageSwitcher's circle tab is labelled \"Events\", not \"The Circle\"", async () => {
    const src = await read("src/components/rooms/VantageSwitcher.tsx");
    expect(src).toMatch(/id:\s*"circle",\s*label:\s*"Events"/);
    expect(src).not.toMatch(/label:\s*"The Circle"/);
  });
});

describe("#40 — /support \"Reading with Love\" drops \"free for every member\"", () => {
  it("ReadWithLove.tsx no longer says \"free for every member\"", async () => {
    const src = await read("src/components/ReadWithLove.tsx");
    expect(src).not.toContain("free for every member");
  });
});

describe("#32 — /classes: the Element reference at the bottom is gone", () => {
  it("RoomsShelf.tsx (the /classes bottom) no longer names Element", async () => {
    const src = await read("src/components/rooms/RoomsShelf.tsx");
    expect(src).not.toMatch(/element\.io/i);
    expect(src).not.toContain(">Element<");
  });
});

describe("#26 — the social handle is @gysyluv", () => {
  it("WildDoors.tsx's DOORS data points at @gysyluv / instagram.com/gysyluv, never @onecocreation", async () => {
    const src = await read("src/components/WildDoors.tsx");
    const doorsBlock = src.slice(src.indexOf("const DOORS"), src.indexOf("export default"));
    expect(doorsBlock).toContain("INSTAGRAM_HANDLE");
    expect(doorsBlock).not.toMatch(/@onecocreation/);
    expect(doorsBlock).not.toContain("instagram.com/onecocreation");
    expect(src).toContain('const INSTAGRAM_HANDLE = "@gysyluv";');
  });

  it("derive-or-dash: the description slot is real and nullable — no fabricated sentence kept", async () => {
    const src = await read("src/components/WildDoors.tsx");
    expect(src).toMatch(/INSTAGRAM_DESCRIPTION\s*:\s*string \| null\s*=\s*null/);
    // the card's words fall back to the bare handle when the slot is empty
    expect(src).toContain('words: INSTAGRAM_DESCRIPTION ? `${INSTAGRAM_HANDLE} — ${INSTAGRAM_DESCRIPTION}` : INSTAGRAM_HANDLE,');
  });
});
