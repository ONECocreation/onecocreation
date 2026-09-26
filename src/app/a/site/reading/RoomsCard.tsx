"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Card from "@/components/kit/Card";
import { jitsiRoomUrl, doorStateWords, type DoorBusy, type DoorConfig, type DoorRowState } from "./rooms-config";

/**
 * THE ONE HOST AREA (TASK-475, block 968,624) — the Admiral's ruling: "i
 * wanted one area for love to open each room as needed on the host
 * side." Replaces the separate `Stage1Card`/`Stage2Card` sections on
 * `/a/site/reading` with ONE card, THREE identical rows (the free room,
 * the book talk, the Q&A), built from ONE `DoorRow` over a plain config
 * array — never three copies.
 *
 * Exactly `Stage1Card.tsx`'s own pattern: `kit/Card` + `ul.kit-rows`,
 * `span.kit-rows-end`, `kit-btn kit-btn-sm`; ONE state line said once,
 * under the words, in an `<em>`; pending/error text REPLACES the state,
 * never adds to it. The one real departure from Stage1Card: each row
 * carries TWO controls on the same right edge (Open/Close, plus Join on
 * camera), not one — the brief's own ruling, since this card folds what
 * used to be two separate one-control rows (the stage's lifecycle, and
 * its host link) into a single row per door.
 *
 * ONE CLICK OPEN (the brief): `open()` tries `publish` first — Stage 2
 * and the Q&A door both take the closed→publish convenience path, so one
 * PUT is enough. Stage 1 REFUSES that (409, its own law — the room must
 * only ever exist after Prepare with the host standing inside it); on
 * that refusal `open()` falls back to `prepare` then `publish` in the
 * SAME click, never a second button, never a second pending step Love
 * has to notice. This makes the row door-agnostic: no door id is ever
 * special-cased here.
 *
 * TWO components, on purpose (`Stage1Card.tsx`'s own split): `RoomsCard`
 * (default) owns the fetching, one poll per door on mount; `RoomsCardBody`
 * (named) is the pure presentation over explicit per-door state, so
 * `tests/rooms-card.test.ts` renders every phase directly — this repo's
 * vitest runs no jsdom.
 *
 * TASK-486 (block 968,624+, Love's one-tap email links): the ONE-CLICK
 * OPEN logic above (`fetchDoorState`/`openDoor`/`closeDoor`, the pure GET/
 * PUT chain `putAction` always rode) is now exported — `/a/site/reading/
 * go/[door]`'s own `useDoorRoom` hook calls the SAME functions for a
 * single door, never a copy of the publish-then-prepare-fallback chain.
 * `DOORS` moves here too (was a local const on `SiteReadingRoom.tsx`) so
 * both that page and the go/[door] route read the one config array. Every
 * literal call site (`putAction(door.adminPath, "publish")` etc.) is
 * unmoved text, only re-homed into named exports — `tests/rooms-card.
 * test.ts`'s own source pins read the same bytes either way. The one row
 * addition — a quiet "Room link" under the state line — rides as a THIRD
 * child of the `<li>` (its own `<span className="kit-row-link">`, never
 * inside the first span the state-line test pins, never inside
 * `kit-rows-end` the two-control test pins).
 *
 * REVIEW FIX (block 968,624+, T-486): THE DOUBLE-TAP RACE. `busy` state
 * alone doesn't guard `open`/`close` — `setBusy` is batched, so two taps
 * before the next render both slip past the `disabled` check and both
 * reach `openDoor`/`closeDoor`, which can PREPARE TWO DIFFERENT ROOMS —
 * Love then gets sent to whichever one lost the race. `runExclusive`
 * below is the shared in-flight lock, backed by a real `useRef`: a
 * second call while the first is still running returns `null`
 * immediately, never runs `fn`, and the lock always clears in `finally`.
 * `RoomsCard`'s own `open`/`close` wrap through it, one ref PER DOOR (via
 * `recordLock` over a single `useRef<Record<string, boolean>>({})`, so
 * two different doors never block each other, but open+close on the
 * SAME door do); `useDoorRoom.ts` wraps through it with its own single
 * `useRef(false)`, shared the same way between its own open+close (one
 * door, one lock).
 *
 * BLOCKER FIX (block 968,624+, T-486, a real `next build`+`next start`
 * Chrome walk): `DOORS`/`DoorConfig`/`DoorRowState`/`DoorBusy`/
 * `jitsiRoomUrl` moved OUT of this file into `./rooms-config.ts`, a
 * plain module with no `"use client"`. This file is `"use client"` —
 * `go/[door]/page.tsx` (a SERVER component) imported `DOORS` from here
 * and called `.find()` on it; on the server a client module's exports
 * are opaque client references, not the real array, and it 500'd:
 * "TypeError: h.DOORS.find is not a function". Vitest's plain-node
 * runner never enforces that boundary, so every test passed; only the
 * real build caught it. Every value the server needs now imports from
 * `./rooms-config` directly — never through this file, even by
 * re-export, which would just relocate the same trap.
 *
 * TASK-487 (block 968,624+, the Admiral's ruling, option C) — Love's own
 * flow on the day: she joins the Jitsi call as host, camera OFF, mic ON
 * (guests see her book picture, hear her audio), then presses a THIRD
 * control, "Show my camera" — every guest's cover drops at once. Each
 * row now carries THREE controls, always on the same right edge:
 *   - closed:            Open | Join as host (disabled) | Show my camera (disabled)
 *   - open, hidden:      Close | Join as host | Show my camera (kit-btn-main)
 *   - open, shown (live): Close | Join as host | Pause my camera (kit-btn-second)
 * "Join on camera" is renamed "Join as host" everywhere (it was always
 * just the direct Jitsi link, never a state transition). "Pause my
 * camera" is the Admiral's own label (not "Show my picture") — pressing
 * it puts the waiting picture back over the room for every guest while
 * her mic keeps playing, a short-break control; the row afterward reads
 * exactly like "open, hidden" again. The state line is now ONE of exactly
 * three (`rooms-config.ts`'s own `doorStateWords`, shared with
 * `GoRoom.tsx` so the words are never typed twice) — the old two-line
 * "press Close, then End meeting for all" instructions are dropped in
 * favor of these shorter, one-line-rule words. `showCameraDoor`/
 * `hideCameraDoor` are new exports beside `openDoor`/`closeDoor`, the
 * SAME shape (`putAction` against the door's own admin route), so
 * `useDoorRoom.ts` (the phone page) calls the identical PUT chain, never
 * a copy of it. All four actions share ONE per-door `runExclusive` lock
 * (`locksRef`/`recordLock`) — a camera tap can never race an open/close
 * tap, or another camera tap, on the same door.
 *
 * LAYOUT (kit.css): three controls squeeze a room's title at desktop
 * widths too — the two-column `.kit-rows` grid only ever worked for one
 * control opposite the words. `.kit-rooms-card`'s own rules now put the
 * controls on their OWN LINE under the words, right-aligned, at EVERY
 * width (not just the narrow `@media` this used to be scoped to) — see
 * `kit.css`'s own TASK-487 comment.
 */

