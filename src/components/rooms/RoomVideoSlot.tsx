"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import JitsiRoom from "@/components/booking/JitsiRoom";
import { PixelAvatar } from "@pacsarcade/arcade-ui";
import useNostrProfile from "@/hooks/useNostrProfile";
import { SPACE_NAME } from "@/lib/identity-config";
import { ROOMS } from "@/lib/matrix-rooms";
import {
  signInDoorLine,
  signInDoorHref,
  packageDoorLine,
  type RoomGate,
} from "@/lib/room-access";
import { soulsOnline, handleOf, type RosterResult, type Soul } from "./RoomPresence";
import SceneFrame from "./SceneFrame";
import type { StudioSceneId } from "@/lib/studio/scenes";

/**
 * THE VIDEO SLOT (TASK-123, 0018.06.16 a₿ — first embed TASK-146, 0018.06.17
 * a₿). The video region all four restored classroom layouts share. A stage
 * frame that holds the room's title in the dark and, when this room is
 * actually live, raises the gold door AND — the first slice of the Stage
 * Room mockup (canvas bc0bbb78) — mounts the same on-site Jitsi embed
 * /meet/[bookingId] proves, right here in the slot. Rose accents ride the
 * --rose token name only (T-121 owns the values).
 *
 * `jitsiDomain` and `liveRoom` are OPTIONAL and come from the server page
 * (the room page reads the site switches + derives the room name via
 * live.ts's ONE liveRoomName() helper — this client leaf never imports
 * live.ts itself, see that file's docblock). When either is absent the slot
 * degrades gracefully to the original text-only door: no domain/room means
 * no embed, only the honest fallback link.
 *
 * TASK-174 (0018.06.17 a₿ · block 966094) — the doors match:
 *  · the "Join Live Session" door leads to the room's OWN Stage
 *    (/rooms/<slug>, slug derived from the rooms registry by title —
 *    derive-or-dash: no match → /live, which embeds any live room since
 *    this lane), never to a page that cannot show it.
 *  · `door` is the SAME gate the chat follows (src/lib/room-access.ts's
 *    ONE roomGate decision + its shared door words), computed server-side
 *    by the room page and threaded down. Signed-out → the sign-in door
 *    with the room's name; a lower tier → "opens with the <package>" in
 *    words. (TASK-184: the Video/Materials/People vantages this once
 *    noted as unthreaded retired — the Stage, the only vantage mounting
 *    this slot, always threads the door.)
 *
 * TASK-245 (0018.06.23 a₿, the Admiral's ruling — "it's meant to be focused
 * on her and her reading. the others can be in a gallery area below."): a
 * SECOND rail. When `config.meeting.rail === "vdo"` and the room is live,
 * this slot shows Love's own studio (VDO.Ninja, Love's fork at
 * `vdoHost`) full-width instead of Jitsi — `?view=host&room=<studioRoom>`,
 * the same "one publisher" view link T-243's studioVdoLinks hands the
 * director's desk, `push=host` on her own push link so this view can
 * always find her. BELOW it, the Admiral's own follow-up ruling (civil
 * 2026-09-14): "for the gallery for the people watching: if they don't
 * want to be on video their profile picture should be displayed" — one
 * tile per soul the room's OWN presence already counts (RoomPresence's
 * soulsOnline, the exact "who's here" filter, never a second read — minus
 * the director herself, `stageMxids`: she IS the frame above, never a
 * watcher), a VDO view tile (`?view=<their handle>&room=<studioRoom>`) when
 * they're on camera — addressable ONLY once that guest published with
 * `&push=<their handle>`, else their member picture (the site's ONE picture
 * helper — useNostrProfile, same hook FrenChip/FrenMenu/FrenProfile
 * already share — PixelAvatar's seeded body standing in for an absent one,
 * never a broken image). The gallery hides entirely when the room is
 * otherwise empty (only Love — the stage, never a "watcher" — is here).
 *
 * TASK-249: the named guest's own push door. T-243's
 * `.guest` link stayed bare (VDO assigns a random id), so a named guest's
 * OWN tile above could never find them — `cameraDoor` (the room page's
 * derivation, `live.ts`'s new `studioGuestCameraLink`) is that door: a
 * `push=<their handle>` link, rendered under the gallery ONLY for the
 * viewer Love actually named and only while they're present on camera.
 * Never gold — `btn-ghost`, a quiet door, not the money/join one.
 *
 * SEAM, stated plainly: nothing in this codebase reads the studio's actual
 * WebRTC state — the studio kit's live camera-live state is explicitly
 * Phase 2 (StudioRoom.tsx's own docblock, T-191), and no signal like it
 * exists anywhere else either (matrix presence only knows chat-online,
 * never "joined the VDO room"). Rather than fabricate one, the room page
 * derives `onCameraMxids` from the ONE real, already-typed intention Love
 * leaves lying around for this: the director's OWN guest roster
 * (studio/doc.ts's StudioDoc — her name and today's guests' names,
 * typed at /a/studio before the show) — a present soul whose display name
 * matches the host or a listed guest is who Love actually arranged to be
 * on camera today. A soul that matches nobody draws their picture — the
 * Admiral's own privacy default holds for everyone she didn't name.
 *
 * The Jitsi branch below stays byte-identical for `rail !== "vdo"` (absent
 * reads as jitsi, the pre-T-245 behavior) — this is a NEW branch inserted
 * ahead of it, never a rewrite of it.
 *
 * TASK-251 (0018.06.23 a₿) — Love's full-frame scenes (starting soon / be
 * right back / thank you) now honour `fullScene`: when the room page's own
 * derivation off the studio doc's `activeScene` resolves to a `full` kind
 * (`studioSceneKind`), the vdo rail's frame renders the site's own
 * `FullScene` inline (`SceneFrame.tsx`, a small client leaf that scales the
 * scene's fixed 1920×1080 canvas to fit) instead of the `?view=host`
 * iframe — this is the fix for "live 20 minutes early, camera off": before
 * this the viewer's frame just showed an empty host picture, because
 * nothing on the stage ever watched the scene id Love picks on her desk
 * (that id only ever rode a VDO `&website=` push, `/studio/overlay`'s own
 * gated route). `fullScene` null (the default, no full scene active) keeps
 * today's `?view=host` iframe exactly as it was. The gallery, the camera
 * door and the "Join Live Session" pill below the frame are UNCHANGED —
 * this only swaps what fills the frame above them.
 *
 * TASK-260 (0018.06.24 a₿, from the Admiral's walk of the Heart Field
 * stage) — three honesty fixes:
 *  · the title (`<h3 className="cl-video-title">`) said the literal word
 *    "Video" no matter what was on stage. It now reads the show's own name
 *    (`fullSceneShowTitle || roomTitle`, the exact derive-or-dash pattern
 *    `SceneFrame.tsx:94` already carries) — never blank, never "Video".
 *  · the "● Join Live Session" pill always led to `joinHref`, which —
 *    since this slot mounts ONLY on a room's OWN Stage — is always the
 *    page already open. `selfLink` (below) names that: whenever the
 *    component's own title resolves against the ROOMS registry (the only
 *    way this component is ever actually called), the pill is a door back
 *    to itself and is not rendered. The named guest's camera door (T-249's
 *    "Step on camera") and the sign-in/package doors are untouched — this
 *    only retires the self-referential gold pill.
 *  · the vdo rail's iframes (the host frame here, and each `GalleryTile`
 *    on-camera frame) now carry `&chat=0`, the fork's chat-suppress flag
 *    (`chatbutton`/`chat`/`cb` aliases, `~/dev/apps/onecocreation-studio/
 *    main.js:2393`, read-only reference clone) — the site's own Matrix
 *    chat rides beside the stage; the VDO frame never grows a second one.
 */
