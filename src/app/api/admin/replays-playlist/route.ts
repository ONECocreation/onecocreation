import { NextResponse } from "next/server";
import { operatorFromCookieHeader } from "@/lib/operator-auth";
import { parseYoutubePlaylistInput } from "@/lib/youtube-id";
import {
  getSavedPlaylist,
  savePlaylist,
  writePlaylistCache,
  fetchPlaylistFeed,
  parsePlaylistFeed,
} from "@/lib/replays-source";

export const dynamic = "force-dynamic";

/**
 * TASK-532 (blocks 969,313 + 969,334) - the PLAYLIST's operator door,
 * ruling 3: the playlist id lives in its OWN small KV doc
 * (`replays:playlist:<TENANT>`, replays-source.ts), NOT on the site-config
 * doc, so this lane never touches site-config.ts or /api/admin/site
 * (T-499's ground). The gate is /api/admin/site's own shape exactly: the
 * client card is a courtesy, this check is the gate.
 *
 * PUT { playlist: <link or id> } saves (a malformed link is refused 400 IN
 * WORDS, the replaysPatchError idiom, and NOTHING is written); on save the
 * route probes the feed once and reports `found: N` so Love sees it work
 * before she walks away - a good probe also warms the last-good cache, so
 * the page's next render never re-fetches. A save YouTube cannot answer
 * right now is STILL saved (found: 0 plus the honest note) - the page
 * keeps the manual rows and retries on its own. { playlist: null } (or an
 * empty string) CLEARS the doc and the cache both.
 */

/** The client screens are a courtesy; this check is the gate. */
function gate(request: Request): NextResponse | null {
  const operator = operatorFromCookieHeader(request.headers.get("cookie"));
  if (!operator) return NextResponse.json({ ok: false, reason: "operator session required" }, { status: 401 });
  return null;
}

export async function GET(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  const doc = await getSavedPlaylist();
  return NextResponse.json({ ok: true, playlist: doc ? { id: doc.id } : null });
}

export async function PUT(request: Request) {
  const denied = gate(request);
  if (denied) return denied;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad request" }, { status: 400 });
  }
  const raw = (body as Record<string, unknown> | null)?.playlist;

  /* CLEAR: null or an empty field wipes the doc and the cache. */
  if (raw === null || raw === "") {
    try {
      await savePlaylist(null);
    } catch {
      return NextResponse.json({ ok: false, reason: "the vault did not answer - nothing was cleared" }, { status: 503 });
    }
    return NextResponse.json({ ok: true, playlist: null });
  }

  if (typeof raw !== "string") {
    return NextResponse.json({ ok: false, reason: "bad request" }, { status: 400 });
  }
  const id = parseYoutubePlaylistInput(raw);
  if (!id) {
    return NextResponse.json(
      {
        ok: false,
        reason:
          "That does not look like a YouTube playlist link. Paste the playlist link (it has list=PL... in the address) or the playlist id itself. Playlist ids start with PL; a channel's uploads list starts with UU.",
      },
      { status: 400 },
    );
  }

  try {
    await savePlaylist(id);
  } catch {
    return NextResponse.json({ ok: false, reason: "the vault did not answer - nothing was saved" }, { status: 503 });
  }

  /* The one honest probe: Love sees it work before she walks away. A good
     answer also warms the last-good cache; any failure is found: 0 with
     the plain note (the save stands - the page retries on its own). */
  const xml = await fetchPlaylistFeed(id);
  const items = xml ? parsePlaylistFeed(xml) : null;
  if (items) {
    try {
      await writePlaylistCache({ id, fetchedAtMs: Date.now(), items });
    } catch {
      /* a cache write that fails is not a failed save: the doc stands and
         the page refetches on its own - nothing false is reported */
    }
    return NextResponse.json({ ok: true, playlist: { id }, found: items.length });
  }
  return NextResponse.json({
    ok: true,
    playlist: { id },
    found: 0,
    note: "Saved, but YouTube did not answer just now. The Replays page keeps your hand-added rows and picks the playlist up on its own when YouTube answers.",
  });
}
