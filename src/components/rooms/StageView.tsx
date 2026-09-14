"use client";

import { useEffect, useState } from "react";
import RoomVideoSlot from "./RoomVideoSlot";
import RoomPresence, { type RosterResult } from "./RoomPresence";
import StageChat from "./StageChat";
import { deriveResources, ResourcesCard } from "./LessonPathView";
import type { MaterialItem } from "@/lib/class-materials";
import type { RoomPin } from "@/lib/room-pins";
import type { RoomGate } from "@/lib/room-access";

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
 */
export default function StageView({
  slug, alias, title, kind, pin, live, jitsiDomain, liveRoom, door, doorPackage, roster, rail, vdoHost, studioRoom, onCameraMxids, stageMxids,
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
  /** TASK-245: pass-through only — the room page's own derivation off the
   *  director's guest roster (who Love actually arranged to be on camera
   *  today), handed to the video slot's gallery. */
  onCameraMxids?: readonly string[];
  /** TASK-245: present souls who ARE the stage (the director by name) — never a gallery tile. */
  stageMxids?: readonly string[];
}) {
  const gated = !!door && door !== "open";
  const [items, setItems] = useState<MaterialItem[] | null>(null);

  useEffect(() => {
    if (gated) return; // the gate closed — no fetch, same law as the Lesson Path
    let alive = true;
    fetch(`/api/rooms/${encodeURIComponent(slug)}/materials`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { ok: false }))
      .then((d) => { if (alive) setItems(d?.ok && d.open ? (d.items ?? []) : []); })
      .catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, [slug, gated]);

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
      <div className="cl-grid-stage">
        <div role="region" className="cl-region cl-area-video" data-region="video" aria-label="Video">
          <RoomVideoSlot live={live} roomTitle={title} jitsiDomain={jitsiDomain} liveRoom={liveRoom} door={door} doorPackage={doorPackage} rail={rail} vdoHost={vdoHost} studioRoom={studioRoom} roster={roster} onCameraMxids={onCameraMxids} stageMxids={stageMxids} />
        </div>
        {resources.length > 0 && (
          <div role="region" className="cl-region cl-area-resources" aria-label="Resources">
            <ResourcesCard resources={resources} />
          </div>
        )}
        <div role="region" className="cl-region cl-area-chat" data-region="chat" aria-label="Chat">
          <StageChat slug={slug} alias={alias} title={title} kind={kind} />
        </div>
        <div role="region" className="cl-region cl-area-people" data-region="people" aria-label="People">
          <RoomPresence roster={roster ?? null} />
        </div>
      </div>
    </div>
  );
}
