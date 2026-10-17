import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RoomsCardBody, type RoomsCardBodyProps } from "@/app/a/site/reading/RoomsCard";
import { DOORS, DOOR_SWITCH, SWITCHED_OFF_OPEN_WORDS, type DoorRowState } from "@/app/a/site/reading/rooms-config";

/**
 * TASK-631 (block 971,896, the Admiral: "the switches that are at the top
 * for house warming should also show hide the available rooms for love to
 * open at the bottom of the same page"). The week switches' SAVED values
 * reach `RoomsCardBody` as `switches`; a switched-off part's row drops
 * out, the Reading (no switch) always shows, and an OPEN room keeps its
 * row with one short line. Pure body rendered, no jsdom, as
 * `rooms-card.test.ts` does.
 */

const open: DoorRowState = { phase: "published", room: "oc-0123456789abcdef", jitsiDomain: "meet.fixture.invalid", camera: "hidden" };

function render(overrides: Partial<RoomsCardBodyProps> = {}): string {
  return renderToStaticMarkup(
    createElement(RoomsCardBody, {
      doors: DOORS,
      states: {},
      busy: {},
      errors: {},
      onOpen: () => {},
      onClose: () => {},
      onShowCamera: () => {},
      onHideCamera: () => {},
      ...overrides,
    }),
  );
}
const rows = (html: string) => [...html.matchAll(/<li data-row="([^"]+)"/g)].map((m) => m[1]);

describe("TASK-631: the week switches show and hide the rooms", () => {
  it("maps the doors to their switches, the Reading has none", () => {
    expect(DOOR_SWITCH).toEqual({ housewarming: "housewarming", stage2: "bookTalk", qa: "qa" });
    expect(DOOR_SWITCH.stage1).toBeUndefined();
  });

  it("all switches on = four rows", () => {
    expect(rows(render({ switches: { housewarming: true, bookTalk: true, qa: true } }))).toEqual(["housewarming", "stage1", "stage2", "qa"]);
  });

  it("switches not loaded yet = four rows", () => {
    expect(rows(render({ switches: {} }))).toHaveLength(4);
    expect(rows(render())).toHaveLength(4);
  });

  it("housewarming off = no Housewarming row", () => {
    const html = render({ switches: { housewarming: false, bookTalk: true, qa: true } });
    expect(rows(html)).toEqual(["stage1", "stage2", "qa"]);
    expect(html).not.toContain("Housewarming");
  });

  it("bookTalk and qa off = only Housewarming and Reading", () => {
    expect(rows(render({ switches: { housewarming: true, bookTalk: false, qa: false } }))).toEqual(["housewarming", "stage1"]);
  });

  it("the Reading shows even with every switch off", () => {
    expect(rows(render({ switches: { housewarming: false, bookTalk: false, qa: false } }))).toEqual(["stage1"]);
  });

  it("off but open = the row stays with the line", () => {
    const html = render({ switches: { housewarming: true, bookTalk: false, qa: true }, states: { stage2: open } });
    expect(rows(html)).toEqual(["housewarming", "stage1", "stage2", "qa"]);
    expect(html.split(SWITCHED_OFF_OPEN_WORDS.replace("'", "&#x27;"))).toHaveLength(2);
    expect(html).toContain("Close");
  });

  it("the line has no dash, arrow or emoji and is absent when the switch is on", () => {
    expect(SWITCHED_OFF_OPEN_WORDS).toBe("This part is switched off this week. Close the room when you're done.");
    expect(SWITCHED_OFF_OPEN_WORDS).not.toMatch(/[–—→←]|\p{Extended_Pictographic}/u);
    expect(render({ switches: { bookTalk: true }, states: { stage2: open } })).not.toContain("switched off");
  });
});
