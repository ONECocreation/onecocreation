import { NextResponse } from "next/server";
import { getLiveState, roomForSlug } from "@/lib/live";
import { getStudioDoc } from "@/lib/studio/roster";
import { studioSceneKind } from "@/lib/studio/scenes";
import { TIERS, type Tier } from "@/lib/entitlement";
import { TIER_PAGES } from "@/lib/tiers-content";
import { getHousewarmingState, IDLE as HOUSEWARMING_IDLE } from "@/lib/housewarming-door";
import { getStage1State, IDLE as STAGE1_IDLE } from "@/lib/stage1";
import { getStage2State, IDLE as STAGE2_IDLE } from "@/lib/stage2";
import { getQaState, IDLE as QA_IDLE } from "@/lib/qa-door";
import type { ReadingPart } from "@/lib/reading-parts";

export const dynamic = "force-dynamic";

interface DoorStateLike {
  phase: "closed" | "prepared" | "published";
  room: string | null;
  openedAtMs: number | null;
  publishedAtMs: number | null;
  cameraShownAtMs: number | null;
}

/* TASK-490 (block 969,088+ — the Admiral, RULED at block 968,624: light
   on her Open tap, `published`, never `cameraShownAtMs`) — the four
   reading-day doors ride beside the old Go-live flag. Each door is read
   through its own getter wrapped in its own try/catch to that door's
   IDLE (the reading/page.tsx belt-and-braces idiom: the getters already
   fail closed internally, this catch stands against a future
   regression). The door's `room` (the `oc-<16hex>` Jitsi name) is read
   here ONLY to never be repeated — it stays behind the member routes'
   entitlement gates. The titles are the SCOPE's own words (never
   AGENDA_ROW_TITLES, whose part 4 says "The Q&A with Love"). */
const READING_DOORS: { part: ReadingPart; title: string; read: () => Promise<DoorStateLike>; idle: DoorStateLike }[] = [
  { part: 1, title: "The Housewarming", read: getHousewarmingState, idle: HOUSEWARMING_IDLE },
  { part: 2, title: "The Reading", read: getStage1State, idle: STAGE1_IDLE },
  { part: 3, title: "The Book Talk", read: getStage2State, idle: STAGE2_IDLE },
  { part: 4, title: "The Q&A", read: getQaState, idle: QA_IDLE },
];

/** The one open reading door, if any: a `published` phase with a real
 *  anchor (publishedAtMs, else its mint time); the latest anchor wins
 *  when two are open. A throw reads as that door closed. */
async function readingDoorLive(): Promise<{ part: ReadingPart; title: string; publishedAtMs: number } | null> {
  let best: { part: ReadingPart; title: string; publishedAtMs: number } | null = null;
  for (const door of READING_DOORS) {
    let state: DoorStateLike = door.idle;
    try {
      state = await door.read();
    } catch {
      state = door.idle;
    }
    if (state.phase !== "published") continue;
    const anchor = state.publishedAtMs ?? state.openedAtMs;
    if (anchor === null) continue;
    if (!best || anchor > best.publishedAtMs) best = { part: door.part, title: door.title, publishedAtMs: anchor };
  }
  return best;
}

/**
 * THE PUBLIC LIVE READ (TASK-37/S40 lane 2) — tiny and cacheable (~15s):
 * the site-wide banner polls this, so the flag turns the whole site within
 * a breath of the door opening without punching the vault on every page
 * load. A dark vault reads as `live: false` — never an error page.
 *
 * TASK-251 (0018.06.23 a₿): `scene` rides beside the live flag — the
 * studio doc's own `activeScene` when its kind is `full` (starting/brb/
 * ending), else null. This is the SAME doc the room page reads server-side
 * for the first paint (`fullScene`, threaded through ClassroomView →
 * StageView → RoomVideoSlot); ClassroomView's existing 20s poll of this
 * route carries the UPDATES while a viewer watches, so the Stage's video
 * frame can react when Love changes the scene mid-show. The studio doc is
 * site-wide (one studio), not per-room, so `scene` is never gated by
 * `room`/`live` the way the rest of this payload is — getStudioDoc()
 * already answers the honest empty-stage default on any read failure,
 * never a 500.
 *
 * TASK-236 (0018.06.23 a₿): `afterHours` rides beside `scene` — the SAME
 * live-state read's own after-hours room and clock (already sanitised by
 * `getLiveState`, so `room` here always resolves and is never the free
 * Commons), resolved into words: `roomTitle` from ROOMS, `package` from
 * TIERS (the member-facing package name), `packageSlug` from TIER_PAGES (the
 * /packages/[slug] door). null when unset — never a half-built object.
 */
export async function GET() {
  const state = await getLiveState();
  const found = state.live && state.room ? roomForSlug(state.room) : undefined;
  /* TASK-465 (block 968,561): a hidden room is never named in public. The
     admin write route already refuses one; this covers a flag set before
     that. It reads as dark here: no room, no title, no strip. */
  const hiddenLive = !!found?.hidden;
  /* TASK-490: `flagLive` is the OLD path's own truth, byte-unchanged —
     the afterHours block below still computes from it exactly as today.
     A published reading door WINS over the flag when both are live (her
     reading-day hand is the fresher truth); with no door published the
     payload is exactly what it always was. */
  const flagLive = state.live && !hiddenLive;
  const room = hiddenLive ? undefined : found;
  const reading = await readingDoorLive();
  const live = reading !== null || flagLive;
  const doc = await getStudioDoc();
  const scene = studioSceneKind(doc.activeScene) === "full" ? doc.activeScene : null;
  const afterHoursRoom = state.afterHours ? roomForSlug(state.afterHours.room) : undefined;
  const afterHours =
    flagLive && state.afterHours && afterHoursRoom && afterHoursRoom.minTier !== "all" && !afterHoursRoom.hidden
      ? {
          room: state.afterHours.room,
          roomTitle: afterHoursRoom.title,
          package: TIERS[afterHoursRoom.minTier as Tier].name,
          packageSlug: TIER_PAGES.find((t) => t.tier === afterHoursRoom.minTier)?.slug ?? null,
          at: state.afterHours.at,
        }
      : null;
  return NextResponse.json(
    {
      ok: true,
      live,
      kind: reading ? "reading" : live ? (room?.kind ?? state.kind ?? "class") : null,
      part: reading ? reading.part : null,
      /* the capital NEVER (SCOPE shape 1): the reading case carries
         `room: null` — the door's minted Jitsi name stays behind the
         member routes' gates. */
      room: reading ? null : live ? (state.room ?? null) : null,
      roomTitle: reading ? reading.title : live ? (room?.title ?? null) : null,
      startedAt: reading ? reading.publishedAtMs : live ? (state.startedAt ?? null) : null,
      scene,
      afterHours,
    },
    { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" } },
  );
}
