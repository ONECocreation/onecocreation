/**
 * src/app/a/site/reading/rooms-config.ts — TASK-486 BLOCKER FIX (block
 * 968,624+, caught by a real `next build` + `next start` Chrome walk,
 * never by vitest): `RoomsCard.tsx` is `"use client"`. On the SERVER,
 * importing a VALUE out of a client module doesn't hand back the real
 * export — React Server Components turns a client module's exports into
 * opaque client references, meant only to be passed as props into a
 * `<ClientComponent prop={...} />`, never read as plain data. `go/[door]/
 * page.tsx` (a server component) called `DOORS.find(...)` on exactly
 * that reference and 500'd in production: "TypeError: h.DOORS.find is
 * not a function". Vitest's plain-node runner never enforces the
 * client/server boundary, so every existing test passed; only the real
 * build+start walk caught it.
 *
 * FIX: every plain value/type the SERVER needs — the door ids, labels,
 * admin paths, and the one Jitsi URL builder — lives HERE, in a module
 * with NO `"use client"` directive, importable from either side.
 * `RoomsCard.tsx`, `SiteReadingRoom.tsx`, `go/[door]/page.tsx`, and
 * `GoRoom.tsx`/`useDoorRoom.ts` all import from this file now — never a
 * second copy of the four doors, never a value read across the client
 * boundary. The fetch/open/close chain (`fetchDoorState`/`openDoor`/
 * `closeDoor`/`runExclusive`/`recordLock`) STAYS in `RoomsCard.tsx` — it
 * is only ever called client-side (inside `useDoorRoom.ts`'s hook and
 * `RoomsCard`'s own default export), so the server never needs it and
 * moving it would add nothing.
 */

export interface DoorConfig {
  /** a stable key AND the door's admin route suffix source — never
   *  guessed from the label */
  id: string;
  /** the row's own words, e.g. "Housewarming · 12:12" */
  label: string;
  /** the operator route this row's door answers to, e.g.
   *  "/api/admin/stage1" */
  adminPath: string;
}

/* TASK-481's real, current config (block 968,624+). */
export const DOORS: DoorConfig[] = [
  { id: "housewarming", label: "Housewarming · 12:12", adminPath: "/api/admin/housewarming-door" },
  { id: "stage1", label: "Reading · 1:11", adminPath: "/api/admin/stage1" },
  { id: "stage2", label: "Book Talk · 2:22", adminPath: "/api/admin/stage2" },
  { id: "qa", label: "Q&A · 3:33", adminPath: "/api/admin/qa-door" },
];

export interface DoorRowState {
  phase: "closed" | "prepared" | "published";
  room: string | null;
  jitsiDomain: string;
}

export type DoorBusy = "open" | "close" | null;

/** The one Jitsi hash every camera link (`RoomsCard.tsx`'s rows, the
 *  go/[door] page) carries — a single join point so the flags never
 *  drift apart. Pure, no React, safe on either side of the boundary. */
export function jitsiRoomUrl(state: { jitsiDomain: string; room: string }): string {
  return `https://${state.jitsiDomain}/${state.room}#config.p2p.enabled=false&config.showChatPermissionsModeratorSetting=true`;
}
