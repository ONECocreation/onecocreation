import { studioDirectorLink } from "@/lib/live-links";

/**
 * THE DIRECTOR-SHAPED MINT (TASK-306, 0018.06.25 a₿ · block ~967,218) —
 * the console twin of T-297's guest-shaped `mintStudioFrameTarget`
 * (`src/app/meet/studio/room-access.ts`, READ-ONLY this lane — which is
 * why this sibling exists instead of an addition there; same spirit, the
 * seat's own shape). Given the room, its derived key, and the visitor's
 * origin, it composes the SHARED `studioDirectorLink` (live-links.ts —
 * itself untouched) and appends the same two params T-297 proved
 * necessary:
 *
 *   · `&hangupbutton` — the fork's in-frame Leave control is OFF by
 *     default (fork `main.js:1943-1946`); without a hangup there is no
 *     `{action:"hungup"}` (`lib.js:20545`) for the end card.
 *   · `&iframetarget=<origin>` — the frame's postMessage target is unset
 *     without it (fork `main.js:6728-6734`) and the `hungup` event never
 *     reaches our page cross-origin.
 *
 * NO toggles — the director always joins on camera/mic; that IS the
 * seat. The keyed URL mounts DIRECTLY as the iframe src (the house law
 * T-297 A/B-proved: Chromium does not delegate camera/mic through a 302
 * inside an iframe — no redirect route, ever). `key` undefined = the
 * link mints unkeyed, exactly the pre-key behavior (derive-or-dash,
 * live.ts's studioRoomKey docblock) — never a fabricated key.
 */
export function mintStudioDirectorTarget(opts: {
  vdoHost: string;
  room: string;
  key?: string;
  origin: string;
}): string {
  let url = studioDirectorLink(opts.vdoHost, opts.room, opts.key);
  url += "&hangupbutton";
  url += `&iframetarget=${encodeURIComponent(opts.origin)}`;
  return url;
}
