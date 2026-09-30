import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { isolateCwd } from "./helpers/isolate-cwd";
import { normalizeHousewarmingResponse, readingDayPartsMarksLookup } from "@/components/calendar/reading-marks";
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
 * TASK-499 (block 969,306+; K126 AMENDMENT 1 item 9 — the Admiral: "Move
 * the countdown off the housewarming") — the week without a Housewarming.
 * One operator switch on /a/site/reading, persisted as `housewarming` on
 * the site-config doc (ABSENT MEANS ON). This suite pins:
 *  · sanitize/patch round-trips (absent stays undefined; false/true ride;
 *    garbage drops to undefined) and the route's refusal IN WORDS;
 *  · the page's own source pins (the switch read, the off-branch
 *    countdown target, the part-1 omission, the ?part=1 neutralization);
 *  · ReadingDayBody with housewarmingStartsAtMs: null renders three rows,
 *    the first titled The Reading, no Housewarming word;
 *  · the deck with part1On={false} and selection 1 falls through to
 *    Part 2's screen, never Part 1's;
 *  · the calendar lookup drops the part-1 pill when the flag is false;
 *  · normalizeHousewarmingResponse reads ON in every failure mode.
 *
 * The fs site-config driver rides this file's own throwaway cwd (the
 * isolateCwd idiom from site-config.test.ts / about-playlist.test.ts);
 * the operator cookie is minted with the real makeOperatorToken.
 */

/* The repo root must be captured BEFORE isolateCwd chdirs — the source
   pins below read real files from the worktree, never from the throwaway
   cwd the site-config fs driver rides. */
const REPO_ROOT = process.cwd();
const { cleanup: cleanupCwd } = isolateCwd("oc-housewarming-switch-");

const FILE = path.join(process.cwd(), "data", "site-config.json");

let getSiteConfig: (typeof import("@/lib/site-config"))["getSiteConfig"];
let saveSiteConfig: (typeof import("@/lib/site-config"))["saveSiteConfig"];
let housewarmingPatchError: (typeof import("@/app/api/admin/site/route"))["housewarmingPatchError"];
let sitePUT: (typeof import("@/app/api/admin/site/route"))["PUT"];
let cookie: string;

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SPACE_NAME = "onecocreation";
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.REGISTRY_DRIVER;
  process.env.SEAT_SECRET = "housewarming-switch-test-secret";
  const pk = getPublicKey(generateSecretKey());
  process.env.OPERATOR_NPUBS = nip19.npubEncode(pk);
  const { makeOperatorToken } = await import("@/lib/operator-auth");
  cookie = `fe-operator=${makeOperatorToken(pk)}`;
  await fs.rm(FILE, { force: true });
  ({ getSiteConfig, saveSiteConfig } = await import("@/lib/site-config"));
  ({ PUT: sitePUT, housewarmingPatchError } = await import("@/app/api/admin/site/route"));
});

afterAll(async () => {
  await fs.rm(FILE, { force: true });
  cleanupCwd();
});

const put = (body: unknown) =>
  sitePUT(new Request("http://localhost/api/admin/site", {
    method: "PUT",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify(body),
  }));

describe("TASK-499 — the switch on the site-config doc (absent means ON)", () => {
  it("absent stays undefined — every stored doc in production is already valid", async () => {
    await fs.rm(FILE, { force: true });
    const config = await getSiteConfig();
    expect(config.housewarming).toBeUndefined();
    // the exact read /reading and the calendar make
    expect(config.housewarming !== false).toBe(true);
  });

  it("false and true round-trip through saveSiteConfig", async () => {
    await saveSiteConfig({ housewarming: false });
    expect((await getSiteConfig()).housewarming).toBe(false);
    await saveSiteConfig({ housewarming: true });
    expect((await getSiteConfig()).housewarming).toBe(true);
    await fs.rm(FILE, { force: true });
    await getSiteConfig();
  });

  it("sanitize backstop: a hand-edited non-boolean drops to undefined (reads ON, never silently hidden)", async () => {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify({ housewarming: "yes" }), "utf8");
    const config = await getSiteConfig();
    expect(config.housewarming).toBeUndefined();
    expect(config.housewarming !== false).toBe(true);
    await fs.rm(FILE, { force: true });
    await getSiteConfig();
  });
});

