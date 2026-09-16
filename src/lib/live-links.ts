/**
 * THE PURE VDO/JITSI LINK BUILDERS (TASK-261, 0018.06.24 a₿). Split out of
 * `live.ts` so a client component (go-live-room.tsx) can import these
 * directly, without dragging in `live.ts`'s SERVER-ONLY chain (the vault,
 * mail-queue, entitlement walk — see that file's own docblock, and
 * matrix-rooms.ts's docblock for the Turbopack lesson of 0018.05.15 this
 * split follows). No fs, no env, no fetch — host/room/handle in, one
 * string out, every time. `live.ts` re-exports every one of these so its
 * existing server call-sites (`/a/live`, `/a/studio`, `/rooms/[slug]`)
 * never change their import line.
 *
 * TASK-261's own ground, from the Admiral's walk ("when Love opens the
 * room it looks like default VDO… I do not see the way to switch the
 * layouts"): the old `guest` link handed everyone (Love included, before
 * this lane) a BARE `?room=<r>` — VDO's five-source picker with the
 * scrollbar. Two fixes, both verified against Love's own fork
 * (`~/dev/apps/onecocreation-studio`, read-only reference clone,
 * ONECocreation/studio@develop = pure upstream VDO.Ninja — line citations
 * in this lane's SUMMARY.md):
 *
 *  · `studioDirectorLink` — the director seat VDO's `?director=<room>`
 *    param claims (main.js:664, first director to join owns the room),
 *    the same pattern `/meet/[bookingId]/page.tsx:92` already verified,
 *    never wired to the studio room before this lane. `&label=Love`
 *    (main.js:3533, skips the display-name prompt) and `&muteallguests`
 *    (main.js:2342, reveals the director's own "mute all guests" button)
 *    ride along — both read-checked against the fork's own room-setup
 *    generator (`studio/app.js:299` `buildDirectorUrl()`), which builds a
 *    director link the same way. `&cleanoutput` (that generator's own
 *    default, `studio/app.js:302`) was tried and REJECTED: main.js:6080-
 *    6082 shows `cleanOutput` hides `#controlButtons` (`classList.add
 *    ("hidden")`) — and `#muteAllGuests`/`#blindAllGuests` are children of
 *    that SAME element (index.html:199-214), unhidden by `&muteallguests`
 *    (main.js:2340-2346) but re-hidden by `cleanOutput`'s later run — the
 *    two params directly fight, and the desk would lose the one button
 *    this task asks for by name. `&cleanoutput` stays off the director
 *    link for that reason.
 *  · `studioGuestLink` (and `studioVdoLinks`'s `.guest`, which now calls
 *    it) — the one-click door: `&webcam` (main.js:2037, `session.
 *    webcamonly = true` — skips the five-source picker straight to the
 *    camera/mic tile; ALSO verified as the exact param the fork's own
 *    `buildInviteUrl()` uses, `studio/app.js:319-321`) + `&mute`
 *    (main.js:2229, `session.muted = true` — joins muted, the director
 *    unmutes from the desk) + `&label=<handle-or-Guest>` (main.js:3533,
 *    same as above — a filled label skips the name prompt entirely, so
 *    the door really is one click).
 */

/** TASK-243: the one join point for a VDO.Ninja-shaped link — a bare host
 *  in, `https://<host>/` out — so a scheme is never pasted twice across the
 *  handful of call-sites that build a room URL from it. Pure. */
export function vdoBase(host: string): string {
  return `https://${host}/`;
}

/** TASK-305 (0018.06.25 a₿) — the one place a key gets appended: room+
 *  password is a DISTINCT VDO room (fork `lib.js:27981-27989`'s
 *  `checkToken`/`registerToken` fold `session.password` straight into the
 *  signaling topic hash), so every door into a keyed room must carry the
 *  SAME `&password` or it lands in a different room entirely. `undefined`
 *  passes through untouched (derive-or-dash: no key minted, no query
 *  param added) — every builder below stays byte-identical to its
 *  pre-T-305 output when called without a key, which is exactly what
 *  every existing pin (built by calling these SAME functions) already
 *  expects. Not exported — an implementation seam, not a new public shape. */
function withRoomKey(url: string, key?: string): string {
  return key ? `${url}&password=${encodeURIComponent(key)}` : url;
}

/** TASK-261: a guest's one-click door — camera + mic ready, muted until
 *  the director unmutes (see this file's docblock for the param-by-param
 *  citations). `handle` labels the join (skips VDO's name prompt); a
 *  blank/absent handle reads as the honest default "Guest", never an
 *  empty label VDO would have to re-prompt for. Pure: host/room/handle
 *  in, one link out.
 *
 *  TASK-305 — two additions: `&videomute` rides beside the existing
 *  `&mute` (fork `main.js:2237`, `urlParams.has("videomute")` →
 *  `session.videoMutedFlag = true`) — Love's call #4 item 6 ruling: guests
 *  arrive with BOTH camera and mic off and choose for themselves, never
 *  camera-hot by default. `key`, the room's derived password
 *  (`live.ts`'s `studioRoomKey`), appends `&password=<key>` when given —
 *  see this file's `withRoomKey`. */
