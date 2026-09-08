import { ROOMS } from "@/lib/matrix-rooms";

/**
 * THE CLASS DOOR MODEL (TASK-37/S40 lane 1) — what stays after TASK-192
 * (0018.06.18 a₿): the door's desk UI FOLDED INTO the /a/live Go-Live room
 * (one door on Love's desk, four ways in — the Admiral's ruling). This file
 * keeps the door's client-safe MODEL, which the new room and the tests both
 * import:
 *
 *  · DoorRoom / DoorRoomGroup — the feed room shapes;
 *  · doorRoomGroups() — the Commons-first grouping (TASK-174: EVERY room in
 *    ROOMS, class AND community, the free Heart Field Commons first).
 *
 * The open/close contract itself is unchanged: /api/admin/live, operator-
 * gated server-side like every /a surface — no client ever holds a
 * credential.
 */
export interface DoorRoom {
  slug: string;
  title: string;
  kind: string;
}
export interface DoorRoomGroup {
  label: string;
  rooms: DoorRoom[];
}

/** A feed room's minTier, joined from the rooms registry (pure data,
 *  client-safe). Unknown slug → null (derive-or-dash). */
const minTierOf = (slug: string) =>
  ROOMS.find((r) => r.id.slice(1, r.id.indexOf(":")) === slug)?.minTier ?? null;

/** The picker's groups: the free room (minTier "all" — the Commons) first,
 *  then the classes, then the other community rooms. Exported for tests
 *  (the house pins the model, not the render). */
export function doorRoomGroups(rooms: DoorRoom[]): DoorRoomGroup[] {
  const free = rooms.filter((r) => minTierOf(r.slug) === "all");
  const classes = rooms.filter((r) => r.kind === "class" && !free.includes(r));
  const community = rooms.filter((r) => r.kind === "community" && !free.includes(r));
  const out: DoorRoomGroup[] = [];
  if (free.length) out.push({ label: "The Commons — free for every member", rooms: free });
  if (classes.length) out.push({ label: "Classes", rooms: classes });
  if (community.length) out.push({ label: "Community rooms", rooms: community });
  return out;
}
