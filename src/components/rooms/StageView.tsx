"use client";

import { useEffect, useState } from "react";
import RoomVideoSlot from "./RoomVideoSlot";
import RoomPresence, { type RosterResult } from "./RoomPresence";
import StageChat from "./StageChat";
import { deriveResources, ResourcesCard } from "./LessonPathView";
import AfterHoursDoor, { type AfterHoursFeed } from "./AfterHoursDoor";
import Stage2Door from "./Stage2Door";
import StoryTimePill from "./StoryTimePill";
import JitsiRoom from "../booking/JitsiRoom";
import JitsiViewer from "../reading/JitsiViewer";
import { stage1WatchTarget } from "../reading/ReadingStage";
import { READING_ROOM_SLUG } from "@/lib/reading-room";
import type { MaterialItem } from "@/lib/class-materials";
import type { RoomPin } from "@/lib/room-pins";
import type { RoomGate } from "@/lib/room-access";
import type { StudioSceneId } from "@/lib/studio/scenes";
import type { Tier } from "@/lib/entitlement";

/**
 * THE STAGE (TASK-184, 0018.06.18 a₿ — the Admiral's three-rooms ruling:
 * "Video and stage are basically the same — the Video layout wins"; born
 * TASK-123, made the opening vantage TASK-149). The VIDEO layout's shape:
 * the live embed leads FULL-WIDTH (RoomVideoSlot, riding the T-146
 * jitsiDomain/liveRoom props and the T-174 gate), and beneath it the room's
 * own chat (StageChat → the SAME RoomView — never a second chat) sits
 * BESIDE who's-here — People folds in here as the roster (RoomPresence,
 * fed the page's ONE per-open roster read — the 429 hunt, see that
 * component's docblock).
 *
 * The Sanctuary's pinned welcome folds in here too (the Sanctuary vantage
 * retired; its chat always WAS this chat): "📌 from Love" rides atop the
 * stage when the operator has pinned one.
 *
 * TASK-213 (0018.06.23 a₿, Love's call #21 — "video on top, resources,
 * chat"): a RESOURCES row rides between the video and the chat/people row —
 * the exact `ResourcesCard` the Lesson Path already renders (`LessonPathView`'s
 * exported card + `deriveResources`, reused rather than re-spelled), fed by
 * its own read of the SAME per-room materials feed the Lesson Path reads
 * (`/api/rooms/[slug]/materials`, already self-gated — a closed room answers
 * `open:false` rather than a 403, the fetch costs nothing to duplicate here).
 * Gated identically to the chat/people below it: a closed room takes no
 * read. Empty resources render nothing (derive-or-dash) — never an empty box.
 *
 * TASK-236 (0018.06.23 a₿): a NEW region rides right after the video — the
 * after-hours door (AfterHoursDoor.tsx, its own client leaf, its own
 * region wrapper). It is NOT threaded into RoomVideoSlot: that component's
 * Jitsi branch is byte-pinned (tests/stage-shows-the-studio.test.ts), so
 * this is a sibling region instead of a rewrite.
 */
