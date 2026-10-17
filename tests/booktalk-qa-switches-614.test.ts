import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { isolateCwd } from "./helpers/isolate-cwd";
import { normalizeSwitchResponse, readingDayPartsMarksLookup } from "@/components/calendar/reading-marks";
import { DEFAULT_READING_SCHEDULE, readingOccurrencesBetween } from "@/lib/reading-schedule";
import { bftMonthGrid } from "@/lib/calendar-view";
import { zonedDateParts } from "@/lib/booking-time";
import { AGENDA_ROW_TITLES, readingPartHref, type ReadingPart } from "@/lib/reading-parts";
import ReadingDayBody, { type ReadingDayBodyProps } from "@/components/reading/ReadingDayBody";
import ReadingStageDeck from "@/components/reading/ReadingStageDeck";
import { ReadingPartProvider } from "@/components/reading/ReadingPartContext";
import type { ReadingStageProps } from "@/components/reading/ReadingStage";
import type { EncoreFloorDoor, QaDoor } from "@/lib/reading-day-doors";
import type { Tier } from "@/lib/entitlement";

/**
 * TASK-614 - the Book Talk (Part 3) and Q&A (Part 4) switches on
 * /a/site/reading, the TASK-499 Housewarming pattern twice: persisted as
 * `bookTalk` / `qa` on the site-config doc, ABSENT MEANS ON. Pins the
 * sanitize/patch round-trips, the route's refusal in words, the page's
 * source reads, the agenda rows, the deck guards, the calendar pills and
 * the response normalizer. Same harness as housewarming-switch-499.test.ts
 * (isolateCwd, the real operator cookie); the stored doc is reset by
 * moving it aside inside the throwaway cwd, never deleted.
 */
const REPO_ROOT = process.cwd();
const { cleanup: cleanupCwd } = isolateCwd("oc-booktalk-qa-switch-");
const FILE = path.join(process.cwd(), "data", "site-config.json");

let moved = 0;
/** reset the stored doc: move it aside (inside the throwaway cwd) */
async function clearDoc(): Promise<void> {
  try {
    await fs.rename(FILE, `${FILE}.aside-${moved++}`);
  } catch {
    /* nothing stored yet */
  }
}

let getSiteConfig: (typeof import("@/lib/site-config"))["getSiteConfig"];
let saveSiteConfig: (typeof import("@/lib/site-config"))["saveSiteConfig"];
let bookTalkPatchError: (typeof import("@/app/api/admin/site/route"))["bookTalkPatchError"];
let qaPatchError: (typeof import("@/app/api/admin/site/route"))["qaPatchError"];
let sitePUT: (typeof import("@/app/api/admin/site/route"))["PUT"];
let cookie: string;

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SPACE_NAME = "onecocreation";
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.REGISTRY_DRIVER;
  process.env.SEAT_SECRET = "booktalk-qa-switch-test-secret";
  const pk = getPublicKey(generateSecretKey());
  process.env.OPERATOR_NPUBS = nip19.npubEncode(pk);
  const { makeOperatorToken } = await import("@/lib/operator-auth");
  cookie = `fe-operator=${makeOperatorToken(pk)}`;
  await clearDoc();
  ({ getSiteConfig, saveSiteConfig } = await import("@/lib/site-config"));
  ({ PUT: sitePUT, bookTalkPatchError, qaPatchError } = await import("@/app/api/admin/site/route"));
});

afterAll(async () => {
  await clearDoc();
  cleanupCwd();
});

const put = (body: unknown) =>
  sitePUT(new Request("http://localhost/api/admin/site", {
    method: "PUT",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify(body),
  }));

const KEYS = ["bookTalk", "qa"] as const;

