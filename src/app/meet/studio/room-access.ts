import { getSiteConfig } from "@/lib/site-config";
import { getBooking } from "@/lib/booking-orders";
import { getService } from "@/lib/booking";
import { studioRoomKey } from "@/lib/live";
import { studioGuestLink, isStudioNamespaceRoom, vdoBase } from "@/lib/live-links";

/**
 * THE IN-SITE ROOM'S ONE ACCESS READ (TASK-297, 0018.06.25 a₿ · block
 * ~967,218) — who may open `/meet/studio/<room>`, and what the room is
 * called. T-292 DESIGN.md §2 Page B: the URL the site hands out is OURS,
 * never the vdo host; the room id is the capability (the
 * `/meet/[bookingId]` law). A room id resolves here EXACTLY three honest
 * ways, in this order — anything else is `null`, and the page 404s:
 *
 *  1. THE REGISTRY — the fork's own `brand/rooms.json` (TASK-262), fetched
 *     from the studio host at request time (5-minute revalidate; it only
 *     changes on a fork deploy). Matched through the fork's own sanitize
 *     rule (lib.js:3747-3758, non-word chars → `_`) on BOTH sides, the
 *     same interop T-262 built into the brand layer, so a hyphen-typed
 *     key still names its underscore room. A failed read is NOT a closed
 *     door — derive-or-dash: the room may still resolve by namespace or
 *     booking, it just shows no pretty title.
 *  2. THE NAMESPACE — `<vdoRoomPrefix>_<word>` (isStudioNamespaceRoom,
 *     live-links.ts): the standing studio room (`<prefix>_studio`) and
 *     every ad-hoc co-create room the /a/live door derives. No pretty
 *     title unless the registry gave one — the page carries the room id
 *     and a plain line, never an invented name.
 *  3. THE BOOKING — a CONFIRMED booking whose service rides the vdo rail
 *     (the `/meet/[bookingId]` vdo branch, flipped in-site by this lane):
 *     the booking id IS the room id (that page's own derivation), and its
 *     service title is the room's honest human name.
 *
 * `mintStudioFrameTarget` is the ONLY mint of the keyed studio URL on
 * this route tree — the key (`studioRoomKey`, live.ts) rides this one
 * string into the frame route's 302 Location and nowhere else: never in
 * the page's HTML, never in the URL we hand out (T-292 §4's posture,
 * pinned in tests/meet-studio.test.ts).
 */

export interface StudioRoomAccess {
  kind: "registry" | "namespace" | "booking";
  /** the room's human title — registry entry or booking service title;
   *  null = no honest name, the page shows the room id (derive-or-dash) */
  title: string | null;
  /** the registry entry's note line; null when there isn't one */
  note: string | null;
}

/** the fork's sanitizeRoomName (lib.js:3747-3758), mirrored for matching —
 *  never for rewriting what we STORE, only for finding a rooms.json key */
function sanitizeRoomId(id: string): string {
  return id.replace(/[\W]+/g, "_");
}

interface RoomsJson {
  [id: string]: { title?: string; note?: string };
}

/** the fork's brand/rooms.json, fetched from the studio host; null on any
 *  failure (network down, bad JSON, non-object) — never a thrown page */
async function fetchRoomsJson(vdoHost: string): Promise<RoomsJson | null> {
  try {
    const res = await fetch(`${vdoBase(vdoHost)}brand/rooms.json`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const data = (await res.json()) as unknown;
    if (!data || typeof data !== "object" || Array.isArray(data)) return null;
    return data as RoomsJson;
  } catch {
    return null;
  }
}

export async function resolveStudioRoom(room: string): Promise<StudioRoomAccess | null> {
  if (!room || room.length > 80) return null;
  const config = await getSiteConfig();
  const prefix = config.meeting.vdoRoomPrefix;

  const registry = await fetchRoomsJson(config.meeting.vdoHost);
  if (registry) {
    const wanted = sanitizeRoomId(room);
    for (const [id, entry] of Object.entries(registry)) {
      if (id.startsWith("_")) continue; // the file's own "_comment" key (TASK-262)
      if (sanitizeRoomId(id) === wanted) {
        return { kind: "registry", title: entry?.title?.trim() || null, note: entry?.note?.trim() || null };
      }
    }
  }

  if (isStudioNamespaceRoom(room, prefix)) {
    return { kind: "namespace", title: null, note: null };
  }

  const booking = await getBooking(room);
  if (booking && booking.state === "confirmed") {
    const service = await getService(booking.serviceId);
    if (service?.meetingRail?.kind === "vdo") {
      return { kind: "booking", title: booking.serviceTitle?.trim() || null, note: null };
    }
  }

  return null;
}

/** The keyed studio URL the frame route 302s to. Built on the SHARED
 *  `studioGuestLink` (both-off arrival baked in: `&mute&videomute`,
 *  Love's call #4 item 6 ruling), then:
 *   · the pre-join card's toggles HONOURED — camera/mic flipped on before
 *     join strips that half's off-param (`&videomute` / `&mute`; each is
 *     an unambiguous substring — "&videomute" never contains "&mute",
 *     and the label/key are URL-encoded so they can't grow one either);
 *   · `&hangupbutton` appended (fork `main.js:1943-1946`: the in-frame
 *     Leave control is OFF by default — without it the guest can never
 *     hang up, and without a hangup there is no `hungup` event for our
 *     end card; T-262's "join button remained, need a disconnect" fix,
 *     same param);
 *   · `&iframetarget=<origin>` appended (fork `main.js:6728-6734`: without
 *     it the frame's postMessage target is unset and the `hungup` event
 *     never reaches our page cross-origin; with it, events address OUR
 *     origin exactly — never a `*`). */
export function mintStudioFrameTarget(opts: {
  vdoHost: string;
  room: string;
  label: string;
  camera: boolean;
  mic: boolean;
  origin: string;
}): string {
  const key = studioRoomKey(opts.room) ?? undefined;
  let url = studioGuestLink(opts.vdoHost, opts.room, opts.label, key);
  if (opts.camera) url = url.replace("&videomute", "");
  if (opts.mic) url = url.replace("&mute", "");
  url += "&hangupbutton";
  url += `&iframetarget=${encodeURIComponent(opts.origin)}`;
  return url;
}

/** The name the room pre-fills for a signed-in member (the pre-join
 *  card's one kindness): a key member's tag IS their public name; an
 *  email member's display name comes from their little profile (the same
 *  vault doc `/api/member/profile` keeps) — blank when there isn't one,
 *  never their email address read aloud in a room. */
export async function memberPrefillName(handle: string, space: string): Promise<string> {
  if (space !== "email") return handle;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return "";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(["GET", `member:profile:${handle.toLowerCase()}`]),
      cache: "no-store",
    });
    if (!res.ok) return "";
    const raw = ((await res.json()) as { result?: unknown }).result;
    if (typeof raw !== "string") return "";
    const profile = JSON.parse(raw) as { displayName?: unknown };
    return typeof profile.displayName === "string" ? profile.displayName.trim().slice(0, 48) : "";
  } catch {
    return "";
  }
}