describe("TASK-499 — the route: refusal IN WORDS, operator gate, no erasure by an unrelated save", () => {
  it("housewarmingPatchError: booleans pass, anything else is refused in words", () => {
    expect(housewarmingPatchError(true)).toBeNull();
    expect(housewarmingPatchError(false)).toBeNull();
    expect(housewarmingPatchError("yes")).toMatch(/must be true or false/);
    expect(housewarmingPatchError(1)).toMatch(/must be true or false/);
    expect(housewarmingPatchError(null)).toMatch(/must be true or false/);
  });

  it("PUT { housewarming: \"yes\" } is refused 400 IN WORDS, and nothing was persisted", async () => {
    await fs.rm(FILE, { force: true });
    const bad = await put({ housewarming: "yes" });
    expect(bad.status).toBe(400);
    const badBody = await bad.json();
    expect(badBody.ok).toBe(false);
    expect(badBody.reason).toMatch(/must be true or false/);
    expect((await getSiteConfig()).housewarming).toBeUndefined();
  });

  it("PUT { housewarming: false } saves and reads back (and true flips it back)", async () => {
    const off = await put({ housewarming: false });
    expect(off.status).toBe(200);
    const offBody = await off.json();
    expect(offBody.ok).toBe(true);
    expect(offBody.config.housewarming).toBe(false);
    expect((await getSiteConfig()).housewarming).toBe(false);

    const on = await put({ housewarming: true });
    expect(on.status).toBe(200);
    expect((await getSiteConfig()).housewarming).toBe(true);
  });

  it("PUT with no operator cookie is 401", async () => {
    const res = await sitePUT(new Request("http://localhost/api/admin/site", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ housewarming: false }),
    }));
    expect(res.status).toBe(401);
  });

  it("an unrelated PUT (features-only) leaves a saved false untouched", async () => {
    await put({ housewarming: false });
    expect((await getSiteConfig()).housewarming).toBe(false);
    const other = await put({ features: { jars: false } });
    expect(other.status).toBe(200);
    const config = await getSiteConfig();
    expect(config.housewarming).toBe(false);
    expect(config.features.jars).toBe(false);
    await fs.rm(FILE, { force: true });
    await getSiteConfig();
  });
});

describe("TASK-499 — the page's own source pins (the switch read, the off branch, the omission, the neutralization)", () => {
  const read = (rel: string) => fs.readFile(path.join(REPO_ROOT, rel), "utf8");

  it("the switch is read once as config.housewarming !== false (absent means ON)", async () => {
    const src = await read("src/app/reading/page.tsx");
    expect(src).toContain("const housewarmingOn = config.housewarming !== false;");
  });

  it("the off-branch countdown target is the reading's own next, through the same topCountdownUntilMs", async () => {
    const src = await read("src/app/reading/page.tsx");
    expect(src).toContain(
      "countdownUntilMs={housewarmingOn ? topCountdownUntilMs(housewarmingNext, asOfMs) : topCountdownUntilMs(next, asOfMs)}",
    );
  });

  it("the doors array omits part 1 when the switch is off", async () => {
    const src = await read("src/app/reading/page.tsx");
    expect(src).toContain("...(housewarmingStartsAtMs !== null");
    expect(src).toContain("if (housewarmingOn) {");
  });

  it("a ?part=1 deep link is neutralized when the switch is off", async () => {
    const src = await read("src/app/reading/page.tsx");
    expect(src).toContain("if (!housewarmingOn && requestedPart === 1) requestedPart = null;");
  });

  it("ReadingDay reads the same flag and passes null when off", async () => {
    const src = await read("src/components/reading/ReadingDay.tsx");
    expect(src).toContain("const housewarmingOn = config.housewarming !== false;");
    expect(src).toContain("housewarmingOn ? sameDayAt(next.startsAtMs, schedule.tz, HOUSEWARMING_TIME) : null");
  });
});

/* ---- ReadingDayBody: three rows when off, four when on ---- */

const TZ = "America/Denver";
const READING_MS = Date.parse("2026-09-23T19:11:00.000Z"); // 1:11 PM MDT
const ENCORE_MS = Date.parse("2026-09-23T20:22:00.000Z"); // 2:22 PM MDT
const QA_MS = Date.parse("2026-09-23T21:33:00.000Z"); // 3:33 PM MDT
const HOUSEWARMING_MS = Date.parse("2026-09-23T18:12:00.000Z"); // 12:12 PM MDT

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

describe("TASK-499 — ReadingDayBody with housewarmingStartsAtMs: null", () => {
  it("renders three rows, the first titled The Reading, no Housewarming word anywhere", () => {
    const html = renderBody(bodyProps({ housewarmingStartsAtMs: null }));
    const rows = html.match(/<li>/g) ?? [];
    expect(rows).toHaveLength(3);
    const first = html.slice(html.indexOf("<li"), html.indexOf("</li>"));
    expect(first).toContain("The Reading");
    expect(html).not.toContain("Housewarming");
  });

  it("with the prop set, today's four rows stand (the Housewarming first)", () => {
    const html = renderBody(bodyProps({}));
    const rows = html.match(/<li>/g) ?? [];
    expect(rows).toHaveLength(4);
    const first = html.slice(html.indexOf("<li"), html.indexOf("</li>"));
    expect(first).toContain("The Housewarming");
  });
});

/* ---- the deck: part1On={false} falls through to Part 2's screen ---- */

const DOMAIN = "meet.housewarming-switch-fixture.invalid";
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