describe.each(KEYS)("TASK-614 - the %s switch on the site-config doc (absent means ON)", (key) => {
  it("absent stays undefined and reads ON", async () => {
    await clearDoc();
    const config = await getSiteConfig();
    expect(config[key]).toBeUndefined();
    expect(config[key] !== false).toBe(true);
  });

  it("false and true round-trip through saveSiteConfig", async () => {
    await saveSiteConfig({ [key]: false });
    expect((await getSiteConfig())[key]).toBe(false);
    await saveSiteConfig({ [key]: true });
    expect((await getSiteConfig())[key]).toBe(true);
    await clearDoc();
    await getSiteConfig();
  });

  it("sanitize backstop: a hand-edited non-boolean drops to undefined (reads ON)", async () => {
    await clearDoc();
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify({ [key]: "yes" }), "utf8");
    const config = await getSiteConfig();
    expect(config[key]).toBeUndefined();
    expect(config[key] !== false).toBe(true);
    await clearDoc();
    await getSiteConfig();
  });

  it("PUT a string is refused 400 in words, nothing persisted", async () => {
    await clearDoc();
    const bad = await put({ [key]: "yes" });
    expect(bad.status).toBe(400);
    const badBody = await bad.json();
    expect(badBody.ok).toBe(false);
    expect(badBody.reason).toMatch(/must be true or false/);
    expect((await getSiteConfig())[key]).toBeUndefined();
  });

  it("PUT false saves and reads back; true flips it back", async () => {
    const off = await put({ [key]: false });
    expect(off.status).toBe(200);
    expect((await off.json()).config[key]).toBe(false);
    expect((await getSiteConfig())[key]).toBe(false);
    const on = await put({ [key]: true });
    expect(on.status).toBe(200);
    expect((await getSiteConfig())[key]).toBe(true);
  });

  it("an unrelated PUT leaves a saved false untouched, and the other switches stay independent", async () => {
    await clearDoc();
    await put({ [key]: false });
    const other = await put({ features: { jars: false } });
    expect(other.status).toBe(200);
    const config = await getSiteConfig();
    expect(config[key]).toBe(false);
    const otherKey = key === "qa" ? "bookTalk" : "qa";
    expect(config[otherKey]).toBeUndefined();
    expect(config.housewarming).toBeUndefined();
    await clearDoc();
    await getSiteConfig();
  });

  it("PUT with no operator cookie is 401", async () => {
    const res = await sitePUT(new Request("http://localhost/api/admin/site", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: false }),
    }));
    expect(res.status).toBe(401);
  });
});

describe("TASK-614 - the pure patch errors", () => {
  it("booleans pass, anything else is refused in words", () => {
    for (const fn of [bookTalkPatchError, qaPatchError]) {
      expect(fn(true)).toBeNull();
      expect(fn(false)).toBeNull();
      expect(fn("yes")).toMatch(/must be true or false/);
      expect(fn(1)).toMatch(/must be true or false/);
      expect(fn(null)).toMatch(/must be true or false/);
    }
  });
});

