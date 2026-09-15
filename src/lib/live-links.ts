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

/** TASK-261: a guest's one-click door — camera + mic ready, muted until
 *  the director unmutes (see this file's docblock for the param-by-param
 *  citations). `handle` labels the join (skips VDO's name prompt); a
 *  blank/absent handle reads as the honest default "Guest", never an
 *  empty label VDO would have to re-prompt for. Pure: host/room/handle
 *  in, one link out. */
export function studioGuestLink(host: string, room: string, handle?: string): string {
  const label = handle?.trim() || "Guest";
  return `${vdoBase(host)}?room=${encodeURIComponent(room)}&webcam&mute&label=${encodeURIComponent(label)}`;
}

/** TASK-261: the director's own seat — the room's controls (scene/layout
 *  switching lives inside the director view itself; `&muteallguests`
 *  surfaces the desk's mute-all button explicitly). `&label=Love` so the
 *  desk never stops to ask who's joining. See this file's docblock for
 *  why `&cleanoutput` is deliberately NOT here. Pure: host/room in, one
 *  link out. */
export function studioDirectorLink(host: string, room: string): string {
  return `${vdoBase(host)}?director=${encodeURIComponent(room)}&label=Love&muteallguests`;
}

/** TASK-192 (additive read), TASK-243 (own studio door), TASK-261 (guest
 *  now one-click): T-191's studio VDO derivation, one word further — the
 *  same `${prefix}-studio` room the /a/studio desk derives, shared so the
 *  Go-Live room's YouTube door can never drift from the director's desk.
 *  `host` is the meeting config's own VDO host (SiteConfig.meeting.
 *  vdoHost) — Love's own studio (vdo.onecocreation.com), never the public
 *  vdo.ninja by default. `guest` now calls studioGuestLink (one source —
 *  see this lane's "one source" test pin). Pure: in, links out. */
export function studioVdoLinks(roomPrefix: string, host: string): { room: string; push: string; guest: string } {
  const room = `${roomPrefix}-studio`;
  const base = vdoBase(host);
  return {
    room,
    push: `${base}?room=${encodeURIComponent(room)}&push=host`,
    guest: studioGuestLink(host, room),
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
 *  render (RoomVideoSlot.tsx); this builder's signature is unchanged.
 *  Pure: host/room/handle in, one link out. */
export function studioGuestCameraLink(host: string, room: string, handle: string): string {
  return `${vdoBase(host)}?room=${encodeURIComponent(room)}&push=${encodeURIComponent(handle)}`;
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

/** TASK-192, moved here TASK-261 (go-live-room.tsx no longer duplicates
 *  it — see that file's docblock for why it couldn't import `live.ts`
 *  directly before this split). The co-create guest link, derived from
 *  the meeting config: the Jitsi rail namespaces by the site's own space
 *  (`liveRoomPrefix`'s own derivation lives in live.ts, so the namespaced
 *  prefix is threaded down as `cfg.jitsiPrefix` — a bare name would
 *  collide on the shared host); the VDO rail rooms by the config's
 *  prefix, the same shape as T-191's studio. A blank name is no link at
 *  all (derive-or-dash). Pure. */
export function guestMeetingLink(
  rail: "jitsi" | "vdo",
  name: string,
  cfg: { jitsiDomain: string; jitsiPrefix: string; vdoRoomPrefix: string; vdoHost: string },
): string | null {
  const slug = guestSlug(name);
  if (!slug) return null;
  if (rail === "vdo") return `https://${cfg.vdoHost}/?room=${encodeURIComponent(`${cfg.vdoRoomPrefix}-${slug}`)}`;
  return `https://${cfg.jitsiDomain}/${cfg.jitsiPrefix}${slug}`;
}