describe("TASK-499 — the deck's part1On guard (a stale selection of 1 can never mount Part 1)", () => {
  it("part1On={false} with selection 1 renders Part 2's screen, never 'The Housewarming is not live yet.'", () => {
    const html = renderToStaticMarkup(
      createElement(
        ReadingPartProvider,
        { defaultPart: 1 },
        createElement(ReadingStageDeck, {
          stage1: STAGE1,
          part1: { jitsiDomain: DOMAIN, whenWords: "12:12 PM MDT" },
          part3: { jitsiDomain: DOMAIN, encoreFloor: ENCORE_FLOOR, whenWords: "2:22 PM MDT" },
          part4: { jitsiDomain: DOMAIN, qaOffer: QA_OFFER, whenWords: "3:33 PM MDT" },
          part1On: false,
        }),
      ),
    );
    expect(html).not.toContain("The Housewarming is not live yet.");
    expect(html).toContain("The reading is live to watch, free.");
    // exactly one screen still mounts
    expect((html.match(/class="kit-stage[" ]/g) ?? []).length).toBe(1);
  });

  it("part1On omitted (default true) keeps today's behavior: selection 1 is Part 1's own screen", () => {
    const html = renderToStaticMarkup(
      createElement(
        ReadingPartProvider,
        { defaultPart: 1 },
        createElement(ReadingStageDeck, {
          stage1: STAGE1,
          part1: { jitsiDomain: DOMAIN, whenWords: "12:12 PM MDT" },
          part3: { jitsiDomain: DOMAIN, encoreFloor: ENCORE_FLOOR, whenWords: "2:22 PM MDT" },
          part4: { jitsiDomain: DOMAIN, qaOffer: QA_OFFER, whenWords: "3:33 PM MDT" },
        }),
      ),
    );
    expect(html).toContain("The Housewarming is not live yet.");
  });
});

/* ---- the calendar lookup ---- */

const NOW = Date.parse("2026-09-01T00:00:00Z");

function readingCell() {
  const cell = bftMonthGrid(18, 6, { nowMs: NOW }).cells.find(
    (c) => c.civilDate.getUTCDay() === DEFAULT_READING_SCHEDULE.weekday,
  );
  if (!cell) throw new Error("no matching cell in the fixture grid");
  return cell;
}

describe("TASK-499 — readingDayPartsMarksLookup follows the flag", () => {
  const cell = readingCell();

  it("flag false: three pills — Reading, Book Talk, Q&A with Love, in order, each linked", () => {
    const marks = readingDayPartsMarksLookup(DEFAULT_READING_SCHEDULE, false)(cell);
    expect(marks?.pills).toHaveLength(3);
    const parts: ReadingPart[] = [2, 3, 4];
    parts.forEach((part, i) => {
      expect(marks!.pills![i].label).toContain(AGENDA_ROW_TITLES[part]);
      expect(marks!.pills![i].href).toBe(readingPartHref(part));
    });
    expect(marks!.pills!.some((p) => p.label.includes(AGENDA_ROW_TITLES[1]))).toBe(false);
  });

  it("flag true (and omitted): today's four pills stand", () => {
    const on = readingDayPartsMarksLookup(DEFAULT_READING_SCHEDULE, true)(cell);
    const bare = readingDayPartsMarksLookup(DEFAULT_READING_SCHEDULE)(cell);
    expect(on?.pills).toHaveLength(4);
    expect(bare?.pills).toHaveLength(4);
    expect(on!.pills![0].label).toContain(AGENDA_ROW_TITLES[1]);
  });

  it("the occurrence anchor is still the schedule's own civil day (the UTC-day trap stays shut)", () => {
    const netFrom = cell.civilDate.getTime() - 86_400_000;
    const netTo = cell.civilDate.getTime() + 2 * 86_400_000;
    const occ = readingOccurrencesBetween(DEFAULT_READING_SCHEDULE, netFrom, netTo).find(
      (o) => zonedDateParts(new Date(o.startsAtMs), DEFAULT_READING_SCHEDULE.tz).date === cell.civilKey,
    );
    expect(occ).toBeTruthy();
  });
});

/* ---- normalizeHousewarmingResponse: every failure mode reads ON ---- */

describe("TASK-499 — normalizeHousewarmingResponse (the calendar failing to learn the switch never hides a part)", () => {
  it("a saved false reads OFF; true and absent read ON", () => {
    expect(normalizeHousewarmingResponse(200, { ok: true, config: { housewarming: false } })).toBe(false);
    expect(normalizeHousewarmingResponse(200, { ok: true, config: { housewarming: true } })).toBe(true);
    expect(normalizeHousewarmingResponse(200, { ok: true, config: {} })).toBe(true);
  });

  it("malformed values, a non-ok body, and a failed fetch all read ON", () => {
    expect(normalizeHousewarmingResponse(200, { ok: true, config: { housewarming: "no" } })).toBe(true);
    expect(normalizeHousewarmingResponse(200, { ok: true, config: { housewarming: 0 } })).toBe(true);
    expect(normalizeHousewarmingResponse(200, { ok: false })).toBe(true);
    expect(normalizeHousewarmingResponse(500, null)).toBe(true);
    expect(normalizeHousewarmingResponse(200, null)).toBe(true);
  });
});
