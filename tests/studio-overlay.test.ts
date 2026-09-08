import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { isolateCwd } from "./helpers/isolate-cwd";
import { runnerItems, nextSession, runnerSlotWords, RUNNER_LIMIT } from "@/lib/studio/runner";
import { overlayConfigured, overlayToken, verifyOverlayToken } from "@/lib/studio/overlay-token";
import { defaultStudioDoc, getStudioDoc, saveStudioDoc, GUEST_LIMIT } from "@/lib/studio/roster";
import { STUDIO_SCENES } from "@/lib/studio/scenes";
import OverlayStage, { type OverlayTokens } from "@/components/studio-overlay/OverlayStage";

/**
 * TASK-191 (0018.06.18 a₿ · block 966119) — THE STUDIO OVERLAY, THREE
 * SCENES FIRST. Cut from the Admiral's ruling: solo + runner, side by
 * side, phone go-live; the runner reads the calendar AND the catalogue
 * through ONE derivation; the overlay URL carries a signed token because
 * OBS sends no cookie. Pins:
 *
 *  · runnerItems() — live items' titles only (hidden AND sold-out stay
 *    silent), the next CONFIRMED session leads (held/released/past never
 *    do), the frame cap holds, an empty shelf is an empty runner;
 *  · the token gate — per-scene HMAC over SEAT_SECRET: the right token
 *    opens its own scene only, no secret means honestly closed;
 *  · the three scenes render their elements — logo bug, LIVE pill, show
 *    title, host/guest lower thirds (name + specialty), the runner;
 *  · the roster round-trip — save then read returns the same stage,
 *    sanitize drops the 7th guest and nameless rows;
 *  · the GROUND ruling — T-175's /a/studio redirect stub is DELETED and
 *    the new room gates like every /a room (the re-pin promised in
 *    tests/style-route.test.ts).
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFile(path.join(ROOT, rel), "utf8");
const exists = (rel: string) =>
  fs.stat(path.join(ROOT, rel)).then(() => true, () => false);

/* the roster round-trip rides the dev file driver — isolate the cwd so the
   suite never touches the real data/studio.json (the T-158 pattern) */
const iso = isolateCwd("task-191-studio-");
afterAll(() => iso.cleanup());

describe("runnerItems — the ONE derivation (catalogue + calendar)", () => {
  const items = [
    { title: "Live meditation", status: "live" as const },
    { title: "A hidden ware", status: "hidden" as const },
    { title: "A sold-out reading", status: "soldout" as const },
    { title: "Second live ware", status: "live" as const },
  ];
  const bookings = [
    { serviceTitle: "A past session", startUtc: "2026-09-01T18:00:00.000Z", state: "confirmed" as const },
    { serviceTitle: "A held slot", startUtc: "2026-09-20T18:00:00.000Z", state: "held" as const },
    { serviceTitle: "A released slot", startUtc: "2026-09-21T18:00:00.000Z", state: "released" as const },
    { serviceTitle: "Soul Conversation", startUtc: "2026-09-12T19:00:00.000Z", state: "confirmed" as const },
    { serviceTitle: "A later reading", startUtc: "2026-09-25T19:00:00.000Z", state: "confirmed" as const },
  ];
  const nowMs = Date.parse("2026-09-08T12:00:00.000Z");

  it("live titles only — hidden and sold-out never advertise themselves", () => {
    const out = runnerItems({ items, bookings: [], nowMs });
    expect(out.map((i) => i.text)).toEqual(["Live meditation", "Second live ware"]);
    expect(out.every((i) => i.kind === "item")).toBe(true);
  });

  it("the next confirmed session leads, in UTC words — held, released and past sessions never do", () => {
    const out = runnerItems({ items, bookings, nowMs });
    expect(out[0]).toEqual({ kind: "session", text: "Next: Soul Conversation · Sat Sep 12 · 19:00 UTC" });
    expect(out.some((i) => i.text.includes("held") || i.text.includes("released") || i.text.includes("past"))).toBe(false);
    expect(out).toHaveLength(3);
  });

  it("nextSession picks the earliest confirmed slot ahead of now, or null", () => {
    expect(nextSession(bookings, nowMs)?.serviceTitle).toBe("Soul Conversation");
    expect(nextSession(bookings, Date.parse("2026-09-26T00:00:00.000Z"))).toBeNull();
    expect(runnerSlotWords("not a date")).toBe("");
  });

  it("the frame cap holds; an empty shelf and calendar give an empty runner", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ title: `Ware ${i}`, status: "live" as const }));
    expect(runnerItems({ items: many, bookings: [], nowMs })).toHaveLength(RUNNER_LIMIT);
    expect(runnerItems({ items: [], bookings: [], nowMs })).toEqual([]);
  });
});