export type Lock = { current: boolean };

/** The in-flight lock every open/close caller shares — see the docblock
 *  above. Returns `fn()`'s result, or `null` immediately without ever
 *  calling `fn` when a call is already running. */
export async function runExclusive<T>(lock: Lock, fn: () => Promise<T>): Promise<T | null> {
  if (lock.current) return null;
  lock.current = true;
  try {
    return await fn();
  } finally {
    lock.current = false;
  }
}

/** A `{ current }` view of one key in a Record-backed ref — lets
 *  `RoomsCard`'s single `useRef<Record<string, boolean>>({})` hand
 *  `runExclusive` a per-door lock without a ref per door. */
export function recordLock(store: { current: Record<string, boolean> }, key: string): Lock {
  return {
    get current() {
      return store.current[key] ?? false;
    },
    set current(v: boolean) {
      store.current[key] = v;
    },
  };
}

/* TASK-487: the state line is now `rooms-config.ts`'s own shared
   `doorStateWords(phase, cameraOn)` — see that file's docblock for why
   `prepared` collapses into the "open, hidden" bucket. */

const BUSY_WORDS: Record<Exclude<DoorBusy, null>, string> = {
  open: "Opening…",
  close: "Closing…",
  "show-camera": "Showing your camera…",
  "hide-camera": "Pausing your camera…",
};

