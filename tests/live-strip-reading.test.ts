import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { stripModel } from "@/components/LiveStrip";

/**
 * TASK-490 (block 969,088+, K126 queue item 1 — the Admiral, RULED at
 * block 968,624: "light it on open", YES pulse as the named exception,
 * show EVERYWHERE including /reading, "Join" for everyone) — the live
 * strip follows Love's reading buttons. `/api/live` reads the four
 * reading doors (Housewarming/Stage 1/Stage 2/Q&A) server-side beside
 * the old Go-live flag; any door `published` (her Open tap, never
 * `cameraShownAtMs`) lights the strip as `kind: "reading"` with the
 * part's number and SCOPE title, the Jitsi room name NEVER in the
 * payload, every door failing closed on a throw.
 *
 * The door libs and the live flag are module-mocked at module scope (the
 * `tests/stage-honours-the-full-scene.test.ts` idiom, so vitest's
 * vi.mock hoist never outruns the declaration); the route under test is
 * the real `src/app/api/live/route.ts`.
 */

type DoorShape = {
  phase: "closed" | "prepared" | "published";
  room: string | null;
  openedAtMs: number | null;
  publishedAtMs: number | null;
  cameraShownAtMs: number | null;
};

/** A mock door is either a stored shape or "throw" (a vault that fails
 *  LOUD — the route's own per-door catch is what must read it closed). */
type MockDoor = DoorShape | "throw";

const CLOSED: DoorShape = {
  phase: "closed",
  room: null,
  openedAtMs: null,
  publishedAtMs: null,
  cameraShownAtMs: null,
};

const published = (room: string, publishedAtMs: number, cameraShownAtMs: number | null = null): DoorShape => ({
  phase: "published",
  room,
  openedAtMs: publishedAtMs - 60_000,
  publishedAtMs,
  cameraShownAtMs,
});

const mockDoors: Record<"housewarming" | "stage1" | "stage2" | "qa", MockDoor> = {
  housewarming: CLOSED,
  stage1: CLOSED,
  stage2: CLOSED,
  qa: CLOSED,
};

function readDoor(id: keyof typeof mockDoors): DoorShape {
  const d = mockDoors[id];
  if (d === "throw") throw new Error(`the vault is down for ${id}`);
  return d;
}

vi.mock("@/lib/housewarming-door", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/housewarming-door")>();
  return { ...actual, getHousewarmingState: async () => readDoor("housewarming") };
});
vi.mock("@/lib/stage1", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/stage1")>();
  return { ...actual, getStage1State: async () => readDoor("stage1") };
});
vi.mock("@/lib/stage2", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/stage2")>();
  return { ...actual, getStage2State: async () => readDoor("stage2") };
});
vi.mock("@/lib/qa-door", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/qa-door")>();
  return { ...actual, getQaState: async () => readDoor("qa") };
});

/* the OLD Go-live flag rides beside the doors, mocked so the precedence
   pin (the reading case wins over the flag) never leans on the env */
let mockLiveFlag: { live: boolean; room: string | null; kind: string | null; startedAt: number | null; afterHours: null } = {
  live: false,
  room: null,
  kind: null,
  startedAt: null,
  afterHours: null,
};

vi.mock("@/lib/live", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/live")>();
  return { ...actual, getLiveState: async () => mockLiveFlag };
});

const PARTS = [
  { id: "housewarming", part: 1, title: "The Housewarming", room: "oc-0123456789abcdef" },
  { id: "stage1", part: 2, title: "The Reading", room: "oc-aaaabbbbccccdddd" },
  { id: "stage2", part: 3, title: "The Book Talk", room: "oc-1111222233334444" },
  { id: "qa", part: 4, title: "The Q&A", room: "oc-ffffeeeeddddcccc" },
] as const;

async function livePayload() {
  const { GET } = await import("@/app/api/live/route");
  const res = await GET();
  return res.json();
}

