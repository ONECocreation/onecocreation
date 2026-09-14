import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * TASK-247 (0018.06.23 a₿ · block ~966,922, cut from the Admiral via Love's
 * call: "the emote button on the chat window is in the center of the text
 * — most emojis on other social sites are on the right bottom side of the
 * item. would also love some more emojis on there, different colour hearts
 * are always nice.") — the chat's heart moves to the card's bottom-right
 * corner and becomes a small reaction picker.
 *
 * RoomView talks straight to the homeserver behind a client-only useEffect,
 * so its "open" render never happens under renderToStaticMarkup (no fetch,
 * no effect runs). The reader, the send shape, and the picker's membership
 * are all exported as pure functions/constants from RoomView.tsx for that
 * reason — these pins exercise the real logic the component calls, not a
 * re-implementation of it.
 */

describe("parseTimelineChunk — reactions are a map per key", () => {
  it("counts two different keys on the same message separately", async () => {
    const { parseTimelineChunk } = await import("@/components/rooms/RoomView");
    const chunk = [
      { type: "m.room.message", event_id: "$m1", sender: "@a:oc", origin_server_ts: 1, content: { body: "hi", msgtype: "m.text" } },
      { type: "m.reaction", event_id: "$r1", sender: "@b:oc", origin_server_ts: 2, content: { "m.relates_to": { rel_type: "m.annotation", event_id: "$m1", key: "❤️" } } },
      { type: "m.reaction", event_id: "$r2", sender: "@c:oc", origin_server_ts: 3, content: { "m.relates_to": { rel_type: "m.annotation", event_id: "$m1", key: "❤️" } } },
      { type: "m.reaction", event_id: "$r3", sender: "@d:oc", origin_server_ts: 4, content: { "m.relates_to": { rel_type: "m.annotation", event_id: "$m1", key: "💜" } } },
    ];
    const { reactions } = parseTimelineChunk(chunk);
    expect(reactions["$m1"]).toEqual({ "❤️": 2, "💜": 1 });
  });

  it("tracks myReactions as a set of keys per message, keyed on the viewer's own userId", async () => {
    const { parseTimelineChunk } = await import("@/components/rooms/RoomView");
    const chunk = [
      { type: "m.reaction", event_id: "$r1", sender: "@me:oc", origin_server_ts: 1, content: { "m.relates_to": { rel_type: "m.annotation", event_id: "$m1", key: "❤️" } } },
      { type: "m.reaction", event_id: "$r2", sender: "@me:oc", origin_server_ts: 2, content: { "m.relates_to": { rel_type: "m.annotation", event_id: "$m1", key: "🔥" } } },
      { type: "m.reaction", event_id: "$r3", sender: "@someoneelse:oc", origin_server_ts: 3, content: { "m.relates_to": { rel_type: "m.annotation", event_id: "$m1", key: "🙏" } } },
    ];
    const { myReactions } = parseTimelineChunk(chunk, "@me:oc");
    expect(myReactions["$m1"]).toBeInstanceOf(Set);
    expect([...myReactions["$m1"]].sort()).toEqual(["❤️", "🔥"]);
  });

  it("the legacy ❤️-only events still count — no regression for old messages", async () => {
    const { parseTimelineChunk } = await import("@/components/rooms/RoomView");
    // shaped exactly as the pre-T-247 sender always sent it: key is
    // hardcoded "❤️", nothing else on the relation.
    const chunk = [
      { type: "m.reaction", event_id: "$r1", sender: "@a:oc", origin_server_ts: 1, content: { "m.relates_to": { rel_type: "m.annotation", event_id: "$old1", key: "❤️" } } },
    ];
    const { reactions } = parseTimelineChunk(chunk);
    expect(reactions["$old1"]).toEqual({ "❤️": 1 });
  });

  it("ignores non-annotation relations and relations with no key", async () => {
    const { parseTimelineChunk } = await import("@/components/rooms/RoomView");
    const chunk = [
      { type: "m.reaction", event_id: "$r1", sender: "@a:oc", origin_server_ts: 1, content: { "m.relates_to": { rel_type: "m.replace", event_id: "$m1", key: "❤️" } } },
      { type: "m.reaction", event_id: "$r2", sender: "@a:oc", origin_server_ts: 2, content: { "m.relates_to": { rel_type: "m.annotation", event_id: "$m1" } } },
    ];
    const { reactions } = parseTimelineChunk(chunk);
    expect(reactions).toEqual({});
  });
});

describe("the send path — the tapped key rides the body, the txn id keeps its shape", () => {
  it("reactionEventBody carries the exact key that was tapped", async () => {
    const { reactionEventBody } = await import("@/components/rooms/RoomView");
    expect(reactionEventBody("$m1", "💙")).toEqual({
      "m.relates_to": { rel_type: "m.annotation", event_id: "$m1", key: "💙" },
    });
    expect(reactionEventBody("$m1", "🔥")).toEqual({
      "m.relates_to": { rel_type: "m.annotation", event_id: "$m1", key: "🔥" },
    });
  });

  it("reactionSendPath keeps the oc<stamp>h<n> txn-id shape", async () => {
    const { reactionSendPath } = await import("@/components/rooms/RoomView");
    expect(reactionSendPath("!room:oc", 1700000000000, 3)).toBe(
      "/rooms/!room%3Aoc/send/m.reaction/oc1700000000000h3",
    );
  });
});

describe("canReact — once per person per key", () => {
  it("allows a key not yet in the set, and a first reaction with no set at all", async () => {
    const { canReact } = await import("@/components/rooms/RoomView");
    expect(canReact(undefined, "❤️")).toBe(true);
    expect(canReact(new Set(["💜"]), "❤️")).toBe(true);
  });

  it("blocks a key already sent by this viewer for this message", async () => {
    const { canReact } = await import("@/components/rooms/RoomView");
    expect(canReact(new Set(["❤️"]), "❤️")).toBe(false);
  });
});

describe("ReactionPicker — the RENDERED popover carries all 12 buttons (not just the data array)", () => {
  it("renders exactly 12 role=menuitem buttons, one per REACTION_EMOJIS entry, in order, none clipped out of the markup", async () => {
    const { ReactionPicker, REACTION_EMOJIS } = await import("@/components/rooms/RoomView");
    const html = renderToStaticMarkup(createElement(ReactionPicker, { onPick: () => {} }));
    const matches = [...html.matchAll(/role="menuitem"/g)];
    expect(matches).toHaveLength(12);
    // every emoji actually appears as a button's own text, in REACTION_EMOJIS' order
    let cursor = -1;
    for (const { key } of REACTION_EMOJIS) {
      const at = html.indexOf(`>${key}</button>`);
      expect(at, `${key} is missing from the rendered picker`).toBeGreaterThan(-1);
      expect(at, `${key} is out of order`).toBeGreaterThan(cursor);
      cursor = at;
    }
  });

  it("lays out as a fixed 6-column grid — two rows of six, not one row of twelve (T-247's re-shot fix: a one-row-of-12 was wider than a short message bubble and got clipped by the messages pane's implicit overflow-x)", async () => {
    const { ReactionPicker } = await import("@/components/rooms/RoomView");
    const html = renderToStaticMarkup(createElement(ReactionPicker, { onPick: () => {} }));
    expect(html).toMatch(/grid-template-columns:\s*repeat\(6,\s*auto\)/);
  });

  it("every menu item's aria-label carries \"react with <name>\"", async () => {
    const { ReactionPicker, REACTION_EMOJIS } = await import("@/components/rooms/RoomView");
    const html = renderToStaticMarkup(createElement(ReactionPicker, { onPick: () => {} }));
    for (const { name } of REACTION_EMOJIS) {
      expect(html).toContain(`aria-label="react with ${name}"`);
    }
  });
});

describe("REACTION_EMOJIS — the picker lists exactly the 12, coloured hearts first, in order", () => {
  it("is exactly the 12 the Admiral asked for, in this order", async () => {
    const { REACTION_EMOJIS } = await import("@/components/rooms/RoomView");
    expect(REACTION_EMOJIS.map((r) => r.key)).toEqual([
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🤍", "🩷", "✨", "🙏", "😊", "🔥",
    ]);
    expect(REACTION_EMOJIS).toHaveLength(12);
  });

  it("every entry carries a name for its aria-label (\"react with <name>\")", async () => {
    const { REACTION_EMOJIS } = await import("@/components/rooms/RoomView");
    for (const { name } of REACTION_EMOJIS) {
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
    }
  });
});
