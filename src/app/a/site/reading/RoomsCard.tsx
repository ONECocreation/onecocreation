"use client";

import { useCallback, useEffect, useState } from "react";
import Card from "@/components/kit/Card";

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
 */

export interface DoorConfig {
  /** a stable key AND the door's admin route suffix source — never
   *  guessed from the label */
  id: string;
  /** the row's own words, e.g. "Free room · 12:12 Housewarming and 1:11
   *  Reading" */
  label: string;
  /** the operator route this row's door answers to, e.g.
   *  "/api/admin/stage1" */
  adminPath: string;
}

/* TASK-481's real, current config — moved here from `SiteReadingRoom.tsx`
   (TASK-486) so `/a/site/reading/go/[door]` reads the SAME array, never a
   second copy of the four doors. */
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

/* the ONE state line per row, said once, under the words, in the ONE
   quiet <em> (the /a uniformity law — Number One's Chrome walk caught a
   second, full-size line here: the close instructions used to ride the
   row's own <span> text, outside the <em>, so an open row showed TWO
   lines). Every word an open row needs — that it's open, what a visitor
   sees, and how to end it — now lives in this ONE line. */
const STATE_WORDS: Record<DoorRowState["phase"], string> = {
  closed: "Closed.",
  prepared: "Open. Press Join on camera to start. When you finish, press Close, then End meeting for all in the call.",
  published: "Open. Viewers can come in. When you finish, press Close, then End meeting for all in the call.",
};

const BUSY_WORDS: Record<Exclude<DoorBusy, null>, string> = { open: "Opening…", close: "Closing…" };

/** The one Jitsi hash every camera link on this card (and the go/[door]
 *  page) carries — a single join point so the flags never drift apart. */
export function jitsiRoomUrl(state: { jitsiDomain: string; room: string }): string {
  return `https://${state.jitsiDomain}/${state.room}#config.p2p.enabled=false&config.showChatPermissionsModeratorSetting=true`;
}

export interface DoorRowProps {
  door: DoorConfig;
  state: DoorRowState | null;
  busy: DoorBusy;
  error: string | null;
  onOpen: () => void;
  onClose: () => void;
}

export function DoorRow({ door, state, busy, error, onOpen, onClose }: DoorRowProps) {
  const phase = state?.phase ?? "closed";

  /* the state line: busy or error REPLACES the phase words, said once */
  const stateLine = busy ? (
    <em>{BUSY_WORDS[busy]}</em>
  ) : error ? (
    <em role="alert">{error}</em>
  ) : state ? (
    <em data-state={phase}>{STATE_WORDS[phase]}</em>
  ) : (
    <em>Reading…</em>
  );

  const lifecycleControl =
    phase === "closed" ? (
      <button type="button" className="kit-btn kit-btn-main kit-btn-sm" disabled={busy !== null || !state} onClick={onOpen}>
        Open
      </button>
    ) : (
      <button type="button" className="kit-btn kit-btn-second kit-btn-sm" disabled={busy !== null} onClick={onClose}>
        Close
      </button>
    );

  const joinControl = state?.room ? (
    <a
      className="kit-btn kit-btn-second kit-btn-sm"
      href={jitsiRoomUrl({ jitsiDomain: state.jitsiDomain, room: state.room })}
      target="_blank"
      rel="noreferrer"
    >
      Join on camera
    </a>
  ) : (
    /* disabled until a room exists: the same anchor in the same place, no
       href, honestly marked — never a dead button that LOOKS live */
    <a className="kit-btn kit-btn-second kit-btn-sm" aria-disabled="true">
      Join on camera
    </a>
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
      </span>
      {/* TASK-486: the quiet one-tap email link, under the state line but
         OUTSIDE both the words span (the state-line test pins that span
         to exactly <b>/<em>) and kit-rows-end (the two-control test pins
         that span to exactly two controls) — its own third child, its own
         grid cell (kit.css's `.kit-rows>li` auto-places it under column
         1, `.kit-rooms-card .kit-row-link` tightens the gap). */}
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
}

export function RoomsCardBody({ doors, states, busy, errors, onOpen, onClose }: RoomsCardBodyProps) {
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
          />
        ))}
      </ul>
    </Card>
  );
}