export function studioGuestLink(host: string, room: string, handle?: string, key?: string): string {
  const label = handle?.trim() || "Guest";
  const url = `${vdoBase(host)}?room=${encodeURIComponent(room)}&webcam&mute&videomute&label=${encodeURIComponent(label)}`;
  return withRoomKey(url, key);
}

/** TASK-261: the director's own seat — the room's controls (scene/layout
 *  switching lives inside the director view itself; `&muteallguests`
 *  surfaces the desk's mute-all button explicitly). `&label=Love` so the
 *  desk never stops to ask who's joining. See this file's docblock for
 *  why `&cleanoutput` is deliberately NOT here. Pure: host/room in, one
 *  link out. TASK-305: `key` appends `&password=<key>` — the SAME key
 *  every other door into this room carries, closing the "first stranger
 *  to open this URL claims the desk" hole (fork `main.js:664-665`). */
export function studioDirectorLink(host: string, room: string, key?: string): string {
  return withRoomKey(`${vdoBase(host)}?director=${encodeURIComponent(room)}&label=Love&muteallguests`, key);
}

/** TASK-305: the Stage's own read-only view tile — one publisher watched,
 *  never joined. The SAME shape `RoomVideoSlot.tsx` minted inline for
 *  both the host frame (`view=host`) and each on-camera gallery tile
 *  (`view=<handle>`) before this lane; pulled into one builder so the
 *  key threads through a single source instead of two hand-spelled
 *  strings. `&cleanoutput&autostart&chat=0` — cleaned, auto-starts, the
 *  site's own Matrix chat rides beside the stage (T-260). A view link
 *  needs the RAW `&password`, not `&hash`: the fork's `&hash` is an
 *  invite-link convenience that still prompts a HUMAN for the real
 *  password (`main.js:3455-3459`, `promptAlt`) — an unattended iframe has
 *  no human to prompt, and the room's real signaling topic only ever
 *  folds in the raw `session.password` (`lib.js:27981-27989`). Pure:
 *  host/room/handle in, one link out. */
export function studioViewLink(host: string, room: string, handle: string, key?: string): string {
  const url = `${vdoBase(host)}?view=${encodeURIComponent(handle)}&room=${encodeURIComponent(room)}&cleanoutput&autostart&chat=0`;
  return withRoomKey(url, key);
}

/** TASK-192 (additive read), TASK-243 (own studio door), TASK-261 (guest
 *  now one-click): T-191's studio VDO derivation, one word further — the
 *  same `${prefix}-studio` room the /a/studio desk derives, shared so the
 *  Go-Live room's YouTube door can never drift from the director's desk.
 *  `host` is the meeting config's own VDO host (SiteConfig.meeting.
 *  vdoHost) — Love's own studio (vdo.onecocreation.com), never the public
 *  vdo.ninja by default. `guest` now calls studioGuestLink (one source —
 *  see this lane's "one source" test pin). Pure: in, links out.
 *
 *  TASK-305: `key` (the room's derived password) threads into BOTH `push`
 *  and `guest` — the same key, since room+password is one distinct room
 *  and every door into it must agree. `undefined` = every field stays
 *  exactly the pre-T-305 output (derive-or-dash upstream in `live.ts`). */
export function studioVdoLinks(
  roomPrefix: string,
  host: string,
  key?: string,
): { room: string; push: string; guest: string } {
  /* TASK-264 (Number One, 0018.06.24 a₿): the join is an UNDERSCORE. VDO's
     sanitizeRoomName (lib.js:3747-3758) rewrites any hyphen to `_` and pops
     "Only AlphaNumeric characters should be used for the room name" on every
     open — Love saw it on her director's desk. Underscore-native = the same
     room VDO always made, with no rewrite and no popup. */
  const room = `${roomPrefix}_studio`;
  const base = vdoBase(host);
  return {
    room,
    push: withRoomKey(`${base}?room=${encodeURIComponent(room)}&push=host`, key),
    guest: studioGuestLink(host, room, undefined, key),
  };
}

