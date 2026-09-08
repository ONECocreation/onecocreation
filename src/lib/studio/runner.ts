/**
 * THE RUNNER (TASK-191, 0018.06.18 a₿ · block 966119) — the ticker along
 * the overlay's foot reads the site's own shelves through ONE derivation,
 * `runnerItems()`: the catalogue's LIVE items' titles (a hidden or
 * sold-out item never advertises itself) and the calendar's next
 * confirmed reading/session. Nothing is hand-typed — an empty shelf and
 * an empty calendar produce an empty runner, and the overlay says so
 * honestly rather than inventing words (derive-or-dash).
 *
 * The pure half takes plain fixtures so the node suite can pin it without
 * a store; `loadRunnerItems()` is the same derivation fed by the real
 * catalogue + booking vault.
 */

import { listItems } from "../store";
import { listBookings } from "../booking-orders";
import type { StoreItem } from "../store";
import type { BookingRecord } from "../booking-orders";

export interface RunnerItem {
  kind: "session" | "item";
  text: string;
}

export interface RunnerInput {
  items: Pick<StoreItem, "title" | "status">[];
  bookings: Pick<BookingRecord, "serviceTitle" | "startUtc" | "state">[];
  /** injected in tests; the live read defaults to now */
  nowMs?: number;
  /** the foot of a 1920-wide frame holds about this many comfortably */
  limit?: number;
}

export const RUNNER_LIMIT = 8;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const pad2 = (n: number) => String(n).padStart(2, "0");

/** A slot's UTC instant in short broadcast words — deterministic (no Intl
 *  locale risk), and UTC because the OBS browser source has no honest
 *  local clock to speak for. */
export function runnerSlotWords(startUtc: string): string {
  const d = new Date(startUtc);
  if (Number.isNaN(d.getTime())) return "";
  return `${WEEKDAYS[d.getUTCDay()]} ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()} · ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())} UTC`;
}

/** The next confirmed booking strictly ahead of `nowMs`, or null. */
export function nextSession(
  bookings: RunnerInput["bookings"],
  nowMs: number,
): Pick<BookingRecord, "serviceTitle" | "startUtc"> | null {
  const ahead = bookings
    .filter((b) => b.state === "confirmed" && !Number.isNaN(Date.parse(b.startUtc)) && Date.parse(b.startUtc) > nowMs)
    .sort((a, b) => a.startUtc.localeCompare(b.startUtc));
  return ahead[0] ?? null;
}

/** The ONE derivation: next session first (time beats shelf), then the
 *  live items' titles in catalogue order, capped to the frame. Hidden and
 *  sold-out items are excluded — only `live` speaks. */
export function runnerItems(input: RunnerInput): RunnerItem[] {
  const nowMs = input.nowMs ?? Date.now();
  const limit = input.limit ?? RUNNER_LIMIT;
  const out: RunnerItem[] = [];
  const upcoming = nextSession(input.bookings, nowMs);
  if (upcoming) {
    const when = runnerSlotWords(upcoming.startUtc);
    out.push({ kind: "session", text: when ? `Next: ${upcoming.serviceTitle} · ${when}` : `Next: ${upcoming.serviceTitle}` });
  }
  for (const item of input.items) {
    if (item.status !== "live") continue;
    const title = item.title.trim();
    if (title) out.push({ kind: "item", text: title });
  }
  return out.slice(0, Math.max(0, limit));
}

/** The live read: the real catalogue + the booking vault, same derivation. */
export async function loadRunnerItems(nowMs?: number): Promise<RunnerItem[]> {
  const [items, bookings] = await Promise.all([listItems(), listBookings()]);
  return runnerItems({ items, bookings, nowMs });
}