describe("the overlay token gate", () => {
  beforeEach(() => {
    process.env.SEAT_SECRET = "task-191-test-secret";
  });

  it("no secret → honestly closed; a secret → configured", () => {
    delete process.env.SEAT_SECRET;
    expect(overlayConfigured()).toBe(false);
    expect(overlayToken("solo")).toBeNull();
    expect(verifyOverlayToken("solo", "anything")).toBe(false);
    process.env.SEAT_SECRET = "task-191-test-secret";
    expect(overlayConfigured()).toBe(true);
  });

  it("the right token opens its own scene — and only its own", () => {
    const token = overlayToken("solo");
    expect(typeof token).toBe("string");
    expect(verifyOverlayToken("solo", token)).toBe(true);
    expect(verifyOverlayToken("duo", token)).toBe(false);
    expect(verifyOverlayToken("phone", token)).toBe(false);
  });

  it("garbage, foreign and missing tokens never open any scene", () => {
    expect(verifyOverlayToken("solo", "deadbeef")).toBe(false);
    expect(verifyOverlayToken("solo", "")).toBe(false);
    expect(verifyOverlayToken("solo", undefined)).toBe(false);
    expect(verifyOverlayToken("duo", overlayToken("duo") + "ff")).toBe(false);
    expect(verifyOverlayToken("not-a-scene", overlayToken("solo"))).toBe(false);
  });

  it("a different secret mints a different token (rotation really rotates)", () => {
    const a = overlayToken("duo");
    process.env.SEAT_SECRET = "another-secret";
    const b = overlayToken("duo");
    expect(a).not.toBe(b);
    expect(verifyOverlayToken("duo", a)).toBe(false);
    expect(verifyOverlayToken("duo", b)).toBe(true);
  });
});

describe("the three scenes render their elements", () => {
  const tokens: OverlayTokens = {
    rose: "#C56E8B", gold: "#D9B24E", cream: "#FBF6EF", space: "#0a0a14",
    teal: "#8FD0D8", displayFont: "Barlow, sans-serif",
  };
  const base = {
    showTitle: "The Evening Show",
    mark: "/brand/mark.svg",
    host: { name: "The Host", specialty: "Readings" },
    guest: { name: "First Guest", specialty: "Astrology" },
    items: [
      { kind: "session" as const, text: "Next: Soul Conversation · Sat Sep 12 · 19:00 UTC" },
      { kind: "item" as const, text: "Live meditation" },
    ],
    tokens,
  };
  const render = (scene: "solo" | "duo" | "phone") =>
    renderToStaticMarkup(h(OverlayStage, { scene, ...base }));

  it("the scene ids are exactly the ruling's three, in order", () => {
    expect(STUDIO_SCENES.map((s) => s.id)).toEqual(["solo", "duo", "phone"]);
  });

  it("every scene wears the shared chrome: logo bug, LIVE pill, show title, runner", () => {
    for (const scene of ["solo", "duo", "phone"] as const) {
      const html = render(scene);
      expect(html).toContain('data-scene="' + scene + '"');
      expect(html).toContain('src="/brand/mark.svg"');
      expect(html).toContain("LIVE");
      expect(html).toContain("The Evening Show");
      expect(html).toContain("Live meditation");
      expect(html).toContain("Next: Soul Conversation");
    }
  });

  it("solo: the host's third alone — name and specialty, no guest", () => {
    const html = render("solo");
    expect(html).toContain("The Host");
    expect(html).toContain("Readings");
    expect(html).not.toContain("First Guest");
    expect(html).not.toContain("BY PHONE");
  });

  it("duo: host and guest thirds side by side, no phone chip", () => {
    const html = render("duo");
    expect(html).toContain("The Host");
    expect(html).toContain("First Guest");
    expect(html).toContain("Astrology");
    expect(html).not.toContain("BY PHONE");
  });

  it("phone: the guest leads with the BY PHONE chip, the host rides along", () => {
    const html = render("phone");
    expect(html).toContain("BY PHONE");
    expect(html).toContain("First Guest");
    expect(html).toContain("The Host");
  });

  it("derive-or-dash: no names typed, no thirds drawn; no items, no runner", () => {
    const html = renderToStaticMarkup(
      h(OverlayStage, { scene: "duo", ...base, host: { name: "", specialty: "" }, guest: null, items: [] }),
    );
    expect(html).not.toContain("The Host");
    expect(html).not.toContain("First Guest");
    expect(html).not.toContain("Live meditation");
    /* the stage itself still stands — bug, pill, title */
    expect(html).toContain("LIVE");
  });
});

