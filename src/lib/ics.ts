/**
 * iCalendar (RFC 5545) generation — the booking confirmation a customer can
 * actually keep (spec: docs/booking-flow.md §6).
 *
 * Why this is the highest-value piece in the booking spec: a VALARM inside
 * the file means the CUSTOMER'S OWN DEVICE reminds them an hour before. It
 * works in Google Calendar, Apple Calendar and Outlook with no OAuth, no API
 * key and no integration — so the reminder feature exists before the house
 * has sent a single email.
 *
 * Dependency-free and pure, like booking-time.ts, so the format can be tested
 * without a server. RFC 5545 is fussy in three specific ways and all three
 * are handled below: CRLF line endings, folding at 75 octets, and escaping
 * inside TEXT values.
 */

export interface IcsEvent {
  /** stable across updates — the booking id; re-issues must reuse it */
  uid: string;
  startUtc: string; // ISO
  endUtc: string; // ISO
  summary: string;
  description?: string;
  /** the meeting link — calendar apps make LOCATION actionable */
  location?: string;
  /** the receipt page */
  url?: string;
  organizer?: { name: string; email?: string };
  /**
   * TENTATIVE until paid, CONFIRMED once settled, CANCELLED when released.
   * A calendar that already holds this UID will UPDATE in place rather than
   * duplicate — which is why `sequence` must climb with each state change.
   */
  status: "TENTATIVE" | "CONFIRMED" | "CANCELLED";
  sequence: number;
  /** minutes before start to fire the device's own reminder */
  alarmMinutesBefore?: number;
  /** injectable so tests are deterministic */
  stampMs?: number;
}

/** RFC 5545 §3.3.5 — UTC date-time, the only form with no ambiguity. */
function toIcsUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new Error("ics: bad date");
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * RFC 5545 §3.3.11 — inside a TEXT value, backslash, semicolon and comma are
 * structural and must be escaped, and a literal newline becomes \n. Getting
 * this wrong is how a description containing a comma silently truncates an
 * event in someone's calendar.
 */
function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * RFC 5545 §3.1 — content lines are folded at 75 OCTETS (not characters) by
 * inserting CRLF and a leading space. The octet distinction matters: folding
 * mid-way through a multi-byte character produces a corrupt file, so this
 * measures UTF-8 length and only ever breaks on a character boundary.
 */
function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;

  const out: string[] = [];
  let current = "";
  let bytes = 0;
  let limit = 75;

  for (const ch of line) {
    const size = enc.encode(ch).length;
    if (bytes + size > limit) {
      out.push(current);
      current = ch;
      bytes = size;
      limit = 74; // continuation lines carry a leading space
    } else {
      current += ch;
      bytes += size;
    }
  }
  out.push(current);
  return out.join("\r\n ");
}

export function buildIcs(ev: IcsEvent): string {
  const stamp = toIcsUtc(new Date(ev.stampMs ?? Date.now()).toISOString());

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//frens.earth//booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${ev.uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${toIcsUtc(ev.startUtc)}`,
    `DTEND:${toIcsUtc(ev.endUtc)}`,
    `SUMMARY:${escapeText(ev.summary)}`,
    `STATUS:${ev.status}`,
    `SEQUENCE:${ev.sequence}`,
    "TRANSP:OPAQUE",
  ];

  if (ev.description) lines.push(`DESCRIPTION:${escapeText(ev.description)}`);
  if (ev.location) lines.push(`LOCATION:${escapeText(ev.location)}`);
  if (ev.url) lines.push(`URL:${ev.url}`);
  // ORGANIZER's value is a CAL-ADDRESS — it needs a real mailto. With no
  // address for the host we omit the property entirely rather than emit a
  // fabricated one; a customer should never see "noreply@invalid" sitting in
  // their calendar. The host's name still rides in SUMMARY and DESCRIPTION.
  if (ev.organizer?.email) {
    const cn = ev.organizer.name.replace(/["\\;:,]/g, "");
    lines.push(`ORGANIZER;CN="${cn}":mailto:${ev.organizer.email}`);
  }

  // The whole point — the customer's device reminds them, unaided.
  // A cancelled event gets no alarm; nothing should buzz about a dead booking.
  if (ev.alarmMinutesBefore && ev.status !== "CANCELLED") {
    lines.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `TRIGGER:-PT${Math.round(ev.alarmMinutesBefore)}M`,
      `DESCRIPTION:${escapeText(ev.summary)}`,
      "END:VALARM",
    );
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  // CRLF throughout, and a trailing CRLF — both required by the spec and both
  // things lenient parsers forgive right up until one doesn't.
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** A filename a human recognizes in their downloads folder. */
export function icsFilename(summary: string, startUtc: string): string {
  const slug = summary.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return `${slug || "booking"}-${toIcsUtc(startUtc).slice(0, 8)}.ics`;
}
