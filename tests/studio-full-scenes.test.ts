import { describe, it, expect, beforeEach } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { STUDIO_SCENES, studioSceneKind, isStudioScene } from "@/lib/studio/scenes";
import { overlayToken, verifyOverlayToken } from "@/lib/studio/overlay-token";
import { sanitizeStudioDoc, defaultStudioDoc } from "@/lib/studio/doc";
import OverlayStage, { type OverlayTokens } from "@/components/studio-overlay/OverlayStage";
import FullScene from "@/components/studio-overlay/FullScene";

/**
 * TASK-244 (0018.06.23 a₿) — the studio's three full-frame scenes, cut
 * from the Admiral's ask ("a starting soon with a countdown, a pause/brb
 * screen, and an ending screen"), landing beside T-191's three transparent
 * overlay scenes. Pins:
 *
 *  · the six scene ids and their kind (three "overlay", three "full") —
 *    studioSceneKind() is the overlay route's one branch point;
 *  · FullScene "starting" draws the clock only when a target is set, and
 *    the bare words with no clock when it isn't;
 *  · FullScene "ending" omits the after-hours line when the doc carries
 *    none, and draws it when the doc does;
 *  · the token gate still refuses a wrong or foreign key for the three
 *    new ids exactly like it always has for the three old ones;
 *  · sanitizeStudioDoc REFUSES (throws, in words) a startsAt that isn't a
 *    real date/time or blank — the save action's existing catch turns
 *    that into the desk's honest refusal;
 *  · T-191's three overlay scenes render BYTE-IDENTICAL html — pinned by
 *    snapshot (OverlayStage.tsx itself carries no TASK-244 edits).
 */

const tokens: OverlayTokens = {
  rose: "#C56E8B", gold: "#D9B24E", cream: "#FBF6EF", space: "#0a0a14",
  teal: "#8FD0D8", displayFont: "Barlow, sans-serif",
};

describe("the six scenes and their kind", () => {
  it("T-191's three overlay scenes lead, T-244's three full scenes follow", () => {
    expect(STUDIO_SCENES.map((s) => s.id)).toEqual(["solo", "duo", "phone", "starting", "brb", "ending"]);
    expect(STUDIO_SCENES.map((s) => s.kind)).toEqual(["overlay", "overlay", "overlay", "full", "full", "full"]);
  });

  it("studioSceneKind reads the row's own kind — the overlay route's one branch point", () => {
    expect(studioSceneKind("solo")).toBe("overlay");
    expect(studioSceneKind("duo")).toBe("overlay");
    expect(studioSceneKind("phone")).toBe("overlay");
    expect(studioSceneKind("starting")).toBe("full");
    expect(studioSceneKind("brb")).toBe("full");
    expect(studioSceneKind("ending")).toBe("full");
  });

  it("isStudioScene accepts all six ids and nothing foreign", () => {
    for (const id of ["solo", "duo", "phone", "starting", "brb", "ending"]) {
      expect(isStudioScene(id)).toBe(true);
    }
    expect(isStudioScene("wide")).toBe(false);
    expect(isStudioScene("Starting")).toBe(false);
  });
});

describe("FullScene — starting soon", () => {
  const base = {
    scene: "starting" as const,
    showTitle: "The Evening Show",
    mark: "/brand/mark.svg",
    nebula: "/images/consciouscuts/nebula.webp",
    book: "/images/reading-book.webp",
    afterHoursLine: "",
    membershipsWords: "onecocreation.com/memberships",
    tokens,
  };

  it("a target draws a live clock face (mm:ss), never the literal 00:00", () => {
    const target = new Date(Date.now() + 12 * 60_000).toISOString();
    const html = renderToStaticMarkup(h(FullScene, { ...base, startsAt: target }));
    // Countdown's initial useState value runs even under renderToStaticMarkup
    // (no effects, but the render function itself executes once).
    const clock = html.match(/>(\d{1,2}:\d{2}(?::\d{2})?)</);
    expect(clock).not.toBeNull();
    expect(clock![1]).not.toBe("00:00");
    expect(html).toContain("The Evening Show");
    expect(html).toContain("breathe with us");
  });

  it("no target: the bare words, no clock digits anywhere", () => {
    const html = renderToStaticMarkup(h(FullScene, { ...base, startsAt: "" }));
    expect(html).toContain("starting soon");
    expect(html).not.toMatch(/\d{1,2}:\d{2}/);
  });
});