/** TASK-245: handle → npub, the one lookup this lane needs that no route
 *  yet exposes on its own — reused rather than reinvented from the public
 *  claim-availability answer (frens/availability already hands back an
 *  npub for a handle "already claimed", the same publicly-known fact
 *  nostr.json serves). A handle that isn't a claimed tag (an email member,
 *  or the lookup simply hasn't answered yet) stays null — no picture, no
 *  guess, the house initial tile stands. */
function useHandleNpub(handle: string): string | null {
  const [npub, setNpub] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`/api/frens/availability?handle=${encodeURIComponent(handle)}&space=${encodeURIComponent(SPACE_NAME)}`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && typeof d?.npub === "string") setNpub(d.npub);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [handle]);
  return npub;
}

/** TASK-245: one gallery tile — the VDO view when this soul is on camera,
 *  else their own member picture, else the house initial tile. Never a
 *  broken image (PixelAvatar's seeded body always renders). */
function GalleryTile({
  soul,
  onCamera,
  vdoHost,
  studioRoom,
}: {
  soul: Soul;
  onCamera: boolean;
  vdoHost: string;
  studioRoom: string;
}) {
  const handle = handleOf(soul.mxid);
  const npub = useHandleNpub(handle);
  const { profile } = useNostrProfile(npub);

  return (
    <div className="cl-gallery-tile">
      {onCamera ? (
        <iframe
          className="cl-gallery-tile__frame"
          /* TASK-260: &chat=0 — the fork's chat-off flag (main.js:2393,
             `chatbutton`/`chat`/`cb` aliases, "0"/"false"/"no"/"off" all
             hide the button); the site's own Matrix chat rides beside the
             stage, so the VDO frame never grows a second one. */
          src={`https://${vdoHost}/?view=${encodeURIComponent(handle)}&room=${encodeURIComponent(studioRoom)}&cleanoutput&autostart&chat=0`}
          allow="autoplay; fullscreen"
          title={soul.name}
        />
      ) : profile?.picture ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.picture} alt="" className="cl-gallery-tile__pic" />
      ) : (
        <PixelAvatar variant="player" seed={handle} size={48} />
      )}
      <p className="cl-gallery-tile__name">{soul.name}</p>
    </div>
  );
}

