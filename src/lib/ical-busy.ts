/**
 * iCal BUSY SYNC (Admiral, 0018.05.14): Love pastes her calendar's secret
 * iCal address; its events become busy windows that vanish from every
 * public slot board — the manual "I booked something elsewhere" override,
 * automated.
 *
 * Honest scope: single events plus DAILY/WEEKLY repeats (INTERVAL, BYDAY,
 * UNTIL, COUNT). Fancier recurrences (monthly-by-position, EXDATE) are
 * SKIPPED and counted, and the admin panel says so out loud — a silently
 * half-synced calendar would be worse than none.
 *
 * The feed is cached ten minutes in the vault so the public slot board
 * never waits on a third-party fetch storm.
 */

export interface BusyWindow {
  startMs: number;
  endMs: number;
}

export interface BusyFeed {
  windows: BusyWindow[];
  skippedRecurring: number;
  fetchedAtMs: number;
  error?: string;
}

/* ── the vault (same REST driver as everywhere) ─────────────────────────── */

const CACHE_KEY = "booking:icalbusy";
const CACHE_S = 600;

function restEnv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

async function kv(cmd: unknown[]): Promise<unknown> {
  const rest = restEnv();
  if (!rest) return null;
  const res = await fetch(rest.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${rest.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) return null;
  return ((await res.json()) as { result: unknown }).result;
}

/* ── wall clock in a zone → UTC ms (two-pass Intl offset fix) ───────────── */

function tzOffsetMs(tz: string, utcMs: number): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23",
  });
  const p = Object.fromEntries(dtf.formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - utcMs;
}

function wallToUtcMs(y: number, mo: number, d: number, h: number, mi: number, s: number, tz: string): number {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  const off1 = tzOffsetMs(tz, guess);
  const off2 = tzOffsetMs(tz, guess - off1);
  return guess - off2;
}

/* ── the parser ─────────────────────────────────────────────────────────── */

interface DtValue {
  ms: number;
  allDay: boolean;
}

function parseDt(prop: string): DtValue | null {
  // "DTSTART;TZID=America/Denver:20260805T110000" | "DTSTART:20260805T170000Z"
  // | "DTSTART;VALUE=DATE:20260805"
  const at = prop.indexOf(":");
  if (at < 0) return null;
  const params = prop.slice(0, at);
  const value = prop.slice(at + 1).trim();
  const tzid = /TZID=([^;:]+)/.exec(params)?.[1];

  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    return { ms: Date.UTC(+y, +m - 1, +d), allDay: true };
  }
  const full = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(value);
  if (!full) return null;
  const [, y, m, d, h, mi, s, z] = full;
  if (z === "Z") return { ms: Date.UTC(+y, +m - 1, +d, +h, +mi, +s), allDay: false };
  if (tzid) {
    try {
      return { ms: wallToUtcMs(+y, +m, +d, +h, +mi, +s, tzid), allDay: false };
    } catch {
      return null; // unknown zone — better skipped than wrong
    }
  }
  // floating time — read as UTC, the least-wrong choice
  return { ms: Date.UTC(+y, +m - 1, +d, +h, +mi, +s), allDay: false };
}

const WEEKDAY: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
const DAY_MS = 24 * 3600 * 1000;