/** TASK-249: a named guest's own camera door — the same `push=` shape
 *  T-243's studioVdoLinks uses for `host` (`push=host`), one word further:
 *  `push=<the guest's own handle>`, so the tile the gallery already
 *  addresses at `?view=<handle>&room=<studioRoom>` (RoomVideoSlot's
 *  GalleryTile) can actually find them once they open this door and
 *  publish. Deliberately NOT folded into studioVdoLinks — Love's own
 *  copyable off-site guest link (`.guest`, T-261's one-click shape) on
 *  `/a/studio` and `/a/live` stays as its own thing; this is a SECOND,
 *  narrower door for a soul the director already named. T-260 owns its
 *  render (RoomVideoSlot.tsx); this builder's signature only grows the
 *  trailing `key` TASK-305 adds everywhere else. Pure: host/room/handle
 *  in, one link out. */
export function studioGuestCameraLink(host: string, room: string, handle: string, key?: string): string {
  return withRoomKey(`${vdoBase(host)}?room=${encodeURIComponent(room)}&push=${encodeURIComponent(handle)}`, key);
}

/** TASK-192: the guest-typed room name, slugged for either rail — never
 *  stored, derived fresh on every keystroke. */
export function guestSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

/** TASK-297 (0018.06.25 a₿) — the in-site room's ONE path join point: the
 *  guest link the site hands out is OURS, never the vdo host (T-292
 *  DESIGN.md §2 Page B). A bare room id in, the site path out — the same
 *  discipline as `vdoBase` above, one level up (a path, not a host). The
 *  key NEVER rides this URL: `/meet/studio/<room>`'s own server mints it
 *  into the iframe src at request time (src/app/meet/studio/frame/). Pure. */
export function meetStudioPath(room: string): string {
  return `/meet/studio/${encodeURIComponent(room)}`;
}

/** TASK-297: the absolute form, for copy fields and letters — the request
 *  origin (or any honest base) in, the full site URL out. Pure. */
export function meetStudioUrl(origin: string, room: string): string {
  return `${origin}${meetStudioPath(room)}`;
}

/** TASK-297: is this room id inside the site's own studio namespace —
 *  `<prefix>_<word>` with VDO-safe characters only (the fork's
 *  `sanitizeRoomName`, lib.js:3747-3758, rewrites everything else to `_`,
 *  so an id already in this shape is the same room VDO would make, with no
 *  rewrite and no popup — T-264's ruling, this file's studioVdoLinks note).
 *  This is the co-create door's legitimacy check for `/meet/studio/<room>`
 *  (the namespace is the site's own; rooms outside it are not ours to
 *  mint). Pure. */
export function isStudioNamespaceRoom(room: string, prefix: string): boolean {
  if (!prefix.trim()) return false;
  return room.startsWith(`${prefix}_`) && /^[a-zA-Z0-9_]+$/.test(room.slice(prefix.length + 1));
}

/** TASK-192, moved here TASK-261 (go-live-room.tsx no longer duplicates
 *  it — see that file's docblock for why it couldn't import `live.ts`
 *  directly before this split). The co-create guest link, derived from
 *  the meeting config: the Jitsi rail namespaces by the site's own space
 *  (`liveRoomPrefix`'s own derivation lives in live.ts, so the namespaced
 *  prefix is threaded down as `cfg.jitsiPrefix` — a bare name would
 *  collide on the shared host); the VDO rail rooms by the config's
 *  prefix, the same shape as T-191's studio. A blank name is no link at
 *  all (derive-or-dash). Pure.
 *
 *  TASK-297 — the VDO rail's handed-out link becomes the SITE url
 *  `/meet/studio/<room>` (T-292 DESIGN.md §2 Page B: "the URL the site
 *  hands out is OURS, never the vdo host"; the vdo host now appears only
 *  inside the iframe src that page's own server mints, key included —
 *  this URL carries none). Two honest moves in the same stroke:
 *   · `cfg.siteOrigin` (new, required) is the base — the request's own
 *     origin, so dev/preview/prod each mint their own honest absolute;
 *   · the room id goes UNDERSCORE-NATIVE: `${prefix}_${slug}` with the
 *     slug's hyphens folded to underscores — byte-identical to the room
 *     VDO's `sanitizeRoomName` always made of the old `<prefix>-<slug>`
 *     spelling (lib.js:3747-3758 folds every non-word char to `_`), so
 *     nobody's room changes; the native "Only AlphaNumeric" warning modal
 *     just never fires (T-264's ruling, this file's studioVdoLinks note).
 *  The Jitsi branch is byte-identical to its pre-T-297 output. */
export function guestMeetingLink(
  rail: "jitsi" | "vdo",
  name: string,
  cfg: { jitsiDomain: string; jitsiPrefix: string; vdoRoomPrefix: string; vdoHost: string; siteOrigin: string },
): string | null {
  const slug = guestSlug(name);
  if (!slug) return null;
  if (rail === "vdo") return meetStudioUrl(cfg.siteOrigin, `${cfg.vdoRoomPrefix}_${slug.replace(/-/g, "_")}`);
  return `https://${cfg.jitsiDomain}/${cfg.jitsiPrefix}${slug}`;
}