export interface DoorRowProps {
  door: DoorConfig;
  state: DoorRowState | null;
  busy: DoorBusy;
  error: string | null;
  onOpen: () => void;
  onClose: () => void;
  onShowCamera: () => void;
  onHideCamera: () => void;
}

export function DoorRow({ door, state, busy, error, onOpen, onClose, onShowCamera, onHideCamera }: DoorRowProps) {
  const phase = state?.phase ?? "closed";
  const isOpen = phase !== "closed";
  const cameraOn = state?.camera === "shown";

  /* the state line: busy or error REPLACES the phase words, said once */
  const stateLine = busy ? (
    <em>{BUSY_WORDS[busy]}</em>
  ) : error ? (
    <em role="alert">{error}</em>
  ) : state ? (
    <em data-state={phase}>{doorStateWords(phase, cameraOn)}</em>
  ) : (
    <em>Reading…</em>
  );

  const lifecycleControl = isOpen ? (
    <button type="button" className="kit-btn kit-btn-second kit-btn-sm" disabled={busy !== null} onClick={onClose}>
      Close
    </button>
  ) : (
    <button type="button" className="kit-btn kit-btn-main kit-btn-sm" disabled={busy !== null || !state} onClick={onOpen}>
      Open
    </button>
  );

  const joinControl = state?.room ? (
    <a
      className="kit-btn kit-btn-second kit-btn-sm"
      href={jitsiRoomUrl({ jitsiDomain: state.jitsiDomain, room: state.room })}
      target="_blank"
      rel="noreferrer"
    >
      Join as host
    </a>
  ) : (
    /* disabled until a room exists: the same anchor in the same place, no
       href, honestly marked — never a dead button that LOOKS live */
    <a className="kit-btn kit-btn-second kit-btn-sm" aria-disabled="true">
      Join as host
    </a>
  );

  /* TASK-487: the third control — "Show my camera" (kit-btn-main, the
     call to action) while hidden, "Pause my camera" (kit-btn-second, the
     Admiral's own label — puts the picture back, mic keeps playing) once
     shown; disabled while closed (the admin route itself refuses outside
     published, this just never lets the tap happen at all). */
  const cameraControl = !isOpen ? (
    <button type="button" className="kit-btn kit-btn-main kit-btn-sm" disabled>
      Show my camera
    </button>
  ) : cameraOn ? (
    <button type="button" className="kit-btn kit-btn-second kit-btn-sm" disabled={busy !== null} onClick={onHideCamera}>
      Pause my camera
    </button>
  ) : (
    <button type="button" className="kit-btn kit-btn-main kit-btn-sm" disabled={busy !== null} onClick={onShowCamera}>
      Show my camera
    </button>
  );

  return (
    <li data-row={door.id}>
      <span>
        <b>{door.label}</b>
        {stateLine}
      </span>
      <span className="kit-rows-end">
        {lifecycleControl}
        {joinControl}
        {cameraControl}
      </span>
      {/* TASK-486: the quiet one-tap email link, under the state line but
         OUTSIDE both the words span (the state-line test pins that span
         to exactly <b>/<em>) and kit-rows-end (the control-cluster test
         pins that span) — its own third child, its own grid cell
         (kit.css's `.kit-rows>li` auto-places it under column 1,
         `.kit-rooms-card .kit-row-link` tightens the gap). */}
      <span className="kit-row-link">
        <a href={`/a/site/reading/go/${door.id}`}>Room link</a>
      </span>
    </li>
  );
}