export function parseIcsBusy(
  ics: string,
  horizonStartMs: number,
  horizonEndMs: number,
): { windows: BusyWindow[]; skippedRecurring: number } {
  // unfold (CRLF + leading space/tab = continuation)
  const lines = ics.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").split(/\r?\n/);
  const windows: BusyWindow[] = [];
  let skippedRecurring = 0;

  let inEvent = false;
  let dtstart: DtValue | null = null;
  let dtend: DtValue | null = null;
  let rrule: string | null = null;
  let transparent = false;

  const flush = () => {
    if (!dtstart) return;
    const durMs = dtend
      ? Math.max(dtend.ms - dtstart.ms, dtstart.allDay ? DAY_MS : 0)
      : dtstart.allDay ? DAY_MS : 30 * 60_000;
    if (transparent) return; // marked free — not busy

    if (!rrule) {
      const endMs = dtstart.ms + durMs;
      if (endMs > horizonStartMs && dtstart.ms < horizonEndMs) {
        windows.push({ startMs: dtstart.ms, endMs });
      }
      return;
    }

    const freq = /FREQ=([A-Z]+)/.exec(rrule)?.[1];
    if (freq !== "DAILY" && freq !== "WEEKLY") {
      skippedRecurring++;
      return;
    }
    const interval = Number(/INTERVAL=(\d+)/.exec(rrule)?.[1] ?? 1);
    const count = Number(/COUNT=(\d+)/.exec(rrule)?.[1] ?? 0);
    const untilRaw = /UNTIL=([0-9TZ]+)/.exec(rrule)?.[1];
    const until = untilRaw ? (parseDt(`X:${untilRaw}`)?.ms ?? horizonEndMs) : horizonEndMs;
    const bydays = (/BYDAY=([A-Z,]+)/.exec(rrule)?.[1] ?? "")
      .split(",")
      .map((d) => WEEKDAY[d])
      .filter((n) => n !== undefined);

    const stepMs = (freq === "DAILY" ? 1 : 7) * interval * DAY_MS;
    let made = 0;
    // walk day-by-day inside each period so WEEKLY;BYDAY=MO,WE lands right
    for (let base = dtstart.ms; base <= Math.min(until, horizonEndMs) && made < (count || 500) && made < 500; base += stepMs) {
      const daySpan = freq === "WEEKLY" && bydays.length > 0 ? 7 : 1;
      for (let d = 0; d < daySpan; d++) {
        const occ = base + d * DAY_MS;
        if (occ > Math.min(until, horizonEndMs)) break;
        if (freq === "WEEKLY" && bydays.length > 0 && !bydays.includes(new Date(occ).getUTCDay())) continue;
        made++;
        if (count && made > count) break;
        const endMs = occ + durMs;
        if (endMs > horizonStartMs && occ < horizonEndMs) windows.push({ startMs: occ, endMs });
      }
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      dtstart = dtend = null;
      rrule = null;
      transparent = false;
    } else if (line === "END:VEVENT") {
      if (inEvent) flush();
      inEvent = false;
    } else if (inEvent) {
      if (line.startsWith("DTSTART")) dtstart = parseDt(line);
      else if (line.startsWith("DTEND")) dtend = parseDt(line);
      else if (line.startsWith("RRULE:")) rrule = line.slice(6);
      else if (line === "TRANSP:TRANSPARENT") transparent = true;
    }
  }

  windows.sort((a, b) => a.startMs - b.startMs);
  return { windows, skippedRecurring };
}

/* ── the cached feed ────────────────────────────────────────────────────── */

const HORIZON_DAYS = 90;

/** The busy windows for the next ~90 days, cached 10 min. No URL = empty. */
export async function busyFeed(icalUrl: string | undefined, force = false): Promise<BusyFeed> {
  if (!icalUrl?.trim()) return { windows: [], skippedRecurring: 0, fetchedAtMs: 0 };

  if (!force) {
    const cached = (await kv(["GET", CACHE_KEY])) as string | null;
    if (cached) {
      try {
        const feed = JSON.parse(cached) as BusyFeed & { url?: string };
        if (feed.url === icalUrl) return feed;
      } catch { /* stale junk — refetch */ }
    }
  }

  try {
    const res = await fetch(icalUrl, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`calendar answered ${res.status}`);
    const now = Date.now();
    const { windows, skippedRecurring } = parseIcsBusy(
      await res.text(),
      now - DAY_MS,
      now + HORIZON_DAYS * DAY_MS,
    );
    const feed: BusyFeed = { windows, skippedRecurring, fetchedAtMs: now };
    await kv(["SET", CACHE_KEY, JSON.stringify({ ...feed, url: icalUrl }), "EX", String(CACHE_S)]);
    return feed;
  } catch (err) {
    return {
      windows: [],
      skippedRecurring: 0,
      fetchedAtMs: 0,
      error: err instanceof Error ? err.message : "calendar unreachable",
    };
  }
}

/** Drop every slot that overlaps a busy window. */
export function subtractBusy<T extends { startUtc: string; endUtc: string }>(
  slots: T[],
  busy: BusyWindow[],
): T[] {
  if (busy.length === 0) return slots;
  return slots.filter((s) => {
    const a = Date.parse(s.startUtc);
    const b = Date.parse(s.endUtc);
    return !busy.some((w) => a < w.endMs && b > w.startMs);
  });
}