export default function StageView({
  slug, alias, title, kind, pin, live, jitsiDomain, liveRoom, door, doorPackage, roster, rail, vdoHost, studioRoom, roomKey, onCameraMxids, stageMxids, cameraDoor,
  fullScene, fullSceneShowTitle, fullSceneStartsAt, fullSceneAfterHoursLine, afterHours, signedIn, viewerTier, chatHidden,
}: {
  slug: string;
  alias: string;
  title: string;
  kind: "class" | "community";
  /** the room's pinned welcome (the retired Sanctuary's "from Love" card) */
  pin?: RoomPin | null;
  live: boolean;
  /** T-146 follow-through: the live stage rides every vantage, not only Video */
  jitsiDomain?: string;
  liveRoom?: string;
  /** TASK-174 minimal-forced-edit: pass-through only — the room page's gate
   *  decision for this visitor, so the video slot follows the SAME door as
   *  the chat below it (room-access.ts's shared words). */
  door?: RoomGate;
  doorPackage?: string | null;
  /** TASK-184: the page's ONE roster/presence read per open — null when the
   *  gate closed the room for this visitor (no read taken, the soft line).
   *  TASK-245: also the video slot's gallery source (RoomPresence and the
   *  gallery share this ONE read, never a second one). */
  roster?: RosterResult | null;
  /** TASK-245: pass-through only, same shape as jitsiDomain/liveRoom above —
   *  the room page's site-switches read, handed to the Stage so the video
   *  slot can pick its rail. */
  rail?: "jitsi" | "vdo" | "static";
  vdoHost?: string;
  studioRoom?: string;
  /** TASK-305 (Seam, flagged in work-claims/task-305.md): pass-through
   *  only, same shape as vdoHost/studioRoom — the room's derived password,
   *  handed to the video slot's view-link mint. */
  roomKey?: string;
  /** TASK-245: pass-through only — the room page's own derivation off the
   *  director's guest roster (who Love actually arranged to be on camera
   *  today), handed to the video slot's gallery. */
  onCameraMxids?: readonly string[];
  /** TASK-245: present souls who ARE the stage (the director by name) — never a gallery tile. */
  stageMxids?: readonly string[];
  /** TASK-249: pass-through only — this viewer's own camera door, set
   *  only when Love named THEM as today's guest and they're present on
   *  camera. Null/absent = nothing rendered. */
  cameraDoor?: string | null;
  /** TASK-251: pass-through only — the room page's own derivation off the
   *  studio doc's activeScene (null unless its kind is `full`), handed to
   *  the video slot so it can swap the `?view=host` iframe for the site's
   *  own FullScene, inline. */
  fullScene?: Extract<StudioSceneId, "starting" | "brb" | "ending"> | null;
  fullSceneShowTitle?: string;
  fullSceneStartsAt?: string;
  fullSceneAfterHoursLine?: string;
  /** TASK-236: the after-hours door's own polled state — pass-through only,
   *  the room page's `/api/live` poll (ClassroomView) resolved into words
   *  server-side. null = unset or cleared, the door renders nothing. */
  afterHours?: AfterHoursFeed | null;
  /** TASK-236: this viewer's own signed-in state + tier — the after-hours
   *  door's own gate (its target room differs from this Stage's own room,
   *  so it can't reuse `door` above). */
  signedIn?: boolean;
  viewerTier?: Tier | null;
  /** TASK-387: pass-through only -- ClassroomView's own state (the saved
   *  per-room switch, kept current by its 20s poll). A hidden chat
   *  renders NO `.cl-area-chat` region at all -- the video takes the
   *  width (M4) -- never a collapsed/muted chat. Absent = today's
   *  behavior (the chat mounts). */
  chatHidden?: boolean;
}) {
  const gated = !!door && door !== "open";
  const [items, setItems] = useState<MaterialItem[] | null>(null);
  /* TASK-392: the Stage 2 pilot's own join state — set the instant the
   *  member's fresh click-time re-check (Stage2Door.tsx) clears, cleared
   *  by the always-visible "Leave Stage 2" control below (JitsiRoom.tsx
   *  gives its parent no ended/failed callback, confirmed absent this
   *  session — this is the ONLY reset path, not a redundant one). */
  const [stage2Room, setStage2Room] = useState<string | null>(null);
  /* TASK-450 (block 968,370; K124 §T-450 + the Admiral's ruling 2, block
   *  968,357 — "the story time pill button added to the heartfield … the
   *  stage in the heartfield … leave the chat off for now in that stage
   *  area"): while Stage 1 is published, the free reading room offers the
   *  reading on its OWN stage — the same one-way JitsiViewer /reading
   *  uses (Guest by design: the one-way embed has no roster to be named
   *  on, so no name prop is ever handed over). `storyOpen` is DISPLAY-ONLY
   *  (the poll below, fail-closed from its closed initial state);
   *  `storyRoom` + `storyDomain` mount ONLY from the click's own fresh
   *  re-check — the wire's jitsiDomain rides WITH the room name, the pair
   *  never splits (api/stage1/route.ts's own comment). `storyNote` is the
   *  one-line honest word when the picture can't load. */
  const [storyOpen, setStoryOpen] = useState(false);
  const [storyRoom, setStoryRoom] = useState<string | null>(null);
  const [storyDomain, setStoryDomain] = useState<string | null>(null);
  const [storyNote, setStoryNote] = useState<string | null>(null);

  useEffect(() => {
    if (gated) return; // the gate closed — no fetch, same law as the Lesson Path
    let alive = true;
    fetch(`/api/rooms/${encodeURIComponent(slug)}/materials`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { ok: false }))
      .then((d) => { if (alive) setItems(d?.ok && d.open ? (d.items ?? []) : []); })
      .catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, [slug, gated]);

  /* TASK-450: ONE new poll, gated to the reading room's slug (the same
     guard the Stage2Door mount wears below) — ClassroomView.tsx's
     /api/live idiom verbatim: 20 s, no-store, a missed/failed poll keeps
     the last-known display state and NEVER mounts anything. The poll's
     only say is whether the Story time pill renders; the click below is
     the only mount path (the fail-closed law). */
  useEffect(() => {
    if (slug !== READING_ROOM_SLUG) return;
    let alive = true;
    function poll() {
      fetch("/api/stage1", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (alive && d?.ok) setStoryOpen(d.phase === "published"); })
        .catch(() => {});
    }
    poll();
    const timer = setInterval(poll, 20_000);
    return () => { alive = false; clearInterval(timer); };
  }, [slug]);

  /* TASK-450: the pill's CLICK authorizes — a FRESH, uncached re-check at
     the instant of the click, mounted only through the imported
     stage1WatchTarget (ReadingStage.tsx's own Watch pattern; the house's
     one-decision law — imported, never re-implemented here). A null
     target mounts NOTHING: the stage moved under the click, and the
     poll's next tick retires the pill if it closed. */
  async function storyTime() {
    try {
      const res = await fetch("/api/stage1", { cache: "no-store" });
      const body = res.ok ? ((await res.json()) as Parameters<typeof stage1WatchTarget>[0]) : null;
      const target = stage1WatchTarget(body);
      if (target && typeof body?.jitsiDomain === "string" && body.jitsiDomain.length > 0) {
        setStoryRoom(target);
        setStoryDomain(body.jitsiDomain);
        setStoryNote(null); // a successful mount retires the honest note
      }
    } catch {
      setStoryNote("The reading's picture couldn't load here — try again.");
    }
  }

  /* TASK-450: the hangup (the viewer's own OR the host ending the call)
     IS the way back — JitsiViewer's own toolbar (fullscreen + hangup) is
     the whole control surface, no page buttons under the stage (the
     Admiral's Jitsi-toolbar-only law, block 968,349). */
  function storyEnded() {
    setStoryRoom(null);
    setStoryDomain(null);
  }

  /* TASK-450: the script itself failed to load — the stage clears and
     the honest one-line note stands where the pill stood until the next
     successful mount. */
  function storyFailed() {
    setStoryRoom(null);
    setStoryDomain(null);
    setStoryNote("The reading's picture couldn't load here — try again.");
  }

  /* TASK-450 (ruling 2 — "leave the chat off for now in that stage
     area"): the chat steps aside ONLY while the reading owns the stage;
     every other state (nothing playing, Stage 2 joined, the operator's
     saved switch either way) renders exactly as today. LOCAL to this
     component — the switch and ClassroomView are untouched. */
  const chatOff = chatHidden || storyRoom !== null;

  const resources = deriveResources(items ?? []);

  return (
    <div>
      {pin?.text && (
        <div className="card" style={{ padding: "14px 18px", marginBottom: 20, background: "rgba(217,178,78,.1)", border: "1px solid rgba(217,178,78,.45)" }}>
          <p style={{ margin: 0, fontSize: ".62rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--gold-deep)" }}>
            📌 from Love
          </p>
          <p style={{ margin: "6px 0 0", whiteSpace: "pre-line", color: "var(--ink-body)", fontSize: ".9rem" }}>{pin.text}</p>
        </div>
      )}
      <div className={`cl-grid-stage${chatOff ? " cl-grid-stage--no-chat" : ""}`}>
        <div role="region" className="cl-region cl-area-video" data-region="video" aria-label="Video">
          {stage2Room ? (
            <>
              {/* TASK-392: the ONLY reset path back to Stage 1 — required,
                  not decorative (Stage2Door itself renders null while
                  joined, and JitsiRoom.tsx exposes no ended/failed callback
                  to its parent). Never hidden, never conditional. */}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStage2Room(null)}>
                Leave Stage 2 · back to the reading
              </button>
              <JitsiRoom domain={jitsiDomain ?? ""} room={stage2Room} displayName={undefined} />
            </>
          ) : storyRoom ? (
            /* TASK-450: the reading on the room's OWN stage — the same
               one-way JitsiViewer as /reading (Guest, the T-448 keys,
               untouched), framed by the reading's own .kit-stage-media
               (an EXISTING class: the viewer is position:absolute and
               needs a positioned 16:9 parent; no new CSS, no inline
               style — the drift ceiling holds). */
            <div className="kit-stage-media">
              <JitsiViewer domain={storyDomain ?? ""} room={storyRoom} onEnded={storyEnded} onFailed={storyFailed} />
            </div>
          ) : (
            <RoomVideoSlot live={live} roomTitle={title} jitsiDomain={jitsiDomain} liveRoom={liveRoom} door={door} doorPackage={doorPackage} rail={rail} vdoHost={vdoHost} studioRoom={studioRoom} roomKey={roomKey} roster={roster} onCameraMxids={onCameraMxids} stageMxids={stageMxids} cameraDoor={cameraDoor} fullScene={fullScene} fullSceneShowTitle={fullSceneShowTitle} fullSceneStartsAt={fullSceneStartsAt} fullSceneAfterHoursLine={fullSceneAfterHoursLine} />
          )}
        </div>
        <AfterHoursDoor afterHours={afterHours ?? null} signedIn={signedIn} viewerTier={viewerTier} />
        {/* TASK-392/TASK-439: Stage 2 mounts only on the free reading
            room's own Stage — and since block 968,218 (the Admiral's
            ruling 1) the ROUTE admits tier A and above only; the tier
            check lives in /api/stage2, never in this component. */}
        {slug === READING_ROOM_SLUG && (
          <Stage2Door jitsiDomain={jitsiDomain ?? ""} joined={!!stage2Room} onJoin={setStage2Room} signedIn={signedIn} />
        )}
        {/* TASK-450: the Story time pill rides BESIDE the Stage 2 door
            under the same slug guard (RoomVideoSlot's "● Join Live
            Session" is the pill idiom — the button itself lives in
            StoryTimePill.tsx: the operator census ratchets THIS file's
            buttonFamilies at 1, fewer-never-more). Precedence is honest:
            the room's OWN live show owns its stage (!live), a joined
            Stage 2 owns it (!stage2Room), and a playing reading IS the
            stage (!storyRoom). The honest note stands where the pill
            stood until the next successful mount. */}
        {slug === READING_ROOM_SLUG && storyNote && !storyRoom && (
          <p className="kit-text-quiet">{storyNote}</p>
        )}
        {slug === READING_ROOM_SLUG && storyOpen && !live && !stage2Room && !storyRoom && (
          /* the bare div keeps the pill CONTENT-SIZED — a direct grid
             child would stretch full-width, and the room's own pill
             idiom (RoomVideoSlot's) is inline */
          <div>
            <StoryTimePill onWatch={() => void storyTime()} />
          </div>
        )}
        {resources.length > 0 && (
          <div role="region" className="cl-region cl-area-resources" aria-label="Resources">
            <ResourcesCard resources={resources} />
          </div>
        )}
        {/* TASK-387: hidden means NO chat column at all -- not mounting
            the region, never reaching into StageChat/RoomView.
            TASK-450: the gate consumes the LOCAL chatOff — the chat steps
            aside while the reading owns the stage, and ONLY then. */}
        {!chatOff && (
          <div role="region" className="cl-region cl-area-chat" data-region="chat" aria-label="Chat">
            <StageChat slug={slug} alias={alias} title={title} kind={kind} />
          </div>
        )}
        <div role="region" className="cl-region cl-area-people" data-region="people" aria-label="People">
          <RoomPresence roster={roster ?? null} />
        </div>
      </div>
    </div>
  );
}