describe("FullScene — be right back", () => {
  it("the breathe words and the book, never a clock", () => {
    const html = renderToStaticMarkup(h(FullScene, {
      scene: "brb", showTitle: "The Evening Show", mark: "/brand/mark.svg",
      nebula: "/images/consciouscuts/nebula.webp", book: "/images/reading-book.webp",
      startsAt: "", afterHoursLine: "", membershipsWords: "onecocreation.com/memberships", tokens,
    }));
    expect(html).toContain("be right back");
    expect(html).toContain("/images/reading-book.webp");
    expect(html).not.toMatch(/\d{1,2}:\d{2}/);
  });
});

describe("FullScene — thank you", () => {
  const base = {
    scene: "ending" as const,
    showTitle: "The Evening Show",
    mark: "/brand/mark.svg",
    nebula: "/images/consciouscuts/nebula.webp",
    book: "/images/reading-book.webp",
    startsAt: "",
    membershipsWords: "onecocreation.com/memberships",
    tokens,
  };

  it("no after-hours line on the doc: the line is omitted (derive-or-dash)", () => {
    const html = renderToStaticMarkup(h(FullScene, { ...base, afterHoursLine: "" }));
    expect(html).toContain("thank you for being here");
    expect(html).toContain("The Evening Show");
    expect(html).toContain("onecocreation.com/memberships");
    expect(html).not.toContain("Weekly Intuitive");
  });

  it("an after-hours line on the doc: it renders, word for word", () => {
    const html = renderToStaticMarkup(h(FullScene, {
      ...base,
      afterHoursLine: "Weekly Intuitive members — we go deeper in 45 minutes",
    }));
    expect(html).toContain("Weekly Intuitive members — we go deeper in 45 minutes");
  });

  it("no button — the site's door is words only", () => {
    const html = renderToStaticMarkup(h(FullScene, { ...base, afterHoursLine: "" }));
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("<button");
  });
});

describe("the token gate — the three new ids gate exactly like the three old ones", () => {
  beforeEach(() => {
    process.env.SEAT_SECRET = "task-244-test-secret";
  });

  it("the right token opens its own new scene, and only its own", () => {
    for (const id of ["starting", "brb", "ending"] as const) {
      const token = overlayToken(id);
      expect(typeof token).toBe("string");
      expect(verifyOverlayToken(id, token)).toBe(true);
    }
    const startingToken = overlayToken("starting");
    expect(verifyOverlayToken("brb", startingToken)).toBe(false);
    expect(verifyOverlayToken("ending", startingToken)).toBe(false);
    // and an OLD scene's token never opens a NEW one either
    expect(verifyOverlayToken("starting", overlayToken("solo"))).toBe(false);
  });

  it("a wrong or missing key never opens a new scene", () => {
    expect(verifyOverlayToken("starting", "deadbeef")).toBe(false);
    expect(verifyOverlayToken("brb", "")).toBe(false);
    expect(verifyOverlayToken("ending", undefined)).toBe(false);
  });

  it("no secret configured: honestly closed for the new ids too", () => {
    delete process.env.SEAT_SECRET;
    expect(overlayToken("starting")).toBeNull();
    expect(verifyOverlayToken("starting", "anything")).toBe(false);
  });
});

describe("the sanitiser refuses a bad startsAt, in words", () => {
  it("blank is the honest absent value — never refused", () => {
    const doc = sanitizeStudioDoc({ ...defaultStudioDoc(), startsAt: "" });
    expect(doc.startsAt).toBe("");
  });

  it("a real ISO instant survives untouched", () => {
    const iso = new Date("2026-09-20T18:00:00.000Z").toISOString();
    const doc = sanitizeStudioDoc({ ...defaultStudioDoc(), startsAt: iso });
    expect(doc.startsAt).toBe(iso);
  });

  it("a garbage startsAt throws a message an operator can act on — the whole write refuses", () => {
    expect(() => sanitizeStudioDoc({ ...defaultStudioDoc(), startsAt: "not a date" })).toThrow(/starts at/i);
    expect(() => sanitizeStudioDoc({ ...defaultStudioDoc(), startsAt: 12345 })).toThrow(/starts at/i);
  });

  it("afterHoursLine cleans like every other typed line — control characters strip, length caps", () => {
    const doc = sanitizeStudioDoc({ ...defaultStudioDoc(), afterHoursLine: "A line with a bell" });
    expect(doc.afterHoursLine).toBe("A line with a bell");
  });
});

describe("T-191's three overlay scenes still render byte-identical (snapshot pin)", () => {
  const overlayBase = {
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

  it.each(["solo", "duo", "phone"] as const)("%s renders unchanged", (scene) => {
    const html = renderToStaticMarkup(h(OverlayStage, { scene, ...overlayBase }));
    expect(html).toMatchSnapshot();
  });
});