export interface RoomsCardBodyProps {
  doors: DoorConfig[];
  states: Record<string, DoorRowState | null>;
  busy: Record<string, DoorBusy>;
  errors: Record<string, string | null>;
  onOpen: (door: DoorConfig) => void;
  onClose: (door: DoorConfig) => void;
  onShowCamera: (door: DoorConfig) => void;
  onHideCamera: (door: DoorConfig) => void;
}

export function RoomsCardBody({ doors, states, busy, errors, onOpen, onClose, onShowCamera, onHideCamera }: RoomsCardBodyProps) {
  return (
    <Card className="kit-rooms-card">
      <ul className="kit-rows">
        {doors.map((door) => (
          <DoorRow
            key={door.id}
            door={door}
            state={states[door.id] ?? null}
            busy={busy[door.id] ?? null}
            error={errors[door.id] ?? null}
            onOpen={() => onOpen(door)}
            onClose={() => onClose(door)}
            onShowCamera={() => onShowCamera(door)}
            onHideCamera={() => onHideCamera(door)}
          />
        ))}
      </ul>
    </Card>
  );
}

async function putAction(adminPath: string, action: "prepare" | "publish" | "close" | "show-camera" | "hide-camera") {
  const res = await fetch(adminPath, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  return { res, data } as {
    res: Response;
    data: {
      ok: boolean;
      phase?: DoorRowState["phase"];
      room?: string | null;
      jitsiDomain?: string;
      camera?: DoorRowState["camera"];
      reason?: string;
    } | null;
  };
}

/* TASK-486: the pure GET read every poll (RoomsCard's mount loop AND the
   go/[door] page's own hook) shares — a plain read, never a mutation, so
   an email scanner opening the go page's link is always safe. TASK-487:
   `camera` rides every admin GET now, defaulted to "hidden" on any doubt
   (a malformed/missing value never reads as "shown" — the picture stays
   up on any doubt, the same fail-closed spirit the door libs themselves
   keep). */
export async function fetchDoorState(door: DoorConfig): Promise<DoorRowState | null> {
  try {
    const r = await fetch(door.adminPath, { cache: "no-store" });
    const d = r.ok ? await r.json() : null;
    if (d?.ok) return { phase: d.phase, room: d.room, jitsiDomain: d.jitsiDomain, camera: d.camera === "shown" ? "shown" : "hidden" };
  } catch {
    /* the caller keeps the last-known truth */
  }
  return null;
}

export type DoorActionOutcome = { ok: true; state: DoorRowState } | { ok: false; reason: string };

function outcomeFromPut(data: NonNullable<Awaited<ReturnType<typeof putAction>>["data"]> | null, res: Response): DoorActionOutcome {
  if (data?.ok) {
    return {
      ok: true,
      state: { phase: data.phase!, room: data.room!, jitsiDomain: data.jitsiDomain!, camera: data.camera === "shown" ? "shown" : "hidden" },
    };
  }
  return { ok: false, reason: data?.reason ?? `the room refused (${res.status})` };
}

/* TASK-486: the ONE-CLICK OPEN chain, pulled out of the component's own
   `open` callback so `useDoorRoom` (go/[door]) calls the exact same
   publish-then-prepare-fallback logic — never a second copy of it. No
   door id is ever special-cased here (door-agnostic, config-driven, same
   as before this move). */
export async function openDoor(door: DoorConfig): Promise<DoorActionOutcome> {
  const first = await putAction(door.adminPath, "publish");
  if (first.data?.ok) return outcomeFromPut(first.data, first.res);
  /* the door refused publish from closed (Stage 1's own law, 409) —
     prepare, then publish, in this SAME call */
  const prepared = await putAction(door.adminPath, "prepare");
  if (!prepared.data?.ok) {
    return { ok: false, reason: prepared.data?.reason ?? `the room refused (${prepared.res.status})` };
  }
  const published = await putAction(door.adminPath, "publish");
  return outcomeFromPut(published.data, published.res);
}

/** TASK-486: the close chain, same shape as `openDoor`. */
export async function closeDoor(door: DoorConfig): Promise<DoorActionOutcome> {
  const { res, data } = await putAction(door.adminPath, "close");
  return outcomeFromPut(data, res);
}

/** TASK-487 — Love's "Show my camera": the same PUT chain, one action,
 *  409 (an honest `reason`) if the door isn't published. */
export async function showCameraDoor(door: DoorConfig): Promise<DoorActionOutcome> {
  const { res, data } = await putAction(door.adminPath, "show-camera");
  return outcomeFromPut(data, res);
}

/** TASK-487 — "Pause my camera": the same shape as `showCameraDoor`. */
export async function hideCameraDoor(door: DoorConfig): Promise<DoorActionOutcome> {
  const { res, data } = await putAction(door.adminPath, "hide-camera");
  return outcomeFromPut(data, res);
}

export default function RoomsCard({ doors }: { doors: DoorConfig[] }) {
  const [states, setStates] = useState<Record<string, DoorRowState | null>>({});
  const [busy, setBusy] = useState<Record<string, DoorBusy>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  /* the double-tap race's fix (review, T-486): one in-flight lock PER
     DOOR, so two taps on the SAME row before the next render can't both
     reach openDoor/closeDoor, but two different rows never block each
     other. */
  const locksRef = useRef<Record<string, boolean>>({});

  const refresh = useCallback(async (door: DoorConfig) => {
    const s = await fetchDoorState(door);
    if (s) setStates((prev) => ({ ...prev, [door.id]: s }));
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      for (const door of doors) {
        if (!alive) return;
        await refresh(door);
      }
    })();
    return () => {
      alive = false;
    };
    // doors is a static config array passed by the page — one mount read
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* TASK-487: the four door actions (open/close/show-camera/hide-camera)
     share this one run-and-report shape — busy label in, action fn in,
     everything else (the lock, the error/refresh fallback) identical. */
  const runDoorAction = useCallback(
    (label: Exclude<DoorBusy, null>, action: (door: DoorConfig) => Promise<DoorActionOutcome>) =>
      async (door: DoorConfig) => {
        await runExclusive(recordLock(locksRef, door.id), async () => {
          setBusy((b) => ({ ...b, [door.id]: label }));
          setErrors((e) => ({ ...e, [door.id]: null }));
          try {
            const outcome = await action(door);
            if (outcome.ok) {
              setStates((s) => ({ ...s, [door.id]: outcome.state }));
            } else {
              setErrors((e) => ({ ...e, [door.id]: outcome.reason }));
              await refresh(door);
            }
          } catch {
            setErrors((e) => ({ ...e, [door.id]: "the room didn't answer, try again" }));
            await refresh(door);
          } finally {
            setBusy((b) => ({ ...b, [door.id]: null }));
          }
        });
      },
    [refresh],
  );

  const open = useCallback((door: DoorConfig) => runDoorAction("open", openDoor)(door), [runDoorAction]);
  const close = useCallback((door: DoorConfig) => runDoorAction("close", closeDoor)(door), [runDoorAction]);
  const showCamera = useCallback((door: DoorConfig) => runDoorAction("show-camera", showCameraDoor)(door), [runDoorAction]);
  const hideCamera = useCallback((door: DoorConfig) => runDoorAction("hide-camera", hideCameraDoor)(door), [runDoorAction]);

  return (
    <RoomsCardBody
      doors={doors}
      states={states}
      busy={busy}
      errors={errors}
      onOpen={open}
      onClose={close}
      onShowCamera={showCamera}
      onHideCamera={hideCamera}
    />
  );
}
