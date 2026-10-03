/**
 * TASK-548: the live line is two lines with no dash, and the chat/roster
 * failure words are plain, warm, and free of technical terms.
 */
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";

const strip = (h: string) => h.replace(/<!-- -->/g, "");

describe("the live line", () => {
  const props = { roomTitle: "Heart Field" };
  const cases: [string, Record<string, unknown>][] = [
    ["text-only door", { live: true }],
    ["embed", { live: true, jitsiDomain: "meet.onecocreation.com", liveRoom: "onecocreation-heart-field" }],
  ];
  for (const [name, extra] of cases) {
    it(`${name}: two lines, no dash`, async () => {
      const RoomVideoSlot = (await import("@/components/rooms/RoomVideoSlot")).default;
      const html = strip(renderToStaticMarkup(createElement(RoomVideoSlot, { ...props, ...extra } as never)));
      expect(html).toContain("Love is live in Heart Field now.<br/>The stage is lit.");
      expect(html).not.toContain("now — the stage");
    });
  }
  it("the source no longer carries the one-line sentence", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "src/components/rooms/RoomVideoSlot.tsx"), "utf8");
    expect(src).not.toContain("the stage is lit.");
  });
});

describe("chat and roster failure words", () => {
  it("chat closed line is plain", async () => {
    const { CHAT_CLOSED_LINE } = await import("@/components/rooms/RoomView");
    expect(CHAT_CLOSED_LINE).toBe("The chat is not open right now. You can still watch and listen here.");
    expect(CHAT_CLOSED_LINE).not.toMatch(/matrix|login|configured|sync|—|–/i);
  });
  it("roster failed line is plain", async () => {
    const { ROSTER_FAILED_LINE, ROOM_BUSY_LINE } = await import("@/components/rooms/RoomPresence");
    expect(ROSTER_FAILED_LINE).toBe("We could not load who's here. Try again in a moment.");
    for (const l of [ROSTER_FAILED_LINE, ROOM_BUSY_LINE]) expect(l).not.toMatch(/matrix|login|configured|sync|—|–|M_/i);
  });
  it("RoomView error state shows the fixed line and Back to the rooms, never the server reason", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "src/components/rooms/RoomView.tsx"), "utf8");
    expect(src).toContain("{CHAT_CLOSED_LINE}");
    expect(src).toContain(">Back to the rooms</Link>");
    expect(src).not.toContain("◌ {reason}");
    // the cause is kept for whoever helps the guest, as an attribute, never as words
    expect(src).toContain("data-reason={reason || undefined}");
    expect(src).not.toMatch(/>\s*\{reason\}/);
  });
});
