/**
 * THE STUDIO DOC'S SHAPE (TASK-191, 0018.06.18 a₿ · block 966119) — the
 * types, limits and sanitize for the director's inputs, split from the
 * store (roster.ts) the way booking-time.ts splits from booking.ts: the
 * /a/studio room is a CLIENT component and imports these, so this module
 * carries no fs, no KV, no env — pure shape only. roster.ts re-exports it
 * wholesale; server consumers keep their one import.
 */

import { isStudioScene, type StudioSceneId } from "./scenes";

export interface StudioPerson {
  name: string;
  specialty: string;
}

export interface StudioDoc {
  schemaVersion: 1;
  /** "" = the cartridge's own product name speaks on the overlay */
  showTitle: string;
  host: StudioPerson;
  /** the guest roster — the overlay's duo/phone thirds read the FIRST row */
  guests: StudioPerson[];
  /** the scene chip Love last picked on the desk */
  activeScene: StudioSceneId;
}

export const GUEST_LIMIT = 6;

export function defaultStudioDoc(): StudioDoc {
  return { schemaVersion: 1, showTitle: "", host: { name: "", specialty: "" }, guests: [], activeScene: "solo" };
}

/* one law every typed line shares: no control characters ever — a pasted
   smart-string can't smuggle a break onto the lower third */
const clean = (v: unknown, max: number): string =>
  typeof v === "string" ? v.replace(/[\x00-\x1f\x7f]/g, "").trim().slice(0, max) : "";

function cleanPerson(raw: unknown): StudioPerson | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const name = clean(o.name, 60);
  const specialty = clean(o.specialty, 60);
  /* a row with no name is no guest — dropped, never rendered as a blank third */
  if (!name) return null;
  return { name, specialty };
}

/** Stored doc → honest doc: defaults underneath, known keys only, wrong
 *  types ignored — sanitize() is the backstop for hand-edited docs. */
export function sanitizeStudioDoc(raw: unknown): StudioDoc {
  const d = defaultStudioDoc();
  if (!raw || typeof raw !== "object") return d;
  const o = raw as Record<string, unknown>;
  /* the host row survives empty (the desk shows the blank fields and the
     overlay dashes them) — unlike a guest row, which IS its name */
  const hostRaw = (o.host && typeof o.host === "object" ? o.host : {}) as Record<string, unknown>;
  const guests = (Array.isArray(o.guests) ? o.guests : [])
    .map(cleanPerson)
    .filter((g): g is StudioPerson => g !== null)
    .slice(0, GUEST_LIMIT);
  return {
    schemaVersion: 1,
    showTitle: clean(o.showTitle, 80),
    host: { name: clean(hostRaw.name, 60), specialty: clean(hostRaw.specialty, 60) },
    guests,
    activeScene: isStudioScene(o.activeScene) ? o.activeScene : d.activeScene,
  };
}
