import { describe, it, expect } from "vitest";
import { applyPlaylistToPuck } from "@/lib/about-playlist-puck";

/* T-161 seam 1: a published Puck /about keeps Love's saved playlist. */
const video = (id: string, youtube: string, ratio = "16/9") => ({ type: "Video", props: { id, youtube, ratio } });
const text = (id: string, t: string) => ({ type: "Text", props: { id, text: t } });

function fixture() {
  return {
    root: { props: { title: "About" } },
    content: [
      { type: "Band", props: { id: "b1", content: [
        text("t1", "story"),
        { type: "TwoCol", props: { id: "c1",
          left: [text("t2", "left words")],
          right: [video("v1", "AAAAAAAAAAA"), video("v2", "BBBBBBBBBBB", "9/16"), text("t3", "after the videos")],
        } },
      ] } },
      video("v9", "CCCCCCCCCCC"),
    ],
  };
}

const findVideos = (v: unknown, acc: string[] = []): string[] => {
  if (Array.isArray(v)) v.forEach((x) => findVideos(x, acc));
  else if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (o.type === "Video") acc.push(String((o.props as Record<string, unknown>).youtube));
    Object.values(o).forEach((x) => findVideos(x, acc));
  }
  return acc;
};

describe("applyPlaylistToPuck", () => {
  it("no saved list ⇒ the studio's own videos stand, untouched", () => {
    const data = fixture();
    expect(applyPlaylistToPuck(data, undefined)).toBe(data);
  });

  it("a saved list replaces the first run of Video blocks in place and drops later ones", () => {
    const data = fixture();
    const out = applyPlaylistToPuck(data, [
      { id: "XXXXXXXXXXX", title: "one", ratio: "16/9" },
      { id: "YYYYYYYYYYY", title: "two", ratio: "9/16" },
      { id: "ZZZZZZZZZZZ", title: "three", ratio: "16/9" },
    ]);
    expect(findVideos(out)).toEqual(["XXXXXXXXXXX", "YYYYYYYYYYY", "ZZZZZZZZZZZ"]);
    const right = (out.content[0] as { props: { content: { props: { right: { type: string; props: { ratio?: string } }[] } }[] } }).props.content[1].props.right;
    expect(right.map((b) => b.type)).toEqual(["Video", "Video", "Video", "Text"]);
    expect(right[1].props.ratio).toBe("9/16");
    // the stray top-level video after the run is gone; the rest of the page is intact
    expect(out.content.map((b: { type: string }) => b.type)).toEqual(["Band"]);
    expect(findVideos(data)).toEqual(["AAAAAAAAAAA", "BBBBBBBBBBB", "CCCCCCCCCCC"]); // input untouched
  });

  it("a saved EMPTY list removes every Video block (the honest empty state)", () => {
    const out = applyPlaylistToPuck(fixture(), []);
    expect(findVideos(out)).toEqual([]);
    const right = (out.content[0] as { props: { content: { props: { right: { type: string }[] } }[] } }).props.content[1].props.right;
    expect(right.map((b) => b.type)).toEqual(["Text"]);
  });

  it("fresh block ids never collide with each other", () => {
    const out = applyPlaylistToPuck(fixture(), [
      { id: "XXXXXXXXXXX", title: "one", ratio: "16/9" },
      { id: "YYYYYYYYYYY", title: "two", ratio: "16/9" },
    ]);
    const ids: string[] = [];
    const walk = (v: unknown) => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") {
        const o = v as Record<string, unknown>;
        if (o.type === "Video") ids.push(String((o.props as Record<string, unknown>).id));
        Object.values(o).forEach(walk);
      }
    };
    walk(out);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