beforeEach(() => {
  mockDoors.housewarming = CLOSED;
  mockDoors.stage1 = CLOSED;
  mockDoors.stage2 = CLOSED;
  mockDoors.qa = CLOSED;
  mockLiveFlag = { live: false, room: null, kind: null, startedAt: null, afterHours: null };
});

describe("GET /api/live — one reading door published lights the strip (her Open tap)", () => {
  for (const { id, part, title, room } of PARTS) {
    it(`part ${part} (${id}) alone published → live, kind "reading", the SCOPE title, room null`, async () => {
      mockDoors[id] = published(room, 1_700_000_000_000 + part);
      const json = await livePayload();
      expect(json.ok).toBe(true);
      expect(json.live).toBe(true);
      expect(json.kind).toBe("reading");
      expect(json.part).toBe(part);
      expect(json.roomTitle).toBe(title);
      expect(json.room).toBeNull();
      expect(json.startedAt).toBe(1_700_000_000_000 + part);
    });
  }

  it("two doors open at once: the latest publishedAtMs wins", async () => {
    mockDoors.housewarming = published("oc-0123456789abcdef", 1_700_000_001_000);
    mockDoors.qa = published("oc-ffffeeeeddddcccc", 1_700_000_009_000);
    const json = await livePayload();
    expect(json.kind).toBe("reading");
    expect(json.part).toBe(4);
    expect(json.roomTitle).toBe("The Q&A");
    expect(json.startedAt).toBe(1_700_000_009_000);
  });

  it("the reading case WINS over the old Go-live flag when both are live (the fresher truth)", async () => {
    mockLiveFlag = { live: true, room: "heart-field", kind: "class", startedAt: 42, afterHours: null };
    mockDoors.stage2 = published("oc-1111222233334444", 1_700_000_005_000);
    const json = await livePayload();
    expect(json.live).toBe(true);
    expect(json.kind).toBe("reading");
    expect(json.part).toBe(3);
    expect(json.room).toBeNull();
  });

  it("the old flag's own shape is byte-unchanged when no door is published", async () => {
    mockLiveFlag = { live: true, room: "heart-field", kind: "class", startedAt: 42, afterHours: null };
    const json = await livePayload();
    expect(json.live).toBe(true);
    expect(json.kind).toBe("community");
    expect(json.room).toBe("heart-field");
    expect(json.roomTitle).toBe("The Heart Field");
    expect(json.startedAt).toBe(42);
    expect(json.part ?? null).toBeNull();
  });
});

describe("GET /api/live — fail closed per door, and on phase alone", () => {
  it("a door whose getter THROWS reads as that door closed; the other doors still light the strip", async () => {
    mockDoors.qa = "throw";
    mockDoors.stage2 = published("oc-1111222233334444", 1_700_000_005_000);
    const json = await livePayload();
    expect(json.live).toBe(true);
    expect(json.kind).toBe("reading");
    expect(json.part).toBe(3);
  });

  it("ALL FOUR throwing: no reading case, the old path unaffected (dark flag, dark strip)", async () => {
    mockDoors.housewarming = "throw";
    mockDoors.stage1 = "throw";
    mockDoors.stage2 = "throw";
    mockDoors.qa = "throw";
    const json = await livePayload();
    expect(json.ok).toBe(true);
    expect(json.live).toBe(false);
    expect(json.kind).toBeNull();
  });

  it("published with cameraShownAtMs null LIGHTS the strip (her Open tap alone is enough)", async () => {
    mockDoors.qa = published("oc-ffffeeeeddddcccc", 1_700_000_009_000, null);
    const json = await livePayload();
    expect(json.live).toBe(true);
    expect(json.kind).toBe("reading");
  });

  it("prepared with ANY camera value does NOT light it (the strip keys on phase, never on cameraShownAtMs)", async () => {
    mockDoors.qa = {
      phase: "prepared",
      room: "oc-ffffeeeeddddcccc",
      openedAtMs: 1_700_000_000_000,
      publishedAtMs: null,
      cameraShownAtMs: 1_700_000_006_000,
    };
    const json = await livePayload();
    expect(json.live).toBe(false);
    expect(json.kind).toBeNull();
  });
});