async function putAction(adminPath: string, action: "prepare" | "publish" | "close") {
  const res = await fetch(adminPath, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  return { res, data } as { res: Response; data: { ok: boolean; phase?: DoorRowState["phase"]; room?: string | null; jitsiDomain?: string; reason?: string } | null };
}

/* TASK-486: the pure GET read every poll (RoomsCard's mount loop AND the
   go/[door] page's own hook) shares — a plain read, never a mutation, so
   an email scanner opening the go page's link is always safe. */
export async function fetchDoorState(door: DoorConfig): Promise<DoorRowState | null> {
  try {
    const r = await fetch(door.adminPath, { cache: "no-store" });
    const d = r.ok ? await r.json() : null;
    if (d?.ok) return { phase: d.phase, room: d.room, jitsiDomain: d.jitsiDomain };
  } catch {
    /* the caller keeps the last-known truth */
  }
  return null;
}

export type DoorActionOutcome = { ok: true; state: DoorRowState } | { ok: false; reason: string };

/* TASK-486: the ONE-CLICK OPEN chain, pulled out of the component's own
   `open` callback so `useDoorRoom` (go/[door]) calls the exact same
   publish-then-prepare-fallback logic — never a second copy of it. No
   door id is ever special-cased here (door-agnostic, config-driven, same
   as before this move). */
export async function openDoor(door: DoorConfig): Promise<DoorActionOutcome> {
  const first = await putAction(door.adminPath, "publish");
  if (first.data?.ok) {
    return { ok: true, state: { phase: first.data.phase!, room: first.data.room!, jitsiDomain: first.data.jitsiDomain! } };
  }
  /* the door refused publish from closed (Stage 1's own law, 409) —
     prepare, then publish, in this SAME call */
  const prepared = await putAction(door.adminPath, "prepare");
  if (!prepared.data?.ok) {
    return { ok: false, reason: prepared.data?.reason ?? `the room refused (${prepared.res.status})` };
  }
  const published = await putAction(door.adminPath, "publish");
  if (published.data?.ok) {
    return { ok: true, state: { phase: published.data.phase!, room: published.data.room!, jitsiDomain: published.data.jitsiDomain! } };
  }
  return { ok: false, reason: published.data?.reason ?? `the room refused (${published.res.status})` };
}

/** TASK-486: the close chain, same shape as `openDoor`. */
export async function closeDoor(door: DoorConfig): Promise<DoorActionOutcome> {
  const { res, data } = await putAction(door.adminPath, "close");
  if (data?.ok) {
    return { ok: true, state: { phase: data.phase!, room: data.room!, jitsiDomain: data.jitsiDomain! } };
  }
  return { ok: false, reason: data?.reason ?? `the room refused (${res.status})` };
}

export default function RoomsCard({ doors }: { doors: DoorConfig[] }) {
  const [states, setStates] = useState<Record<string, DoorRowState | null>>({});
  const [busy, setBusy] = useState<Record<string, DoorBusy>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});

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

  const open = useCallback(
    async (door: DoorConfig) => {
      setBusy((b) => ({ ...b, [door.id]: "open" }));
      setErrors((e) => ({ ...e, [door.id]: null }));
      try {
        const outcome = await openDoor(door);
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
    },
    [refresh],
  );

  const close = useCallback(
    async (door: DoorConfig) => {
      setBusy((b) => ({ ...b, [door.id]: "close" }));
      setErrors((e) => ({ ...e, [door.id]: null }));
      try {
        const outcome = await closeDoor(door);
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
    },
    [refresh],
  );

  return <RoomsCardBody doors={doors} states={states} busy={busy} errors={errors} onOpen={open} onClose={close} />;
}