export default function RoomVideoSlot({
  live,
  roomTitle,
  jitsiDomain,
  liveRoom,
  displayName,
  door,
  doorPackage,
  rail,
  vdoHost,
  studioRoom,
  roster,
  onCameraMxids,
  stageMxids,
  cameraDoor,
  fullScene,
  fullSceneShowTitle,
  fullSceneStartsAt,
  fullSceneAfterHoursLine,
}: {
  live: boolean;
  roomTitle: string;
  jitsiDomain?: string;
  liveRoom?: string;
  displayName?: string;
  /** TASK-174: the room page's gate decision for THIS visitor — absent
   *  reads as "open" (the pre-gate behavior, byte-identical). */
  door?: RoomGate;
  /** the package the door opens with (TIERS' own name, threaded server-side) */
  doorPackage?: string | null;
  /** TASK-245: the site's meeting rail — absent/"jitsi" reads as the
   *  pre-T-245 Jitsi behavior, byte-identical. */
  rail?: "jitsi" | "vdo" | "static";
  /** TASK-245: config.meeting.vdoHost — Love's own studio fork, never the
   *  public vdo.ninja (T-243's law). */
  vdoHost?: string;
  /** TASK-245: the studio's own room name (T-243's studioVdoLinks, one
   *  more word than liveRoom — the studio is its own room, not this
   *  room's namespaced alias). */
  studioRoom?: string;
  /** TASK-245: the room page's ONE roster/presence read (T-184's 429 hunt)
   *  — the gallery's source of WHO, the exact same read RoomPresence
   *  already renders from, never a second one. */
  roster?: RosterResult | null;
  /** TASK-245: present souls Love actually arranged to be on camera today
   *  — the room page's own derivation off the director's guest roster
   *  (studio/doc.ts's StudioDoc: her name + today's guests), never a
   *  guessed or fabricated live signal. Absent/empty (no studio doc, or
   *  nobody present matches a named soul) reads as "everyone draws their
   *  picture" — the Admiral's own privacy default. */
  onCameraMxids?: readonly string[];
  /** TASK-245: present souls who ARE the stage (the director, matched by
   *  name against the studio doc on the room page) — already the big frame
   *  above the gallery, so never a tile in it. Absent = nobody excluded. */
  stageMxids?: readonly string[];
  /** TASK-249: THIS viewer's own camera door — set by the room page only
   *  when Love named them as today's guest and they're present on camera
   *  (`onCameraMxids` above holds who; this is the one door addressed to
   *  the viewer themself). Absent/null = nothing rendered, not even the
   *  wrapping paragraph — grep-pin: "Step on camera" appears zero times
   *  when this prop is absent. */
  cameraDoor?: string | null;
  /** TASK-251: the room page's own derivation off the studio doc's
   *  `activeScene` — set only when its kind is `full` (the overlay route's
   *  one branch point, `studioSceneKind`, read once server-side). Null/
   *  absent = no full scene active, the pre-T-251 `?view=host` iframe.
   *  First paint only; `ClassroomView`'s `/api/live` poll carries updates
   *  while a viewer watches (the doc can change mid-show). */
  fullScene?: Extract<StudioSceneId, "starting" | "brb" | "ending"> | null;
  /** TASK-251: the studio doc's own show title (derive-or-dash applied in
   *  `SceneFrame`), SSR'd once alongside `fullScene` — never re-polled. */
  fullSceneShowTitle?: string;
  /** TASK-251: the "starting soon" scene's countdown target, ISO — "" = no clock. */
  fullSceneStartsAt?: string;
  /** TASK-251: the "thank you" scene's after-hours line — "" = omitted. */
  fullSceneAfterHoursLine?: string;
}) {
  const canEmbed = live && !!jitsiDomain && !!liveRoom;
  /* the room's own slug, derived from the registry by title (the title
     itself comes from the same registry at the page) */
  const own = ROOMS.find((r) => r.title === roomTitle);
  const slug = own ? own.id.slice(1, own.id.indexOf(":")) : null;
  const joinHref = slug ? `/rooms/${slug}` : "/live";
  /* TASK-260: the pill stops lying. RoomVideoSlot mounts ONLY on the room's
     OWN Stage (StageView, only ever reached from /rooms/[slug]/page.tsx
     with THIS room's own title) — so whenever `own` resolves, `joinHref`
     is provably the page already rendering right now. A "Join Live
     Session" door to the page you're already reading never goes anywhere;
     it used to just sit there looking like a door. `slug` null (roomTitle
     doesn't match a registered room — no caller does this today, but the
     text-only fallback stays honest if one ever does) is the one case
     `joinHref` might be a REAL door (`/live`), so the pill still renders
     then. */
  const selfLink = slug !== null;
  const gate: RoomGate = door ?? "open";
  /* TASK-245: the vdo rail's own embed gate — live + both halves of the
     studio address present. Checked AHEAD of `canEmbed` so a config that
     (misconfigured) carries both a jitsiDomain and rail:"vdo" still shows
     the studio, never Jitsi silently, when the operator chose vdo. */
  const canEmbedVdo = rail === "vdo" && live && !!vdoHost && !!studioRoom;
  const stageSet = new Set(stageMxids ?? []);
  const souls: Soul[] = roster?.ok
    ? soulsOnline(roster.joined, roster.presence).filter((s) => !stageSet.has(s.mxid))
    : [];
  const onCameraSet = new Set(onCameraMxids ?? []);

  return (
    <div className="card cl-video-slot">
      {/* TASK-260: the stage says the show's name, never the placeholder
          "Video" — derive-or-dash, the same fallback SceneFrame.tsx:94
          already performs (`showTitle || cartridge.copy.productName`):
          the studio doc's own show title when threaded (fullSceneShowTitle,
          set only while a full-frame interstitial is active — starting
          soon/brb/ending, `src/app/rooms/[slug]/page.tsx`'s own gate),
          else the room's own registered title, never blank. */}
      <h3 className="cl-video-title">{fullSceneShowTitle || roomTitle}</h3>
      {live && gate === "signin" ? (
        /* the sign-in door — the SAME words the chat's door says */
        <div className="cl-video-stage">
          <div>
            <p style={{ margin: "0 0 12px", color: "var(--ink-body)", fontSize: ".9rem", maxWidth: 380 }}>
              {signInDoorLine(roomTitle)}
            </p>
            <Link href={signInDoorHref(slug)} className="btn btn-sm">
              Sign in · join free
            </Link>
          </div>
        </div>
      ) : live && gate === "package" ? (
        /* the lower-tier door — "opens with the <package>" in words */
        <div className="cl-video-stage">
          <div>
            <p style={{ margin: "0 0 6px", color: "var(--ink-body)", fontSize: ".9rem", maxWidth: 380 }}>
              🔒 {packageDoorLine(doorPackage ?? null)}
            </p>
            <p style={{ margin: "0 0 12px", color: "var(--muted)", fontSize: ".86rem", maxWidth: 380 }}>
              The lock is an invitation — everything inside stays waiting for you.
            </p>
            <Link href="/memberships" className="btn btn-sm">
              See the memberships
            </Link>
          </div>
        </div>
      ) : canEmbedVdo ? (
        <div>
          <div className="cl-stage-embed">
            {fullScene ? (
              /* TASK-251: Love's full-frame scene, INLINE — no camera, no
                 overlay token, just the same picture /studio/overlay shows */
              <SceneFrame
                scene={fullScene}
                showTitle={fullSceneShowTitle ?? ""}
                startsAt={fullSceneStartsAt ?? ""}
                afterHoursLine={fullSceneAfterHoursLine ?? ""}
              />
            ) : (
              <iframe
                style={{ width: "100%", height: "100%", border: 0 }}
                /* TASK-260: &chat=0 — see GalleryTile's own note above; the
                   host frame gets the same chat-off flag the tiles do. */
                src={`https://${vdoHost}/?view=host&room=${encodeURIComponent(studioRoom!)}&cleanoutput&autostart&chat=0`}
                allow="autoplay; camera; microphone; fullscreen"
                title={`${roomTitle} — the studio`}
              />
            )}
          </div>
          {souls.length > 0 && (
            <div className="cl-stage-gallery" aria-label="Who's watching">
              {souls.map((s) => (
                <GalleryTile
                  key={s.mxid}
                  soul={s}
                  onCamera={onCameraSet.has(s.mxid)}
                  vdoHost={vdoHost!}
                  studioRoom={studioRoom!}
                />
              ))}
            </div>
          )}
          {cameraDoor && (
            <div style={{ margin: "0 0 12px" }}>
              <p style={{ margin: "0 0 6px", color: "var(--muted)", fontSize: ".86rem", maxWidth: 380 }}>
                Love named you as today&apos;s guest — this opens your studio camera in a new tab; your tile here
                follows.
              </p>
              <a href={cameraDoor} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                Step on camera
              </a>
            </div>
          )}
          <p style={{ margin: "0 0 12px", color: "var(--ink-body)", fontSize: ".9rem" }}>
            Love is live in {roomTitle} now — the stage is lit.
          </p>
          {/* TASK-260: the pill stops lying — never a door back to the page
              you're already on. See `selfLink`'s note above. */}
          {!selfLink && (
            <Link href={joinHref} className="btn btn-gold" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              ● Join Live Session
            </Link>
          )}
        </div>
      ) : canEmbed ? (
        <div>
          <div className="cl-stage-embed">
            <JitsiRoom domain={jitsiDomain!} room={liveRoom!} displayName={displayName} height="100%" />
          </div>
          <p style={{ margin: "0 0 12px", color: "var(--ink-body)", fontSize: ".9rem" }}>
            Love is live in {roomTitle} now — the stage is lit.
          </p>
          {!selfLink && (
            <Link href={joinHref} className="btn btn-gold" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              ● Join Live Session
            </Link>
          )}
        </div>
      ) : (
        <div className="cl-video-stage">
          {live ? (
            <div>
              <p style={{ margin: "0 0 12px", color: "var(--ink-body)", fontSize: ".9rem" }}>
                Love is live in {roomTitle} now — the stage is lit.
              </p>
              {!selfLink && (
                <Link href={joinHref} className="btn btn-gold" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  ● Join Live Session
                </Link>
              )}
            </div>
          ) : (
            <p style={{ margin: 0, color: "var(--muted)", fontSize: ".86rem", maxWidth: 340 }}>
              The stage is dark until this room goes live — the door lights right here when it does.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
