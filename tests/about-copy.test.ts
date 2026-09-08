import { describe, it, expect } from "vitest";
import {
  ABOUT_BRIDGE_LINE,
  ABOUT_JOIN_LINES,
  ABOUT_PINK_DOOR,
  ABOUT_VIDEOS,
  ABOUT_VIDEOS_EMPTY,
} from "@/lib/about-content";

/**
 * TASK-154 (0018.06.17 a₿ · block 966,019) — Love's About pass. These pins
 * hold the page's derived contract — the exported copy/door/playlist model
 * (the login-card/store-cards idiom: pin the model, not the render; this
 * repo's tests run in a node environment with no DOM). The LOOK (darker
 * galaxy, level square faces, the white script outline, the pink pour) is
 * proven by the shots in the lane's outbox.
 */

describe("TASK-154 — the About page copy contract", () => {
  it("item 7 — the join-us heading reads 'Breathe with us', never 'The Weekly Intuitive'", () => {
    expect(`${ABOUT_JOIN_LINES.ink} ${ABOUT_JOIN_LINES.teal}`.toLowerCase()).toBe("breathe with us");
    expect(JSON.stringify(ABOUT_JOIN_LINES)).not.toMatch(/weekly intuitive/i);
  });

  it("items 4 + 7 — the YES! door and the account door pour the house pink (.btn .btn-rose)", () => {
    expect(ABOUT_PINK_DOOR.split(" ")).toEqual(expect.arrayContaining(["btn", "btn-rose"]));
  });

  it("item 6 — the Bridge line drops the period after 'Meet'", () => {
    expect(ABOUT_BRIDGE_LINE).toContain("Where Heaven and Earth Meet");
    expect(ABOUT_BRIDGE_LINE).not.toContain("Meet.");
    expect(ABOUT_BRIDGE_LINE.trim().endsWith("”")).toBe(true);
  });

  it("item 8 — the video spot is a playlist: several videos, not one", () => {
    expect(ABOUT_VIDEOS.length).toBeGreaterThanOrEqual(2);
  });

  it("item 8 — every entry is a real YouTube id with a human title and an embed ratio (derive-or-dash)", () => {
    const ids = new Set<string>();
    for (const v of ABOUT_VIDEOS) {
      expect(v.id).toMatch(/^[\w-]{11}$/);
      expect(ids.has(v.id)).toBe(false); // no doubles in the list
      ids.add(v.id);
      expect(v.title.trim().length).toBeGreaterThan(0);
      expect(v.ratio).toMatch(/^\d+\/\d+$/);
    }
  });

  it("item 8 — her most-loved short keeps its place at the head of the list", () => {
    expect(ABOUT_VIDEOS[0]?.id).toBe("2LrWVQDnLd0");
    expect(ABOUT_VIDEOS[0]?.title).toBe("What Breath in discomfort?");
  });

  it("item 8 — the empty state is honest words, never a broken frame", () => {
    expect(ABOUT_VIDEOS_EMPTY).toMatch(/no videos here yet/i);
  });
});