describe("GET /api/live — the security pin: the Jitsi room name NEVER enters the payload", () => {
  it("doors published carrying real-shaped minted rooms: the serialized JSON never matches /oc-[0-9a-f]{16}/", async () => {
    for (const { id, part, room } of PARTS) {
      mockDoors[id] = published(room, 1_700_000_000_000 + part);
    }
    const { GET } = await import("@/app/api/live/route");
    const res = await GET();
    const wire = JSON.stringify(await res.json());
    expect(wire).not.toMatch(/oc-[0-9a-f]{16}/);
  });
});

describe("stripModel — the reading case (href derived, label middots, Join for everyone)", () => {
  for (const { part, title } of PARTS) {
    it(`part ${part}: href /reading?part=${part}#stage, label "Love is live · ${title} · Join"`, () => {
      const model = stripModel({ live: true, room: null, roomTitle: title, kind: "reading", part });
      expect(model).not.toBeNull();
      expect(model!.href).toMatch(/^\/reading\?part=[1-4]#stage$/);
      expect(model!.href).toBe(`/reading?part=${part}#stage`);
      expect(model!.label).toBe(`Love is live · ${title} · Join`);
    });
  }

  it("the Join-for-everyone default: parts 3 and 4 (the paid rooms) say Join too — the page gates, never the strip", () => {
    for (const { part, title } of PARTS.filter((p) => p.part >= 3)) {
      const model = stripModel({ live: true, room: null, roomTitle: title, kind: "reading", part });
      expect(model!.label.endsWith("· Join")).toBe(true);
    }
  });

  it("the old Go-live case keeps its exact shape", () => {
    expect(stripModel({ live: true, room: "heart-field", roomTitle: "The Heart Field — Commons" })).toEqual({
      href: "/rooms/heart-field",
      label: "Love is live · The Heart Field — Commons · Join",
    });
    expect(stripModel({ live: false, room: null, roomTitle: null })).toBeNull();
    expect(stripModel(null)).toBeNull();
  });

  it("a reading feed with a nonsense part falls through to NOTHING, never a hand-written href", () => {
    expect(stripModel({ live: true, room: null, roomTitle: "The Q&A", kind: "reading", part: 9 })).toBeNull();
    expect(stripModel({ live: true, room: null, roomTitle: "The Q&A", kind: "reading", part: null })).toBeNull();
  });
});

describe("the strip on the page — everywhere but /a, the dot pulsing", () => {
  it("the ONLY pathname that hides the strip stays /a; / and /reading render it alike", () => {
    const src = readFileSync("src/components/LiveStrip.tsx", "utf8");
    expect(src).toContain('pathname === "/a"');
    expect(src).toContain('pathname.startsWith("/a/")');
    // the reading case never consults the pathname — the model answers
    // from the feed alone, so / and /reading light the same way
    for (const { part, title } of PARTS) {
      expect(stripModel({ live: true, room: null, roomTitle: title, kind: "reading", part })).not.toBeNull();
    }
  });

  it("the dot wears the pulse class (the named exception) and keeps its house tokens", () => {
    const src = readFileSync("src/components/LiveStrip.tsx", "utf8");
    expect(src).toContain('className="live-strip-dot"');
  });

  it("the pulse lives in an existing sheet with its reduced-motion still (the house source-grep idiom)", () => {
    const css = readFileSync("src/app/kit.css", "utf8");
    expect(css).toContain(".live-strip-dot{");
    expect(css).toMatch(/@keyframes live-strip-pulse/);
    expect(css).toMatch(/@media \(prefers-reduced-motion:reduce\)\{\.live-strip-dot\{animation:none\}\}/);
  });
});
