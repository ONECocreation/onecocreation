import type { AboutVideo } from "@/lib/about-content";

/**
 * T-161 seam 1 (Number One follow-through, 0018.06.17 a₿ · block 966,083):
 * a published Puck /about is a SNAPSHOT — its Video blocks are whatever was
 * seeded or edited in the studio. Love's saved playlist (the /a/site
 * "Videos on About" card) must still win on the live page, so before the
 * Puck render the FIRST run of Video blocks anywhere in the page data is
 * replaced by her saved list (same place, same shape), and any later Video
 * blocks are dropped so the page never shows two playlists. A saved EMPTY
 * list removes the videos (the honest empty state). No saved list ⇒ the data
 * is returned untouched (the studio's own videos stand).
 *
 * Pure: the input object is never mutated.
 */
type Block = { type?: unknown; props?: Record<string, unknown> } & Record<string, unknown>;

const isBlock = (v: unknown): v is Block => !!v && typeof v === "object" && !Array.isArray(v) && typeof (v as Block).type === "string";

export function applyPlaylistToPuck<T>(data: T, videos: AboutVideo[] | undefined): T {
  if (!videos) return data;
  let placed = false;
  let n = 0;
  const fresh = (): Block[] =>
    videos.map((v) => ({ type: "Video", props: { id: `ab-playlist-${n++}`, youtube: v.id, ratio: v.ratio } }));

  const walkArray = (arr: unknown[]): unknown[] => {
    const out: unknown[] = [];
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      if (isBlock(item) && item.type === "Video") {
        if (!placed) {
          placed = true;
          out.push(...fresh());
        }
        continue; // the rest of this run, and any later Video block, is dropped
      }
      out.push(walk(item));
    }
    return out;
  };

  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return walkArray(v);
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      const copy: Record<string, unknown> = {};
      for (const k of Object.keys(o)) copy[k] = walk(o[k]);
      return copy;
    }
    return v;
  };

  return walk(data) as T;
}

/**
 * Love's pictures are LEVEL, never fanned (the Admiral, 0018.06.17 a₿): a
 * published /about snapshot may still carry Gallery blocks with tilt "yes"
 * from an older seed — the live render sets every Gallery's tilt to "no".
 * Pure; the input is never mutated.
 */
export function levelGalleries<T>(data: T): T {
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      const copy: Record<string, unknown> = {};
      for (const k of Object.keys(o)) copy[k] = walk(o[k]);
      if (copy.type === "Gallery" && copy.props && typeof copy.props === "object") {
        copy.props = { ...(copy.props as Record<string, unknown>), tilt: "no" };
      }
      return copy;
    }
    return v;
  };
  return walk(data) as T;
}