describe("the roster round-trip (dev file driver, isolated cwd)", () => {
  it("save then read returns the same stage", async () => {
    const doc = {
      ...defaultStudioDoc(),
      showTitle: "The Evening Show",
      host: { name: "The Host", specialty: "Readings" },
      guests: [{ name: "First Guest", specialty: "Astrology" }],
      activeScene: "duo" as const,
    };
    const saved = await saveStudioDoc(doc);
    expect(saved).toEqual(doc);
    expect(await getStudioDoc()).toEqual(doc);
  });

  it("sanitize: the 7th guest and nameless rows drop, control chars strip, a bad scene falls back", async () => {
    const messy = {
      showTitle: "A title\u0007 with a bell",
      host: { name: "  Padded Host\n", specialty: "Readings" },
      guests: [
        { name: "", specialty: "nobody" },
        ...Array.from({ length: GUEST_LIMIT + 2 }, (_, i) => ({ name: `Guest ${i}`, specialty: "x" })),
      ],
      activeScene: "wide",
      anUnknownKey: true,
    };
    const saved = await saveStudioDoc(messy);
    expect(saved.showTitle).toBe("A title with a bell");
    expect(saved.host.name).toBe("Padded Host");
    expect(saved.guests).toHaveLength(GUEST_LIMIT);
    expect(saved.guests.some((g) => g.specialty === "nobody")).toBe(false);
    expect(saved.activeScene).toBe("solo");
    expect((saved as unknown as Record<string, unknown>).anUnknownKey).toBeUndefined();
    /* and the read side agrees — the file on disk is the same doc */
    expect(await getStudioDoc()).toEqual(saved);
  });

  it("an unwritten store reads as the honest empty stage", async () => {
    /* earlier tests wrote the doc — remove it to meet the unwritten truth */
    await fs.rm(path.join(process.cwd(), "data", "studio.json"), { force: true });
    const empty = await getStudioDoc();
    expect(empty).toEqual(defaultStudioDoc());
  });
});

describe("the GROUND ruling — the stub is gone, the new room gates", () => {
  it("T-175's /a/studio redirect stub is deleted; the designer's catch-all never returns", async () => {
    expect(await exists("src/app/a/studio/[[...slug]]")).toBe(false);
    expect(await exists("src/app/studio/[[...slug]]")).toBe(false);
  });

  it("the new /a/studio room gates like every /a room", async () => {
    const src = await read("src/app/a/studio/page.tsx");
    expect(src).toContain("operatorFromCookieHeader");
    expect(src).toContain('from "@/lib/operator-auth"');
    expect(src).toContain("if (!operator)");
    expect(src).toContain("<OperatorGate configured={operatorsConfigured()} />");
  });

  it("the overlay route gates on the signed token, never the cookie", async () => {
    const src = await read("src/app/studio/overlay/page.tsx");
    expect(src).toContain("verifyOverlayToken");
    expect(src).toContain("overlayConfigured");
    expect(src).not.toContain("operatorFromCookieHeader");
    /* nothing hand-typed: the stage reads the studio doc + the derivation */
    expect(src).toContain("getStudioDoc()");
    expect(src).toContain("loadRunnerItems()");
  });
});