describe("TASK-614 - source pins (the reads, the omissions, the neutralization)", () => {
  const read = (rel: string) => fs.readFile(path.join(REPO_ROOT, rel), "utf8");

  it("the page reads both switches as !== false", async () => {
    const src = await read("src/app/reading/page.tsx");
    expect(src).toContain("const bookTalkOn = config.bookTalk !== false;");
    expect(src).toContain("const qaOn = config.qa !== false;");
  });

  it("a switched-off part has a null start and drops out of the doors", async () => {
    const src = await read("src/app/reading/page.tsx");
    expect(src).toContain("const encoreStartsAtMs = bookTalkOn && next ?");
    expect(src).toContain("const qaStartsAtMs = qaOn && next ?");
    expect(src).toContain("...(encoreStartsAtMs !== null && stage2State");
    expect(src).toContain("...(qaStartsAtMs !== null");
  });

  it("?part=3 and ?part=4 deep links are neutralized when off", async () => {
    const src = await read("src/app/reading/page.tsx");
    expect(src).toContain("if (!bookTalkOn && requestedPart === 3) requestedPart = null;");
    expect(src).toContain("if (!qaOn && requestedPart === 4) requestedPart = null;");
  });

  it("the deck gets part3On / part4On and the discussion li goes with the Book Talk", async () => {
    const src = await read("src/app/reading/page.tsx");
    expect(src).toContain("part3On={bookTalkOn}");
    expect(src).toContain("part4On={qaOn}");
    expect(src).toMatch(/\{bookTalkOn && \(\s*<li>\{`Join the discussion after/);
  });

  it("ReadingDay reads the same flags and passes null when off", async () => {
    const src = await read("src/components/reading/ReadingDay.tsx");
    expect(src).toContain("const bookTalkOn = config.bookTalk !== false;");
    expect(src).toContain("const qaOn = config.qa !== false;");
    expect(src).toContain("bookTalkOn ? sameDayAt(next.startsAtMs, schedule.tz, ENCORE_TIME) : null");
    expect(src).toContain("qaOn ? sameDayAt(next.startsAtMs, schedule.tz, QA_TIME) : null");
  });
});

/* ---- ReadingDayBody ---- */

const TZ = "America/Denver";
const READING_MS = Date.parse("2026-09-23T19:11:00.000Z");
const ENCORE_MS = Date.parse("2026-09-23T20:22:00.000Z");
const QA_MS = Date.parse("2026-09-23T21:33:00.000Z");
const HOUSEWARMING_MS = Date.parse("2026-09-23T18:12:00.000Z");

const ENCORE_FLOOR: EncoreFloorDoor = { tier: "A" as Tier, name: "Weekly Intuitive", itemId: "weekly-intuitive", href: "/packages/weekly-intuitive", price: "$33", passLive: false };
const QA_OFFER: QaDoor = { itemId: "q-a-meetup-with-love", passLive: true, price: "$33.33", eveningStar: { name: "Evening Star", price: "$111", href: "/packages/evening-star" } };

function bodyProps(overrides: Partial<ReadingDayBodyProps>): ReadingDayBodyProps {
  return {
    tz: TZ,
    housewarmingStartsAtMs: HOUSEWARMING_MS,
    readingStartsAtMs: READING_MS,
    encoreStartsAtMs: ENCORE_MS,
    qaStartsAtMs: QA_MS,
    signedIn: false,
    encoreEntitled: false,
    encoreFloor: ENCORE_FLOOR,
    qaEntitled: false,
    qaOffer: QA_OFFER,
    ...overrides,
  };
}
const renderBody = (p: ReadingDayBodyProps): string => renderToStaticMarkup(createElement(ReadingDayBody, p));

describe("TASK-614 - ReadingDayBody with a null start", () => {
  it("Book Talk off: three rows, no Book Talk word, no unlock button for it, the Q&A stays", () => {
    const html = renderBody(bodyProps({ encoreStartsAtMs: null }));
    expect(html.match(/<li>/g) ?? []).toHaveLength(3);
    expect(html).not.toContain("Book Talk");
    expect(html).toContain("The Q&amp;A with Love");
  });

  it("Q&A off: three rows, no Q&A word, no unlock button for it, the Book Talk stays", () => {
    const html = renderBody(bodyProps({ qaStartsAtMs: null }));
    expect(html.match(/<li>/g) ?? []).toHaveLength(3);
    expect(html).not.toContain("Q&amp;A");
    expect(html).toContain("The Book Talk");
  });

  it("both off: only the Housewarming and the Reading remain", () => {
    const html = renderBody(bodyProps({ encoreStartsAtMs: null, qaStartsAtMs: null }));
    expect(html.match(/<li>/g) ?? []).toHaveLength(2);
    expect(html).not.toContain("Book Talk");
    expect(html).not.toContain("Q&amp;A");
  });

  it("both off, buy-ahead card: no rows at all", () => {
    const html = renderBody(bodyProps({ encoreStartsAtMs: null, qaStartsAtMs: null, ahead: true }));
    expect(html.match(/<li>/g) ?? []).toHaveLength(0);
  });

  it("with the props set, today's four rows stand", () => {
    expect(renderBody(bodyProps({})).match(/<li>/g) ?? []).toHaveLength(4);
  });
});

/* ---- the deck ---- */

const DOMAIN = "meet.booktalk-qa-switch-fixture.invalid";
const STAGE1: ReadingStageProps = {
  initialPhase: "closed",
  signedIn: true,
  next: null,
  following: null,
  scheduleTz: TZ,
  jitsiDomain: DOMAIN,
  countdown: null,
  countdownWhen: null,
  playgroundLock: { locked: false, floorName: "Test Tier" },
  housewarmingLabel: "12:12 PM MDT · The Housewarming",
  readingLabel: "1:11 PM MDT · The Reading",
};

function deck(defaultPart: ReadingPart, extra: { part3On?: boolean; part4On?: boolean }): string {
  return renderToStaticMarkup(
    createElement(
      ReadingPartProvider,
      { defaultPart },
      createElement(ReadingStageDeck, {
        stage1: STAGE1,
        part1: { jitsiDomain: DOMAIN, whenWords: "12:12 PM MDT" },
        part3: { jitsiDomain: DOMAIN, encoreFloor: ENCORE_FLOOR, whenWords: "2:22 PM MDT" },
        part4: { jitsiDomain: DOMAIN, qaOffer: QA_OFFER, whenWords: "3:33 PM MDT" },
        ...extra,
      }),
    ),
  );
}

describe("TASK-614 - the deck guards (a stale selection can never mount a hidden part)", () => {
  it("part3On={false} with selection 3 renders Part 2's screen", () => {
    const html = deck(3, { part3On: false });
    expect(html).toContain("The reading is live to watch, free.");
    expect((html.match(/class="kit-stage[" ]/g) ?? []).length).toBe(1);
  });

  it("part4On={false} with selection 4 renders Part 2's screen", () => {
    const html = deck(4, { part4On: false });
    expect(html).toContain("The reading is live to watch, free.");
    expect((html.match(/class="kit-stage[" ]/g) ?? []).length).toBe(1);
  });

  it("defaults (both on) keep selection 3 and 4 on their own screens", () => {
    expect(deck(3, {})).not.toContain("The reading is live to watch, free.");
    expect(deck(4, {})).not.toContain("The reading is live to watch, free.");
  });
});

/* ---- the calendar ---- */

const NOW = Date.parse("2026-09-01T00:00:00Z");
function readingCell() {
  const cell = bftMonthGrid(18, 6, { nowMs: NOW }).cells.find(
    (c) => c.civilDate.getUTCDay() === DEFAULT_READING_SCHEDULE.weekday,
  );
  if (!cell) throw new Error("no matching cell in the fixture grid");
  return cell;
}

describe("TASK-614 - readingDayPartsMarksLookup follows the flags", () => {
  const cell = readingCell();
  const labels = (hw: boolean, bt: boolean, qa: boolean) =>
    (readingDayPartsMarksLookup(DEFAULT_READING_SCHEDULE, hw, bt, qa)(cell)?.pills ?? []).map((p) => p.label);

  it("Book Talk off: no Book Talk pill, the others stay linked", () => {
    const marks = readingDayPartsMarksLookup(DEFAULT_READING_SCHEDULE, true, false, true)(cell);
    expect(marks?.pills).toHaveLength(3);
    expect(labels(true, false, true).some((l) => l.includes(AGENDA_ROW_TITLES[3]))).toBe(false);
    expect(marks!.pills!.every((p) => p.href?.startsWith("/reading?part="))).toBe(true);
  });

  it("Q&A off: no Q&A pill", () => {
    expect(labels(true, true, false)).toHaveLength(3);
    expect(labels(true, true, false).some((l) => l.includes(AGENDA_ROW_TITLES[4]))).toBe(false);
  });

  it("both off: Housewarming and Reading only; all off: Reading alone", () => {
    expect(labels(true, false, false)).toHaveLength(2);
    const only = readingDayPartsMarksLookup(DEFAULT_READING_SCHEDULE, false, false, false)(cell);
    expect(only?.pills).toHaveLength(1);
    expect(only!.pills![0].href).toBe(readingPartHref(2));
  });

  it("omitted flags keep today's four pills", () => {
    expect(readingDayPartsMarksLookup(DEFAULT_READING_SCHEDULE)(cell)?.pills).toHaveLength(4);
  });

  it("the occurrence anchor is still the schedule's own civil day", () => {
    const netFrom = cell.civilDate.getTime() - 86_400_000;
    const netTo = cell.civilDate.getTime() + 2 * 86_400_000;
    const occ = readingOccurrencesBetween(DEFAULT_READING_SCHEDULE, netFrom, netTo).find(
      (o) => zonedDateParts(new Date(o.startsAtMs), DEFAULT_READING_SCHEDULE.tz).date === cell.civilKey,
    );
    expect(occ).toBeTruthy();
  });
});

describe("TASK-614 - normalizeSwitchResponse (every failure mode reads ON)", () => {
  it.each(KEYS)("%s: a saved false reads OFF; true and absent read ON", (key) => {
    expect(normalizeSwitchResponse(200, { ok: true, config: { [key]: false } }, key)).toBe(false);
    expect(normalizeSwitchResponse(200, { ok: true, config: { [key]: true } }, key)).toBe(true);
    expect(normalizeSwitchResponse(200, { ok: true, config: {} }, key)).toBe(true);
  });

  it.each(KEYS)("%s: malformed values, a non-ok body and a failed fetch all read ON", (key) => {
    expect(normalizeSwitchResponse(200, { ok: true, config: { [key]: "no" } }, key)).toBe(true);
    expect(normalizeSwitchResponse(200, { ok: false }, key)).toBe(true);
    expect(normalizeSwitchResponse(500, null, key)).toBe(true);
    expect(normalizeSwitchResponse(200, null, key)).toBe(true);
  });

  it("one switch off never reads another off", () => {
    const body = { ok: true, config: { bookTalk: false } };
    expect(normalizeSwitchResponse(200, body, "bookTalk")).toBe(false);
    expect(normalizeSwitchResponse(200, body, "qa")).toBe(true);
    expect(normalizeSwitchResponse(200, body, "housewarming")).toBe(true);
  });
});
