/**
 * TASK-161 (0018.06.17 a₿ · block 966,080) — the About playlist in Love's
 * hands. She pastes whatever YouTube gives her — a watch link, a youtu.be
 * short link, a Shorts link, an embed link, a live link, or the bare video
 * id — and this one module answers the only two questions the house ever
 * asks: WHAT is the 11-character id, and does this look like a Short
 * (portrait by default)? Anything that isn't one of those shapes is
 * refused with `null` — the caller says so IN WORDS, never a guessed embed
 * (derive-or-dash).
 *
 * A YouTube id is exactly 11 chars of [A-Za-z0-9_-]; every accepted shape
 * below is only a different wrapper around that one kernel.
 */

export interface ParsedYoutube {
  /** the 11-char video id — the only form the house stores */
  id: string;
  /** true when the pasted shape was /shorts/ — the card's portrait default */
  likelyShort: boolean;
}

/** the one kernel every accepted shape wraps: exactly 11 of [A-Za-z0-9_-] */
export const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

const ID = YOUTUBE_ID_RE;

/** YouTube URL (any shape the house accepts) or bare id → the id, or null.
    Refuses (null): other hosts, playlist links, channel pages, a
    watch link with no/short/overlong v=, bare text that isn't an id. */
export function parseYoutubeInput(raw: string): ParsedYoutube | null {
  const s = raw.trim();
  if (!s) return null;
  // the bare id — no wrapper at all
  if (ID.test(s)) return { id: s, likelyShort: false };
  // everything else must be an http(s) URL on a YouTube host
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, "");
  // youtu.be/<id>
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return ID.test(id) ? { id, likelyShort: false } : null;
  }
  if (host !== "youtube.com") return null;
  const parts = url.pathname.split("/").filter(Boolean);
  // youtube.com/watch?v=<id>
  if (parts[0] === "watch") {
    const id = url.searchParams.get("v") ?? "";
    return ID.test(id) ? { id, likelyShort: false } : null;
  }
  // youtube.com/shorts|embed|live/<id>
  if ((parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live") && parts.length === 2) {
    return ID.test(parts[1]) ? { id: parts[1], likelyShort: parts[0] === "shorts" } : null;
  }
  return null;
}
